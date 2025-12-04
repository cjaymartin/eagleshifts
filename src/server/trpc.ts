import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { prisma } from '@/lib/prisma';

export const createTRPCContext = async () => {
    console.log('[TRPC Context] === START ===');
    const { user: workosUser, organizationId: workosOrgId } = await withAuth();

    console.log('[TRPC Context] WorkOS User:', {
        id: workosUser?.id,
        email: workosUser?.email,
        firstName: workosUser?.firstName,
    });
    console.log('[TRPC Context] WorkOS Organization ID from session:', workosOrgId);

    if (!workosUser || !workosOrgId) {
        console.log('[TRPC Context] ⚠️ Missing user or org ID - returning undefined context');
        console.log('[TRPC Context] Has workosUser:', !!workosUser);
        console.log('[TRPC Context] Has workosOrgId:', !!workosOrgId);
        return {
            user: undefined,
            session: undefined,
            prisma,
        };
    }

    // Find Prisma User by email
    console.log('[TRPC Context] Looking up user in DB by email:', workosUser.email);
    const user = await prisma.user.findUnique({
        where: { email: workosUser.email },
    });

    if (!user) {
        console.error('[TRPC Context] ⚠️ User not found in DB:', workosUser.email);
        console.error('[TRPC Context] This user exists in WorkOS but not in local database!');
        return {
            user: undefined,
            session: undefined,
            prisma,
        };
    }
    console.log('[TRPC Context] Found user in DB:', {
        id: user.id,
        email: user.email,
        name: user.name,
    });

    // Find Organization by WorkOS Organization ID from session
    // We check both 'id' (for new/migrated orgs) and 'workosOrganizationId' (for legacy orgs)
    console.log('[TRPC Context] Looking up organization by ID:', workosOrgId);
    const organization = await prisma.organization.findFirst({
        where: {
            OR: [
                { id: workosOrgId },
                { workosOrganizationId: workosOrgId }
            ]
        }
    });

    if (!organization) {
        console.error('[TRPC Context] ⚠️ Organization NOT found!');
        console.error('[TRPC Context] WorkOS org ID from session:', workosOrgId);
        
        // Debug: List all organizations to help troubleshoot
        const allOrgs = await prisma.organization.findMany({
            select: { id: true, name: true }
        });
        console.error('[TRPC Context] Available organizations in DB:', allOrgs);
        
        return {
            user: undefined,
            session: undefined,
            prisma,
        };
    }
    console.log('[TRPC Context] Found organization:', {
        id: organization.id,
        name: organization.name,
    });

    console.log('[TRPC Context] Looking up member:', {
        userId: user.id,
        organizationId: organization.id,
    });
    const member = await prisma.member.findFirst({
        where: {
            userId: user.id,
            organizationId: organization.id, // Use the local ID here
        },
    });

    if (!member) {
        console.error('[TRPC Context] ⚠️ Member not found!');
        console.error('[TRPC Context] User', user.email, 'is not a member of org', organization.name);
        
        // Debug: List user's memberships
        const userMembers = await prisma.member.findMany({
            where: { userId: user.id },
            include: { organization: { select: { id: true, name: true } } }
        });
        console.error('[TRPC Context] User memberships:', userMembers.map(m => ({
            orgId: m.organizationId,
            orgName: m.organization.name,
            role: m.role,
        })));
        
        return {
            user: undefined,
            session: undefined,
            prisma,
        };
    }
    console.log('[TRPC Context] Found member:', {
        id: member.id,
        role: member.role,
        name: member.name,
    });

    console.log('[TRPC Context] ✅ Successfully created context for:', {
        user: user.email,
        organization: organization.name,
        role: member.role,
    });
    console.log('[TRPC Context] === END ===');
    
    return {
        user: {
            ...user,
            // Prioritize member name and image if available
            name: member.name || user.name,
            image: member.image || user.image,
            role: member.role,
            organizationId: organization.id, // Return local ID for app compatibility
            memberId: member.id, // Add memberId to the context
        },
        session: {
            activeOrganizationId: organization.id, // Return local ID for app compatibility
        },
        prisma,
    };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
    transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Helper for role-based middleware
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({ ctx });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// Role middleware - enforces minimum role level
const roles = ['guest', 'member', 'admin', 'owner', 'god'];

export const createRoleMiddleware = (minimumRole: string) => {
    return t.middleware(({ ctx, next }) => {
        if (!ctx.user || !ctx.user.role) {
            throw new TRPCError({ code: 'UNAUTHORIZED' });
        }

        const userRoleIndex = roles.indexOf(ctx.user.role);
        const requiredRoleIndex = roles.indexOf(minimumRole);

        if (userRoleIndex < requiredRoleIndex) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'You do not have the required permissions',
            });
        }

        return next({ ctx });
    });
};

// Middleware to check if the user is accessing their own data
export const enforceUserIsAccessingOwnData = t.middleware(({ ctx, next, meta }) => {
    if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    // Add a helper function to check if a user is accessing their own data
    return next({
        ctx: {
            ...ctx,
            isUserData: (userId: string) => userId === ctx.user.id,
            isMemberData: (memberId: string) => memberId === ctx.user.memberId,
        },
    });
});

// Procedures with role requirements
export const memberProcedure = protectedProcedure.use(
    createRoleMiddleware('member')
);
export const adminProcedure = protectedProcedure.use(
    createRoleMiddleware('admin')
);
export const ownerProcedure = protectedProcedure.use(
    createRoleMiddleware('owner')
);

// Procedure for users accessing their own data
export const userProcedure = protectedProcedure.use(enforceUserIsAccessingOwnData);

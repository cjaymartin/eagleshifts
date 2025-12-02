import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { prisma } from '@/lib/prisma';
import { headers, cookies } from 'next/headers';

export const createTRPCContext = async () => {
    const { user: workosUser } = await withAuth();
    const cookieStore = await cookies();
    const activeOrgId = cookieStore.get('wos-active-org-id')?.value;

    console.log('[TRPC Context] WorkOS User:', workosUser?.email);
    console.log('[TRPC Context] Active Org ID:', activeOrgId);

    if (!workosUser || !activeOrgId) {
        console.log('[TRPC Context] Missing user or org ID');
        return {
            user: undefined,
            session: undefined,
            prisma,
        };
    }

    // Find Prisma User by email
    const user = await prisma.user.findUnique({
        where: { email: workosUser.email },
    });

    if (!user) {
        console.log('[TRPC Context] User not found in DB:', workosUser.email);
        return {
            user: undefined,
            session: undefined,
            prisma,
        };
    }

    // Find Organization by WorkOS ID (activeOrgId)
    // If activeOrgId looks like a WorkOS ID (starts with org_), use workosOrganizationId
    // Otherwise assume it's a local ID (fallback)
    const organization = await prisma.organization.findFirst({
        where: {
            OR: [
                { workosOrganizationId: activeOrgId },
                { id: activeOrgId }
            ]
        }
    });

    if (!organization) {
        console.log('[TRPC Context] Organization not found:', activeOrgId);
        return {
            user: undefined,
            session: undefined,
            prisma,
        };
    }

    const member = await prisma.member.findFirst({
        where: {
            userId: user.id,
            organizationId: organization.id, // Use the local ID here
        },
    });

    if (!member) {
        console.log('[TRPC Context] Member not found for org:', organization.id);
        return {
            user: undefined,
            session: undefined,
            prisma,
        };
    }

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

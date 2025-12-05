import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { prisma } from '@/lib/prisma';
import workos from '@/lib/workos';

export const createTRPCContext = async () => {
    const { user: workosUser, organizationId: workosOrgId } = await withAuth();

    if (!workosUser || !workosOrgId) {
        return {
            user: undefined,
            session: undefined,
            prisma,
        };
    }

    // ========== WORKOS-FIRST: Get role from WorkOS membership ==========
    let workosRole = 'member'; // Default to member
    try {
        const memberships = await workos.userManagement.listOrganizationMemberships({
            userId: workosUser.id,
            organizationId: workosOrgId,
        });
        
        if (memberships.data.length > 0 && memberships.data[0].role?.slug) {
            workosRole = memberships.data[0].role.slug;
        }
    } catch (err: any) {
        console.error('[TRPC Context] Error fetching WorkOS membership:', err.message);
    }

    // ========== OPTIONAL: Try to find local DB records ==========
    // These are optional - we'll use WorkOS data if local records don't exist
    
    const localUser = await prisma.user.findUnique({
        where: { email: workosUser.email },
    });

    const localOrg = await prisma.organization.findFirst({
        where: {
            OR: [
                { id: workosOrgId },
                { workosOrganizationId: workosOrgId }
            ]
        }
    });

    let localMember: any = null;
    if (localUser && localOrg) {
        localMember = await prisma.member.findFirst({
            where: {
                userId: localUser.id,
                organizationId: localOrg.id,
            },
        });
    }

    // ========== BUILD CONTEXT USER ==========
    // Use WorkOS data as base, enhance with local data if available
    const contextUser = {
        // Core identity from WorkOS
        id: localUser?.id || workosUser.id,
        email: workosUser.email,
        name: localMember?.name || localUser?.name || workosUser.firstName + ' ' + (workosUser.lastName || ''),
        image: localMember?.image || localUser?.image || workosUser.profilePictureUrl,
        
        // Role from WorkOS (source of truth)
        role: workosRole,
        
        // Organization from local DB or WorkOS
        organizationId: localOrg?.id || workosOrgId,
        
        // Member ID (optional, only if local member exists)
        memberId: localMember?.id || undefined,
        
        // WorkOS IDs for reference
        workosUserId: workosUser.id,
        workosOrgId: workosOrgId,
    };
    
    return {
        user: contextUser,
        session: {
            activeOrganizationId: localOrg?.id || workosOrgId,
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

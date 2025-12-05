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
    
    // ========== AUTO-MERGE: Link non-account members when email matches ==========
    // If user has no local member, check if there's an unactivated member with matching email
    // This handles the case where someone was added as a "non-account member" and later signed up
    if (!localMember && localOrg && workosUser.email) {
        const unactivatedMemberWithEmail = await prisma.member.findFirst({
            where: {
                organizationId: localOrg.id,
                isActivated: false,
                user: {
                    email: workosUser.email.toLowerCase(),
                },
            },
            include: {
                user: true,
            },
        });
        
        if (unactivatedMemberWithEmail) {
            // Found a non-account member with matching email - merge it!
            console.log('[TRPC Context] Auto-merging non-account member:', {
                memberId: unactivatedMemberWithEmail.id,
                email: workosUser.email,
            });
            
            try {
                // If we have a localUser, link the member to them
                // Otherwise, update the placeholder user with WorkOS data
                if (localUser) {
                    // Update member to point to the real user
                    await prisma.member.update({
                        where: { id: unactivatedMemberWithEmail.id },
                        data: {
                            userId: localUser.id,
                            isActivated: true,
                            name: workosUser.firstName + ' ' + (workosUser.lastName || ''),
                        },
                    });
                    
                    // Clean up the placeholder user (if different from localUser)
                    if (unactivatedMemberWithEmail.userId !== localUser.id) {
                        await prisma.user.delete({
                            where: { id: unactivatedMemberWithEmail.userId },
                        }).catch(() => {}); // Ignore if it fails (may have other refs)
                    }
                    
                    localMember = await prisma.member.findUnique({
                        where: { id: unactivatedMemberWithEmail.id },
                    });
                } else {
                    // Update the placeholder user and activate member
                    await prisma.user.update({
                        where: { id: unactivatedMemberWithEmail.userId },
                        data: {
                            name: workosUser.firstName + ' ' + (workosUser.lastName || ''),
                            banned: false,
                            banReason: null,
                        },
                    });
                    
                    await prisma.member.update({
                        where: { id: unactivatedMemberWithEmail.id },
                        data: {
                            isActivated: true,
                            name: workosUser.firstName + ' ' + (workosUser.lastName || ''),
                        },
                    });
                    
                    localMember = await prisma.member.findUnique({
                        where: { id: unactivatedMemberWithEmail.id },
                    });
                }
                
                console.log('[TRPC Context] Auto-merge complete:', { memberId: localMember?.id });
            } catch (err: any) {
                console.error('[TRPC Context] Auto-merge failed:', err.message);
            }
        }
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

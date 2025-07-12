import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export const createTRPCContext = async () => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id || !session?.session?.activeOrganizationId) {
        return {
            user: undefined,
            session: undefined,
            prisma,
        };
    }

    const member = await prisma.member.findFirst({
        where: {
            userId: session.user.id,
            organizationId: session.session.activeOrganizationId,
        },
    });

    if (!member) {
        return {
            user: undefined,
            session: undefined,
            prisma,
        };
    }

    return {
        user: {
            ...session.user,
            // Prioritize member name and image if available
            name: member.name || session.user.name,
            image: member.image || session.user.image,
            role: member.role,
            organizationId: session.session.activeOrganizationId,
            memberId: member.id, // Add memberId to the context
        },
        session: session.session,
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

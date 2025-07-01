import { router, adminProcedure, memberProcedure } from '@/server/trpc';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@/lib/auth';

export const usersRouter = router({
    list: adminProcedure.query(async ({ ctx }) => {
        console.log({ ctxuser: ctx.user });

        // Get all users who are members of the current organization
        const users = await ctx.prisma.user.findMany({
            where: {
                members: {
                    some: {
                        organizationId: ctx.user.organizationId,
                    },
                },
            },
            include: {
                members: {
                    where: {
                        organizationId: ctx.user.organizationId,
                    },
                },
            },
        });

        console.dir({ users });

        // Map users to include their role and organizationId
        const mappedUsers = users.map((user) => ({
            ...user,
            role: user.members[0]?.role,
            organizationId: user.members[0]?.organizationId,
        }));

        return mappedUsers;
    }),

    updateDefaultAvailability: adminProcedure
        .input(
            z.object({
                memberId: z.string(),
                isAvailableByDefault: z.boolean(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { memberId, isAvailableByDefault } = input;

            // Update the member's isAvailableByDefault field
            const updatedMember = await ctx.prisma.member.update({
                where: { id: memberId },
                data: { isAvailableByDefault },
            });

            return updatedMember;
        }),

    getMemberById: adminProcedure
        .input(
            z.object({
                memberId: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { memberId } = input;

            const member = await ctx.prisma.member.findUnique({
                where: { id: memberId },
                include: {
                    user: true,
                },
            });

            if (!member) {
                throw new Error('Member not found');
            }

            return member;
        }),

    // Update a member's role
    updateMember: adminProcedure
        .input(
            z.object({
                memberId: z.string(),
                role: z
                    .enum(['suspended', 'member', 'admin', 'owner'])
                    .optional(),
                displayName: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { memberId, role, displayName } = input;

            // Get the current member to check permissions
            const currentMember = await ctx.prisma.member.findUnique({
                where: { id: memberId },
                include: { user: true },
            });

            if (!currentMember) {
                throw new Error('Member not found');
            }

            // Only owners can change owner role
            if (
                currentMember.role === 'owner' &&
                role &&
                role !== 'owner' &&
                ctx.user.role !== 'owner'
            ) {
                throw new Error('Only owners can change the role of an owner');
            }

            // Update the member
            const updatedMember = await ctx.prisma.member.update({
                where: { id: memberId },
                data: {
                    ...(role && { role }),
                },
            });

            // If displayName is provided, update the user
            if (displayName) {
                await ctx.prisma.user.update({
                    where: { id: currentMember.userId },
                    data: { name: displayName },
                });
            }

            return updatedMember;
        }),

    // Delete a member
    delete: adminProcedure
        .input(
            z.object({
                userId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId } = input;

            // Get the member to check permissions
            const member = await ctx.prisma.member.findFirst({
                where: {
                    userId,
                    organizationId: ctx.user.organizationId,
                },
            });

            if (!member) {
                throw new Error('Member not found');
            }

            // Prevent deleting owners unless you're an owner
            if (member.role === 'owner' && ctx.user.role !== 'owner') {
                throw new Error('Only owners can delete owners');
            }

            // Delete the member
            await ctx.prisma.member.delete({
                where: { id: member.id },
            });

            return { success: true, message: 'Member deleted successfully' };
        }),

    // Imitate a user (for admins/owners only)
    imitate: adminProcedure
        .input(
            z.object({
                userId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { userId } = input;

            // Get the member to check permissions
            const member = await ctx.prisma.member.findFirst({
                where: {
                    userId,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    user: true,
                },
            });

            if (!member) {
                throw new Error('Member not found');
            }

            // Create a new session for the imitated user
            const session = await ctx.prisma.session.create({
                data: {
                    id: uuidv4(),
                    token: uuidv4(),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    userId: member.userId,
                    impersonatedBy: ctx.user.id, // Mark as impersonated
                    activeOrganizationId: ctx.user.organizationId,
                    ipAddress:
                        (ctx.req?.headers['x-forwarded-for'] as string) ||
                        'unknown',
                    userAgent:
                        (ctx.req?.headers['user-agent'] as string) || 'unknown',
                },
            });

            return {
                success: true,
                message: `Imitating user ${member.user.name || member.user.email}`,
                session: {
                    id: session.id,
                    token: session.token,
                },
            };
        }),
});

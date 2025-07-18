import {
    router,
    adminProcedure,
    memberProcedure,
    userProcedure,
} from '@/server/trpc';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { auth, signCookie } from '@/lib/auth';
import { cookies } from 'next/headers';
import { TRPCError } from '@trpc/server';

export const usersRouter = router({
    // Get user by ID - all authenticated users can read user data
    getUser: memberProcedure
        .input(
            z.object({
                userId: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.findUnique({
                where: { id: input.userId },
                include: {
                    members: {
                        where: {
                            organizationId: ctx.user.organizationId,
                        },
                    },
                },
            });

            if (!user) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User not found',
                });
            }

            // Map user to include their role and organizationId
            // Prioritize member data (name, image) over user data
            const member = user.members[0];
            if (!member) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User is not a member of this organization',
                });
            }

            return {
                ...user,
                ...member,
                // Prioritize member name and image if available
                name: member.name || user.name,
                image: member.image || user.image,
                member: undefined,
                userId: user.id,
                id: member.id,
            };
        }),

    // Update user profile - users can only update their own profile
    updateProfile: userProcedure
        .input(
            z.object({
                userId: z.string(),
                displayName: z.string().optional(),
                isAvailableByDefault: z.boolean().optional(),
                // Add other fields that users are allowed to update
                // based on the firestore rules
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if the user is updating their own profile
            if (
                !ctx.isUserData(input.userId) &&
                ctx.user.role !== 'admin' &&
                ctx.user.role !== 'owner'
            ) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You can only update your own profile',
                });
            }

            // Find the member record for the user in the current organization
            const member = await ctx.prisma.member.findFirst({
                where: {
                    userId: input.userId,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    user: true,
                },
            });

            if (!member) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Member not found',
                });
            }

            // Update the member record
            const updatedMember = await ctx.prisma.member.update({
                where: { id: member.id },
                data: {
                    ...(input.displayName && { name: input.displayName }),
                    ...(input.isAvailableByDefault !== undefined && {
                        isAvailableByDefault: input.isAvailableByDefault,
                    }),
                },
                include: {
                    user: true,
                },
            });

            // Return blended data
            return {
                ...updatedMember.user,
                ...updatedMember,
                // Prioritize member name and image if available
                name: updatedMember.name || updatedMember.user.name,
                image: updatedMember.image || updatedMember.user.image,
                user: undefined,
            };
        }),

    list: adminProcedure.query(async ({ ctx }) => {
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
        // Prioritize member data (name, image) over user data
        const mappedUsers = users.map((user) => {
            const member = user.members[0];
            return {
                ...user,
                ...member,
                // Prioritize member name and image if available
                name: member.name || user.name,
                image: member.image || user.image,
                member: undefined,
                userId: user.id,
                id: member.id,
            };
        });

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
                include: {
                    user: true,
                },
            });

            // Return blended data similar to list procedure
            const blendedData = {
                ...updatedMember.user,
                ...updatedMember,
                // Prioritize member name and image if available
                name: updatedMember.name || updatedMember.user.name,
                image: updatedMember.image || updatedMember.user.image,
                user: undefined,
            };

            return blendedData;
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

            // Return blended data similar to list procedure
            const blendedData = {
                ...member.user,
                ...member,
                // Prioritize member name and image if available
                name: member.name || member.user.name,
                image: member.image || member.user.image,
                user: undefined,
            };

            return blendedData;
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
                include: {
                    user: true,
                },
            });

            // If displayName is provided, update the member's name field
            if (displayName) {
                await ctx.prisma.member.update({
                    where: { id: memberId },
                    data: { name: displayName },
                });

                // Update the member name in our result
                updatedMember.name = displayName;
            }

            // Return blended data similar to list procedure
            const blendedData = {
                ...updatedMember.user,
                ...updatedMember,
                // Prioritize member name and image if available
                name: updatedMember.name || updatedMember.user.name,
                image: updatedMember.image || updatedMember.user.image,
                user: undefined,
            };

            return blendedData;
        }),

    // Delete a member
    delete: adminProcedure
        .input(
            z.object({
                memberId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { memberId } = input;

            // Get the member to check permissions
            const member = await ctx.prisma.member.findFirst({
                where: {
                    id: memberId,
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

    deleteInvitation: adminProcedure
        .input(
            z.object({
                invitationId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { invitationId } = input;

            // Find the invitation to check permissions
            const invitation = await ctx.prisma.invitation.findUnique({
                where: { id: invitationId },
            });

            if (!invitation) {
                throw new Error('Invitation not found');
            }

            // Delete the invitation
            await ctx.prisma.invitation.delete({
                where: { id: invitationId },
            });

            return {
                success: true,
                message: 'Invitation deleted successfully',
            };
        }),

    // Imitate a user (for admins/owners only)
    imitate: adminProcedure
        .input(
            z.object({
                memberId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { memberId } = input;

            // Get the member to check permissions
            const member = await ctx.prisma.member.findFirst({
                where: {
                    id: memberId,
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
                        ((ctx as any).req?.headers[
                            'x-forwarded-for'
                        ] as string) || 'unknown',
                    userAgent:
                        ((ctx as any).req?.headers['user-agent'] as string) ||
                        'unknown',
                },
            });

            console.log({ session });

            const cookievalue = await signCookie(
                session.token,
                process.env.BETTER_AUTH_SECRET!
            );

            const cookieData = await cookies();

            return {
                success: true,
                message: `Imitating user ${member.name || member.user.name || member.user.email}`,
                session: {
                    id: session.id,
                    token: session.token,
                },
                cookie: cookievalue,
            };
        }),
});

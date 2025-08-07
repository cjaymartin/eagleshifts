import {
    router,
    adminProcedure,
    memberProcedure,
    userProcedure,
    publicProcedure,
} from '@/server/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { v4 as uuidv4 } from 'uuid';
import { logTeamInviteSend, logTeamInviteAccept } from '@/lib/logging';
import { sendInvitationEmail } from '@/lib/email';

export const invitationsRouter = router({
    // Create an invitation and an inactive member
    createInvitation: adminProcedure
        .input(
            z.object({
                email: z.string().optional(),
                role: z.enum(['member', 'admin', 'owner']).default('member'),
                name: z.string().optional(),
                sendInvitation: z.boolean().optional().default(true),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { email: inputEmail, role, name, sendInvitation } = input;

            // Validate that email is provided if sendInvitation is true
            if (sendInvitation && (!inputEmail || inputEmail.trim() === '')) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Email is required when sending an invitation',
                });
            }

            // Generate a placeholder email if none is provided
            const email = inputEmail && inputEmail.trim() !== '' 
                ? inputEmail.trim() 
                : `no-email-${uuidv4()}@placeholder.local`;

            // Flag to track if this is a no-email user
            const isNoEmailUser = !inputEmail || inputEmail.trim() === '';

            // Check if the user already exists (only for real emails)
            let user = isNoEmailUser ? null : await ctx.prisma.user.findUnique({
                where: { email },
            });

            // Check if there's already an invitation for this email in this organization
            const existingInvitation = await ctx.prisma.invitation.findFirst({
                where: {
                    email,
                    organizationId: ctx.user.organizationId,
                },
            });

            // Check if the user is already a member of the organization
            let existingMember = null;
            if (user) {
                existingMember = await ctx.prisma.member.findFirst({
                    where: {
                        userId: user.id,
                        organizationId: ctx.user.organizationId,
                    },
                });
            }

            // If the member exists and is already activated, return an error
            if (existingMember && existingMember.isActivated) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'User is already a member of this organization',
                });
            }

            // If there's an existing invitation, delete it (we'll create a new one)
            if (existingInvitation) {
                await ctx.prisma.invitation.delete({
                    where: { id: existingInvitation.id },
                });
            }

            // If there's an existing inactive member, we'll use that
            // Otherwise, we'll create a new inactive member if the user exists
            let memberId = existingMember?.id;

            // Create a new invitation
            const invitationId = uuidv4();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

            // Set the status based on whether we're sending an invitation
            const status = sendInvitation ? 'pending' : 'no_account';

            const invitation = await ctx.prisma.invitation.create({
                data: {
                    id: invitationId,
                    email,
                    role,
                    status,
                    expiresAt,
                    organization: {
                        connect: { id: ctx.user.organizationId },
                    },
                    user: {
                        connect: { id: ctx.user.id }, // The inviter
                    },
                },
            });

            // If the user doesn't exist, create one
            if (!user) {
                // For no-email users, create a banned user with a placeholder email
                user = await ctx.prisma.user.create({
                    data: {
                        id: uuidv4(),
                        email: email,
                        name: name || (isNoEmailUser ? 'No Email User' : email.split('@')[0]), // Use provided name or default
                        emailVerified: true,
                        banned: isNoEmailUser, // Ban users with no email
                        banReason: isNoEmailUser ? 'No email provided' : undefined,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
            }

            // Now that we have a user (either existing or newly created),
            // create or update the member record
            if (existingMember) {
                // Update the existing member if needed (e.g., role change)
                await ctx.prisma.member.update({
                    where: { id: existingMember.id },
                    data: {
                        role,
                        name: name || existingMember.name,
                    },
                });
                memberId = existingMember.id;
            } else {
                // Create a new inactive member
                const newMember = await ctx.prisma.member.create({
                    data: {
                        id: uuidv4(),
                        userId: user.id,
                        organizationId: ctx.user.organizationId,
                        role,
                        name: name || email.split('@')[0],
                        createdAt: new Date(),
                        isActivated: false,
                    },
                });
                memberId = newMember.id;
            }

            // Get the organization for the email
            const organization = await ctx.prisma.organization.findUnique({
                where: { id: ctx.user.organizationId },
            });

            if (!organization) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Organization not found',
                });
            }

            // Get the inviter's information
            const inviter = await ctx.prisma.member.findFirst({
                where: {
                    userId: ctx.user.id,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    user: true,
                },
            });

            if (!inviter) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Inviter not found',
                });
            }

            // Only send the invitation email if sendInvitation is true
            if (sendInvitation) {
                await sendInvitationEmail({
                    id: invitation.id,
                    email,
                    inviter: {
                        user: {
                            name: inviter.name || inviter.user.name,
                            email: inviter.user.email,
                        },
                    },
                    organization: {
                        name: organization.name,
                    },
                });
            }

            // Log the invitation creation
            await logTeamInviteSend(
                ctx.prisma,
                ctx.user.organizationId,
                ctx.user.id,
                invitation.id,
                email,
                role,
                {
                    action: 'create',
                    status,
                    sentEmail: sendInvitation,
                }
            );

            return {
                success: true,
                invitation,
                memberId,
            };
        }),

    // Accept an invitation and activate the member
    acceptInvitation: publicProcedure
        .input(
            z.object({
                invitationId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { invitationId } = input;

            // Find the invitation
            const invitation = await ctx.prisma.invitation.findUnique({
                where: { id: invitationId },
                include: {
                    organization: true,
                },
            });

            if (!invitation) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Invitation not found',
                });
            }

            // Check if invitation is expired
            if (invitation.expiresAt < new Date()) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Invitation has expired',
                });
            }

            // Find or create the user
            let user = await ctx.prisma.user.findUnique({
                where: { email: invitation.email },
            });

            if (!user) {
                // Create a new user
                user = await ctx.prisma.user.create({
                    data: {
                        id: uuidv4(),
                        email: invitation.email,
                        name: invitation.email.split('@')[0],
                        emailVerified: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
            }

            // Find or create the member
            let member = await ctx.prisma.member.findFirst({
                where: {
                    userId: user.id,
                    organizationId: invitation.organizationId,
                },
            });

            if (!member) {
                // Create a new member
                member = await ctx.prisma.member.create({
                    data: {
                        id: uuidv4(),
                        userId: user.id,
                        organizationId: invitation.organizationId,
                        role: invitation.role || 'member',
                        name: invitation.email.split('@')[0],
                        createdAt: new Date(),
                        isActivated: true, // Activate the member
                    },
                });
            } else {
                // Activate the existing member
                member = await ctx.prisma.member.update({
                    where: { id: member.id },
                    data: {
                        isActivated: true,
                    },
                });
            }

            // Create a session for the user
            const session = await ctx.prisma.session.create({
                data: {
                    id: uuidv4(),
                    token: uuidv4(),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    userId: user.id,
                    activeOrganizationId: invitation.organizationId,
                    ipAddress: 'unknown',
                    userAgent: 'unknown',
                },
            });

            // Log the invitation acceptance
            await logTeamInviteAccept(
                ctx.prisma,
                invitation.organizationId,
                user.id,
                invitationId,
                invitation.email,
                invitation.role || 'member',
                {
                    organizationName: invitation.organization.name,
                    organizationId: invitation.organizationId,
                }
            );

            // Delete all invitations for this user in this organization
            await ctx.prisma.invitation.deleteMany({
                where: {
                    email: invitation.email,
                    organizationId: invitation.organizationId,
                },
            });

            return {
                success: true,
                user,
                member,
                organization: invitation.organization,
                session,
            };
        }),

    // Delete an invitation and its associated inactive member
    deleteInvitation: adminProcedure
        .input(
            z.object({
                invitationId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { invitationId } = input;

            // Find the invitation
            const invitation = await ctx.prisma.invitation.findUnique({
                where: { id: invitationId },
            });

            if (!invitation) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Invitation not found',
                });
            }

            // Find the user associated with the invitation
            const user = await ctx.prisma.user.findUnique({
                where: { email: invitation.email },
            });

            // If the user exists, find and delete the inactive member
            if (user) {
                const member = await ctx.prisma.member.findFirst({
                    where: {
                        userId: user.id,
                        organizationId: invitation.organizationId,
                        isActivated: false, // Only delete if not activated
                    },
                });

                if (member) {
                    await ctx.prisma.member.delete({
                        where: { id: member.id },
                    });
                }
            }

            // Delete all invitations for this user in this organization
            await ctx.prisma.invitation.deleteMany({
                where: {
                    email: invitation.email,
                    organizationId: invitation.organizationId,
                },
            });

            // Log the invitation deletion
            await logTeamInviteSend(
                ctx.prisma,
                ctx.user.organizationId,
                ctx.user.id,
                invitationId,
                invitation.email,
                invitation.role || 'member',
                {
                    action: 'delete',
                    status: invitation.status,
                }
            );

            return {
                success: true,
                message: 'Invitation and inactive member deleted successfully',
            };
        }),

    // List all invitations for the organization
    listInvitations: adminProcedure.query(async ({ ctx }) => {
        const invitations = await ctx.prisma.invitation.findMany({
            where: {
                organizationId: ctx.user.organizationId,
            },
            include: {
                organization: true,
                user: true, // The inviter
            },
        });

        return invitations;
    }),
});

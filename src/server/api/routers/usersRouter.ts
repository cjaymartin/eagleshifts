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
import {
    logUserStatusChange,
    logTeamInviteSend,
    logTeamInviteAccept,
} from '@/lib/logging';
import workos from '@/lib/workos';

// =============================================================================
// HELPER: Sync WorkOS members to local Prisma database
// =============================================================================

type SyncContext = {
    prisma: any;
    user: { organizationId: string; workosOrgId?: string };
};

type LocalMemberWithUser = {
    id: string;
    userId: string;
    organizationId: string;
    role: string;
    name: string | null;
    image: string | null;
    isActivated: boolean;
    isAvailableByDefault: boolean;
    user: { id: string; email: string; name: string | null; image: string | null };
};

/**
 * Syncs WorkOS organization members to local Prisma database.
 * - Fetches users and pending invitations from WorkOS
 * - Auto-creates local User and Member records for any missing
 * - Returns the synced local members lookup by email
 */
async function syncWorkOSMembersToLocal(
    ctx: SyncContext,
    workosOrgId: string
): Promise<{
    localMembersByEmail: Record<string, LocalMemberWithUser>;
    localMembers: LocalMemberWithUser[];
    invitedEmails: Set<string>;
}> {
    // Get local members for app-specific data (availability, iCal, etc)
    const localMembers = await ctx.prisma.member.findMany({
        where: { organizationId: ctx.user.organizationId },
        include: { user: true },
    });

    // Create lookup by email for local members
    const localMembersByEmail: Record<string, LocalMemberWithUser> = {};
    for (const member of localMembers) {
        if (member.user.email) {
            localMembersByEmail[member.user.email.toLowerCase()] = member;
        }
    }

    // Fetch users from WorkOS
    const workosUsersResponse = await workos.userManagement.listUsers({
        organizationId: workosOrgId,
    });
    const workosUsers = workosUsersResponse.data;

    // Auto-create local members for WorkOS users if they don't exist
    await Promise.all(workosUsers.map(async (wUser) => {
        const email = wUser.email?.toLowerCase();
        if (email && !localMembersByEmail[email]) {
            try {
                console.log('[syncWorkOSMembersToLocal] Auto-creating local member for WorkOS user:', email);
                
                let dbUser = await ctx.prisma.user.findUnique({ where: { email } });
                if (!dbUser) {
                    dbUser = await ctx.prisma.user.create({
                        data: {
                            id: uuidv4(),
                            email,
                            name: (wUser.firstName || '') + (wUser.lastName ? ' ' + wUser.lastName : ''),
                            emailVerified: true,
                            banned: false,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            image: wUser.profilePictureUrl,
                        },
                    });
                }

                const newMember = await ctx.prisma.member.create({
                    data: {
                        id: uuidv4(),
                        userId: dbUser.id,
                        organizationId: ctx.user.organizationId,
                        role: 'member',
                        name: dbUser.name,
                        isActivated: true,
                        isAvailableByDefault: true,
                        createdAt: new Date(),
                        image: wUser.profilePictureUrl,
                    },
                    include: { user: true },
                });

                localMembersByEmail[email] = newMember;
                localMembers.push(newMember);
            } catch (err) {
                console.error('[syncWorkOSMembersToLocal] Failed to auto-create member:', email, err);
            }
        }
    }));

    // Fetch pending invitations
    const invitationsResponse = await workos.userManagement.listInvitations({
        organizationId: workosOrgId,
    });
    const pendingInvitations = invitationsResponse.data.filter(inv => inv.state === 'pending');
    const invitedEmails = new Set(pendingInvitations.map(inv => inv.email.toLowerCase()));

    // Auto-create local members for pending invitations
    await Promise.all(pendingInvitations.map(async (inv) => {
        const email = inv.email.toLowerCase();
        if (!localMembersByEmail[email]) {
            try {
                let user = await ctx.prisma.user.findUnique({ where: { email } });
                if (!user) {
                    user = await ctx.prisma.user.create({
                        data: {
                            id: uuidv4(),
                            email,
                            name: email.split('@')[0],
                            emailVerified: false,
                            banned: false,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                    });
                }

                const newMember = await ctx.prisma.member.create({
                    data: {
                        id: uuidv4(),
                        userId: user.id,
                        organizationId: ctx.user.organizationId,
                        role: 'member',
                        name: user.name,
                        isActivated: false,
                        isAvailableByDefault: true,
                        createdAt: new Date(),
                    },
                    include: { user: true },
                });

                localMembers.push(newMember);
                localMembersByEmail[email] = newMember;
                console.log('[syncWorkOSMembersToLocal] Auto-created local member for invitation:', email);
            } catch (err) {
                console.error('[syncWorkOSMembersToLocal] Failed to auto-create member for invitation:', email, err);
            }
        }
    }));

    return { localMembersByEmail, localMembers, invitedEmails };
}

// =============================================================================
// ROUTER
// =============================================================================

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

    // DEPRECATED: Use listWorkOSMembers instead
    // This procedure is kept for backwards compatibility but should not be used
    // list: adminProcedure.query(...),

    listWorkOSMembers: adminProcedure.query(async ({ ctx }) => {
        const workosOrgId = ctx.user.workosOrgId;
        
        if (!workosOrgId) {
            console.warn('[listWorkOSMembers] No WorkOS org ID, falling back to Prisma-only data');
            const users = await ctx.prisma.user.findMany({
                where: { members: { some: { organizationId: ctx.user.organizationId } } },
                include: { members: { where: { organizationId: ctx.user.organizationId } } },
            });
            
            return users.map((user: any) => {
                const member = user.members[0];
                return {
                    id: member.id,
                    workosUserId: null,
                    userId: user.id,
                    name: member.name || user.name,
                    email: user.email,
                    image: member.image || user.image,
                    role: member.role,
                    isActivated: member.isActivated,
                    isAvailableByDefault: member.isAvailableByDefault,
                    memberId: member.id,
                };
            });
        }

        // Use the sync helper to ensure local members exist for all WorkOS users
        const { localMembersByEmail, localMembers, invitedEmails } = await syncWorkOSMembersToLocal(ctx, workosOrgId);

        // Fetch WorkOS users again for the merge (sync helper already created local records)
        const workosUsersResponse = await workos.userManagement.listUsers({ organizationId: workosOrgId });
        const workosUsers = workosUsersResponse.data;

        // Track which local members have been matched to WorkOS users
        const matchedLocalMemberEmails = new Set<string>();

        // Merge WorkOS users with local data
        const mergedUsers = workosUsers.map((user) => {
            const localMember = user.email ? localMembersByEmail[user.email.toLowerCase()] : null;
            
            if (localMember && user.email) {
                matchedLocalMemberEmails.add(user.email.toLowerCase());
                
                // If local member exists but isn't activated, they accepted the WorkOS invite
                // Activate them in the background (fire and forget)
                if (!localMember.isActivated) {
                    ctx.prisma.member.update({
                        where: { id: localMember.id },
                        data: { 
                            isActivated: true,
                            // Update name from WorkOS if local name is placeholder/email-based
                            name: user.firstName + (user.lastName ? ' ' + user.lastName : ''),
                        },
                    }).catch(err => console.error('[listWorkOSMembers] Failed to activate member:', err));
                }
            }
            
            // Use WorkOS user's name since they've authenticated
            const workosName = (user.firstName || '') + (user.lastName ? ' ' + user.lastName : '');
            
            return {
                // Use local member ID if available, otherwise use WorkOS user ID
                id: localMember?.id || user.id,
                workosUserId: user.id,
                userId: localMember?.user.id || user.id,
                // Prefer WorkOS name for activated users
                name: workosName.trim() || localMember?.name || user.email || '',
                email: user.email || '',
                image: localMember?.image || user.profilePictureUrl || null,
                role: localMember?.role || 'member', // Default to member since listUsers doesn't give role
                isActivated: true, // WorkOS users are always considered activated
                isAvailableByDefault: localMember?.isAvailableByDefault ?? true,
                memberId: localMember?.id || null, // null if no local member record yet
            };
        });

        // Add local-only members (not in WorkOS) to the list
        const localOnlyMembers = localMembers
            .filter(member => {
                // Exclude members already matched to WorkOS users
                if (member.user.email && matchedLocalMemberEmails.has(member.user.email.toLowerCase())) {
                    return false;
                }
                
                // FILTER: Only include local members if they are explicit "Non-Account Members"
                // (identified by placeholder email) OR if they have a pending invitation.
                // Any other local member who is NOT in WorkOS is considered a "zombie" (leaked/stale data)
                // and should be hidden from the dropdown.
                const isPlaceholder = member.user.email?.includes('@placeholder.local');
                const isInvited = member.user.email && invitedEmails.has(member.user.email.toLowerCase());
                
                return isPlaceholder || isInvited || true; // Include everyone, but mark zombies as deleted
            })
            .map(member => {
                 const isPlaceholder = member.user.email?.includes('@placeholder.local');
                 const isInvited = member.user.email && invitedEmails.has(member.user.email.toLowerCase());
                 
                 // If not a placeholder and not invited, and we are here (meaning not matched to WorkOS), then it is a zombie/deleted user
                 const isDeleted = !isPlaceholder && !isInvited;
                 
                 return {
                    id: member.id,
                    workosUserId: null,
                    userId: member.user.id,
                    name: member.name || member.user.name || member.user.email,
                    email: member.user.email,
                    image: member.image || member.user.image || null,
                    role: member.role,
                    isActivated: member.isActivated,
                    isAvailableByDefault: member.isAvailableByDefault,
                    memberId: member.id,
                    isDeleted, 
                };
            });

        const mergedUsersWithDeletedFlag = mergedUsers.map(u => ({ ...u, isDeleted: false }));
        const allMembers = [...mergedUsersWithDeletedFlag, ...localOnlyMembers];
        return allMembers;
    }),

    // List non-account members (local-only members who work shifts but don't have login accounts)
    listNonAccountMembers: adminProcedure.query(async ({ ctx }) => {
        const members = await ctx.prisma.member.findMany({
            where: {
                organizationId: ctx.user.organizationId,
                isActivated: false,
                // Only include members with placeholder email
                user: {
                    email: { contains: '@placeholder.local' },
                },
            },
            include: {
                user: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });


        return members.map(member => ({
            id: member.id,
            userId: member.user.id,
            name: member.name || member.user.name || 'Unknown',
            role: member.role,
            isAvailableByDefault: member.isAvailableByDefault,
            createdAt: member.createdAt,
        }));
    }),

    // Create a non-account member (local-only, no email/login)
    createNonAccountMember: adminProcedure
        .input(
            z.object({
                name: z.string().min(1, 'Name is required'),
                role: z.enum(['member', 'admin']).default('member'),
                isAvailableByDefault: z.boolean().default(true),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { name, role, isAvailableByDefault } = input;

            // Create a placeholder user with no real email
            const placeholderEmail = `no-email-${uuidv4()}@placeholder.local`;
            
            const user = await ctx.prisma.user.create({
                data: {
                    id: uuidv4(),
                    email: placeholderEmail,
                    name: name,
                    emailVerified: false,
                    banned: true, // Can't log in
                    banReason: 'Non-account member',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            // Create the member record
            const member = await ctx.prisma.member.create({
                data: {
                    id: uuidv4(),
                    userId: user.id,
                    organizationId: ctx.user.organizationId,
                    role,
                    name,
                    isActivated: false, // Not activated until they have a real account
                    isAvailableByDefault,
                    createdAt: new Date(),
                },
            });

            console.log('[createNonAccountMember] Created:', { memberId: member.id, name });

            return {
                success: true,
                member: {
                    id: member.id,
                    userId: user.id,
                    name: member.name,
                    role: member.role,
                    isAvailableByDefault: member.isAvailableByDefault,
                },
            };
        }),

    // Invite a non-account member (add email and send WorkOS invitation)
    inviteNonAccountMember: adminProcedure
        .input(
            z.object({
                memberId: z.string(),
                email: z.string().email('Valid email is required'),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { memberId, email } = input;

            // Find the non-account member
            const member = await ctx.prisma.member.findFirst({
                where: {
                    id: memberId,
                    organizationId: ctx.user.organizationId,
                    isActivated: false,
                },
                include: {
                    user: true,
                },
            });

            if (!member) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Non-account member not found',
                });
            }

            // Check if email is already in use by another user
            const existingUser = await ctx.prisma.user.findUnique({
                where: { email: email.toLowerCase() },
            });

            if (existingUser && existingUser.id !== member.userId) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'This email is already associated with another account',
                });
            }

            // Update the placeholder user with the real email
            await ctx.prisma.user.update({
                where: { id: member.userId },
                data: {
                    email: email.toLowerCase(),
                    banned: false, // Allow login now
                    banReason: null,
                },
            });

            // Send WorkOS invitation
            const workosOrgId = ctx.user.workosOrgId;
            if (workosOrgId) {
                try {
                    const roleSlugMap: Record<string, string> = {
                        'owner': 'admin',
                        'admin': 'admin',
                        'member': 'member',
                    };

                    const workosInvitation = await workos.userManagement.sendInvitation({
                        email: email.toLowerCase(),
                        organizationId: workosOrgId,
                        expiresInDays: 7,
                        inviterUserId: ctx.user.workosUserId || undefined,
                        roleSlug: roleSlugMap[member.role] || 'member',
                    });

                    console.log('[inviteNonAccountMember] WorkOS invitation sent:', workosInvitation.id);

                    return {
                        success: true,
                        message: 'Invitation sent successfully',
                        workosInvitationId: workosInvitation.id,
                    };
                } catch (err: any) {
                    console.error('[inviteNonAccountMember] WorkOS invitation failed:', err.message);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: `Failed to send invitation: ${err.message}`,
                    });
                }
            } else {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Organization is not connected to WorkOS',
                });
            }
        }),

    updateDefaultAvailability: userProcedure
        .input(
            z.object({
                memberId: z.string(),
                isAvailableByDefault: z.boolean(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { memberId, isAvailableByDefault } = input;

            // Check if the user is updating their own availability
            if (
                !ctx.isMemberData(memberId) &&
                ctx.user.role !== 'admin' &&
                ctx.user.role !== 'owner'
            ) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You can only update your own default availability',
                });
            }

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
            z
                .object({
                    memberId: z.string(),
                    role: z
                        .enum(['suspended', 'member', 'admin', 'owner'])
                        .optional(),
                    displayName: z.string().optional(),
                    email: z.string().optional(),
                    sendInvitation: z.boolean().optional(),
                })
                .refine(
                    (data) => {
                        // If sendInvitation is true, the email field must be a non-empty string and a valid email.
                        if (data.sendInvitation) {
                            // We use safeParse to avoid an exception and return a boolean.
                            const email = data.email;
                            return email
                                ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                                : true;
                        }

                        // If sendInvitation is false, the email field can be empty or null.
                        return true;
                    },
                    {
                        message:
                            'Email is required and must be a valid email when "sendInvitation" is active',
                        path: ['email'],
                    }
                )
        )
        .mutation(async ({ ctx, input }) => {
            const { memberId, role, displayName, email, sendInvitation } =
                input;

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

            // Check if email is being updated for a non-activated member
            let shouldSendInvitation = false;
            let updatedMember;

            if (email !== undefined && !currentMember.isActivated) {
                // Email is being updated for a non-activated member
                // Instead of updating the existing user's email, we'll find or create a user with the new email
                // and update the member to point to the new user

                // Generate a placeholder email if none is provided
                const isNoEmailUser = !email || email.trim() === '';
                const actualEmail = isNoEmailUser
                    ? `no-email-${uuidv4()}@placeholder.local`
                    : email.trim();

                // Check if a user with the new email already exists
                let newUser = isNoEmailUser
                    ? null
                    : await ctx.prisma.user.findUnique({
                          where: { email: actualEmail },
                      });

                // If no user exists with the new email, create one
                if (!newUser) {
                    newUser = await ctx.prisma.user.create({
                        data: {
                            id: uuidv4(),
                            email: actualEmail,
                            name:
                                displayName ||
                                (isNoEmailUser
                                    ? 'No Email User'
                                    : actualEmail.split('@')[0]), // Use provided name or default
                            emailVerified: true,
                            banned: isNoEmailUser, // Ban users with no email
                            banReason: isNoEmailUser
                                ? 'No email provided'
                                : undefined,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                    });
                }

                // Delete all existing invitations for the old email in this organization
                const existingInvitations =
                    await ctx.prisma.invitation.findMany({
                        where: {
                            email: currentMember.user.email,
                            organizationId: ctx.user.organizationId,
                        },
                    });

                // Delete all invitations for the old email
                if (existingInvitations.length > 0) {
                    await ctx.prisma.invitation.deleteMany({
                        where: {
                            email: currentMember.user.email,
                            organizationId: ctx.user.organizationId,
                        },
                    });
                }

                // Also delete any invitations for the new email in this organization
                if (!isNoEmailUser) {
                    await ctx.prisma.invitation.deleteMany({
                        where: {
                            email: actualEmail,
                            organizationId: ctx.user.organizationId,
                        },
                    });
                }

                // Update the member to point to the new user
                updatedMember = await ctx.prisma.member.update({
                    where: { id: memberId },
                    data: {
                        ...(role && { role }),
                        userId: newUser.id, // Link to the new user
                    },
                    include: {
                        user: true,
                    },
                });

                // The shouldSendInvitation flag will be used later to determine if we should create a new invitation
                shouldSendInvitation = input.sendInvitation === true;
            } else {
                // Normal update without email change or for activated members
                updatedMember = await ctx.prisma.member.update({
                    where: { id: memberId },
                    data: {
                        ...(role && { role }),
                    },
                    include: {
                        user: true,
                    },
                });
            }

            // Log the user status change if role was updated
            if (role && role !== currentMember.role) {
                await logUserStatusChange(
                    ctx.prisma,
                    ctx.user.organizationId,
                    ctx.user.id,
                    updatedMember.userId,
                    updatedMember.name ||
                        updatedMember.user.name ||
                        updatedMember.user.email,
                    role,
                    {
                        previousRole: currentMember.role,
                        memberId: memberId,
                    }
                );
            }

            // If displayName is provided, update the member's name field
            if (displayName) {
                await ctx.prisma.member.update({
                    where: { id: memberId },
                    data: { name: displayName },
                });

                // Update the member name in our result
                updatedMember.name = displayName;
            }

            // If email was updated and shouldSendInvitation is true, create a new invitation
            // Only create an invitation if it's not a no-email user
            if (
                email !== undefined &&
                !currentMember.isActivated &&
                shouldSendInvitation
            ) {
                // Check if this is a no-email user
                const isNoEmailUser = !email || email.trim() === '';

                // Only proceed with invitation creation and sending if it's not a no-email user
                if (!isNoEmailUser) {
                    const invitationId = uuidv4();
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

                    // Use the actual email (which is the trimmed email)
                    const actualEmail = email.trim();

                    // Create the invitation
                    await ctx.prisma.invitation.create({
                        data: {
                            id: invitationId,
                            email: actualEmail,
                            role: updatedMember.role,
                            status: 'pending',
                            expiresAt,
                            organization: {
                                connect: { id: ctx.user.organizationId },
                            },
                            user: {
                                connect: { id: ctx.user.id }, // The inviter
                            },
                        },
                    });

                    // Get the organization for the email
                    const organization =
                        await ctx.prisma.organization.findUnique({
                            where: { id: ctx.user.organizationId },
                        });

                    if (!organization) {
                        throw new TRPCError({
                            code: 'NOT_FOUND',
                            message: 'Organization not found',
                        });
                    }

                    // Get the inviter's information - try local Member first, fallback to context
                    const inviter = await ctx.prisma.member.findFirst({
                        where: {
                            userId: ctx.user.id,
                            organizationId: ctx.user.organizationId,
                        },
                        include: {
                            user: true,
                        },
                    });

                    // Create inviter info from local member or context user (for WorkOS-only users)
                    const inviterInfo = inviter 
                        ? {
                            name: inviter.name || inviter.user.name,
                            email: inviter.user.email,
                        }
                        : {
                            name: ctx.user.name || ctx.user.email,
                            email: ctx.user.email,
                        };

                    // Send the invitation email
                    const { sendInvitationEmail } = await import('@/lib/email');
                    await sendInvitationEmail({
                        id: invitationId,
                        email: actualEmail,
                        inviter: {
                            user: inviterInfo,
                        },
                        organization: {
                            name: organization.name,
                        },
                    });

                    // Log the invitation creation
                    const { logTeamInviteSend } = await import('@/lib/logging');
                    await logTeamInviteSend(
                        ctx.prisma,
                        ctx.user.organizationId,
                        ctx.user.id,
                        invitationId,
                        actualEmail,
                        updatedMember.role,
                        {
                            action: 'create',
                            status: 'pending',
                        }
                    );
                }
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
                message: 'Invitation deleted successfully',
            };
        }),


});

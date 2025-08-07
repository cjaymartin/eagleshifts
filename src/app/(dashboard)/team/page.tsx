'use client';

import React, { useState, Suspense } from 'react';
import {
    Box,
    Container,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    CircularProgress,
    Skeleton,
    Chip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import EmailIcon from '@mui/icons-material/Email';
import {
    useAuthQuery,
    useTeamUsersQuery,
    useDeleteUserMutation,
} from '@/queries/users';
import {
    useInvitationsListQuery,
    useDeleteInvitationMutation,
    useReInviteMutation,
} from '@/queries/invitations';
import { useDialogs, useNotifications } from '@toolpad/core';
import TeamDialog from './_components/TeamDialog';
import { sortBy } from 'lodash';
import { trpc } from '@/lib/trpc/client';
import { useCookies } from 'next-client-cookies';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';

// Loading skeleton component for the team page
function TeamPageSkeleton() {
    return (
        <Box>
            <Skeleton variant="text" width="200px" height={40} />
            <Box mt={3}>
                <Skeleton variant="text" width="150px" height={30} />
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <Skeleton variant="text" width="100%" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="text" width="100%" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="text" width="100%" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="text" width="100%" />
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {[...Array(5)].map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <Skeleton variant="text" width="100%" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="text" width="100%" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="text" width="100%" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="text" width="100%" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
}

// Team content component that requires data
function TeamContent() {
    const router = useRouter();
    const dialogs = useDialogs();
    const notifications = useNotifications();
    const queryClient = useQueryClient();

    // Get authentication and user data
    const { data: session, isLoading: isSessionLoading } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';
    const isAdmin = ['admin', 'owner'].includes(role);

    // Get team users data
    const { data: teamUsers = [], isLoading: isTeamUsersLoading } =
        useTeamUsersQuery();
    const { data: invitations = [], isLoading: isInvitationsLoading } =
        useInvitationsListQuery();

    // Show loading state if any data is still loading
    const isLoading =
        isSessionLoading || isTeamUsersLoading || isInvitationsLoading;

    // Process data - do this even during loading to maintain hook order

    // Check if a user has active invitations
    const hasActiveInvitation = React.useCallback(
        (email: string) => {
            return invitations.some(
                (invitation) =>
                    invitation.email === email &&
                    invitation.status === 'pending' &&
                    new Date(invitation.expiresAt) > new Date() // Check if not expired
            );
        },
        [invitations]
    );

    // Check if a user has expired invitations
    const hasExpiredInvitation = React.useCallback(
        (email: string) => {
            return invitations.some(
                (invitation) =>
                    invitation.email === email &&
                    invitation.status === 'pending' &&
                    new Date(invitation.expiresAt) <= new Date() // Check if expired
            );
        },
        [invitations]
    );

    // Sort users by role and email - always call this hook regardless of loading state
    const sortedUsers = React.useMemo(() => {
        const ranks = {
            owner: 4,
            admin: 3,
            member: 2,
            suspended: 1,
        };

        return sortBy(teamUsers, (user) => {
            const userRole = user.role || 'member';
            return `${(ranks[userRole as 'owner' | 'admin' | 'member' | 'suspended'] as any) || 0}::${user.email}`;
        }).reverse(); // Reverse to get highest rank first
    }, [teamUsers]);

    // Delete user mutation
    const deleteUserMutation = useDeleteUserMutation();
    const deleteInvitationMutation = useDeleteInvitationMutation();

    // Re-invite mutation
    const reInviteMutation = useReInviteMutation();

    // Handle user deletion
    const handleDelete = async (memberId: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await deleteUserMutation.mutateAsync({ memberId });
                notifications.show('User deleted successfully', {
                    severity: 'success',
                });
            } catch (error: any) {
                notifications.show(`Error deleting user: ${error.message}`, {
                    severity: 'error',
                });
            }
        }
    };

    // Define user type
    type TeamUser = {
        id: string;
        email: string;
        role?: string;
        members?: { id: string }[];
    };

    // Handle user editing
    const handleEdit = (user: TeamUser) => {
        dialogs.open(TeamDialog, { user } as any);
    };

    const handleInvite = () => {
        return dialogs.open(TeamDialog, { isNew: true } as any);
    };

    // Handle user imitation
    const handleImitate = async (memberId: string) => {
        try {
            // Redirect to the auth imitation endpoint with memberId
            window.location.href = `/api/auth/imitate?memberId=${memberId}&callbackURL=/`;
        } catch (error: any) {
            notifications.show(`Error imitating user: ${error.message}`, {
                severity: 'error',
            });
        }
    };

    // Handle invitation deletion
    const handleDeleteInvitation = async (invitationId: string) => {
        if (
            window.confirm('Are you sure you want to delete this invitation?')
        ) {
            try {
                await deleteInvitationMutation.mutateAsync({ invitationId });
                notifications.show('Invitation deleted successfully', {
                    severity: 'success',
                });
            } catch (error: any) {
                notifications.show(
                    `Error deleting invitation: ${error.message}`,
                    {
                        severity: 'error',
                    }
                );
            }
        }
    };

    // Fix for any references to handleRejectInvitation
    const handleRejectInvitation = handleDeleteInvitation;

    // Handle re-invite action
    const handleReInvite = async (user: {
        email: string;
        role: string;
        name?: string;
    }) => {
        try {
            await reInviteMutation.mutateAsync({
                email: user.email,
                role: user.role as 'member' | 'admin' | 'owner',
                name: user.name,
            });
            notifications.show('Invitation sent successfully', {
                severity: 'success',
            });
        } catch (error: any) {
            notifications.show(`Error sending invitation: ${error.message}`, {
                severity: 'error',
            });
        }
    };

    // Render loading state if data is still loading
    if (isLoading) {
        return <TeamPageSkeleton />;
    }

    // Render different content based on admin status
    return (
        <Box>
            {!isAdmin ? (
                // Access denied message for non-admins
                <>
                    <Typography variant="h4">Access Denied</Typography>
                    <Typography>
                        You do not have permission to view this page.
                    </Typography>
                </>
            ) : (
                // Team management UI for admins
                <>
                    <h2>Team</h2>
                    <Box>
                        <Typography variant="h6">Team Members</Typography>
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Role</TableCell>
                                        <TableCell sx={{ textAlign: 'right' }}>
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sortedUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                {user.name}
                                                {!user.isActivated && (
                                                    <Chip
                                                        label={
                                                            hasActiveInvitation(
                                                                user.email
                                                            )
                                                                ? 'Pending'
                                                                : hasExpiredInvitation(
                                                                        user.email
                                                                    )
                                                                  ? 'Invite Expired'
                                                                  : 'No Account'
                                                        }
                                                        size="small"
                                                        color={
                                                            hasActiveInvitation(
                                                                user.email
                                                            )
                                                                ? 'warning'
                                                                : hasExpiredInvitation(
                                                                        user.email
                                                                    )
                                                                  ? 'error'
                                                                  : 'error'
                                                        }
                                                        sx={{ ml: 1 }}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {user.email &&
                                                user.email.includes(
                                                    '@placeholder.local'
                                                )
                                                    ? ''
                                                    : user.email}
                                            </TableCell>
                                            <TableCell>{user.role}</TableCell>
                                            <TableCell
                                                sx={{ textAlign: 'right' }}
                                            >
                                                {!user.isActivated && (
                                                    <IconButton
                                                        onClick={() =>
                                                            handleReInvite({
                                                                email: user.email,
                                                                role:
                                                                    user.role ||
                                                                    'member',
                                                                name: user.name,
                                                                //sendInvitation: true, // Always send invitation when clicking this button
                                                            })
                                                        }
                                                        title={
                                                            !user.email ||
                                                            user.email.includes(
                                                                '@placeholder.local'
                                                            )
                                                                ? 'No email address attached to this user'
                                                                : hasActiveInvitation(
                                                                        user.email
                                                                    ) ||
                                                                    hasExpiredInvitation(
                                                                        user.email
                                                                    )
                                                                  ? 'Resend Invitation'
                                                                  : 'Send Invite'
                                                        }
                                                        disabled={
                                                            !user.email ||
                                                            user.email.includes(
                                                                '@placeholder.local'
                                                            )
                                                        }
                                                    >
                                                        {
                                                            hasActiveInvitation(
                                                                user.email
                                                            ) ||
                                                            hasExpiredInvitation(
                                                                user.email
                                                            ) ? (
                                                                <RefreshIcon /> // Use RefreshIcon for "Resend Invitation"
                                                            ) : (
                                                                <EmailIcon />
                                                            ) // Use EmailIcon for "Send Invite"
                                                        }
                                                    </IconButton>
                                                )}
                                                {role === 'owner' &&
                                                    user.role !== 'owner' && (
                                                        <IconButton
                                                            onClick={() =>
                                                                handleImitate(
                                                                    user.id
                                                                )
                                                            }
                                                            title="Imitate User"
                                                        >
                                                            <AccessibilityNewIcon />
                                                        </IconButton>
                                                    )}
                                                <IconButton
                                                    onClick={() =>
                                                        handleEdit(user)
                                                    }
                                                    title="Edit User"
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    onClick={() =>
                                                        handleDelete(user.id)
                                                    }
                                                    title="Delete User"
                                                    disabled={
                                                        user.role === 'owner'
                                                    }
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Container>
                            <IconButton
                                onClick={() => handleInvite()}
                                title="Invite Member"
                            >
                                <AddIcon /> Invite Member
                            </IconButton>
                        </Container>
                    </Box>
                </>
            )}
        </Box>
    );
}

// Main Team component that uses Suspense
export default function Team() {
    return (
        <Suspense fallback={<TeamPageSkeleton />}>
            <TeamContent />
        </Suspense>
    );
}

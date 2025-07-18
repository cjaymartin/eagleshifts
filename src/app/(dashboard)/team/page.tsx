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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import {
    useAuthQuery,
    useTeamUsersQuery,
    useDeleteUserMutation,
    useImitateUserMutation,
    useInvitationListQuery,
    useRejectInvitationMutation,
    useDeleteInvitationMutation,
} from '@/queries/users';
import { useDialogs, useNotifications } from '@toolpad/core';
import TeamDialog from './_components/TeamDialog';
import { sortBy } from 'lodash';
import { trpc } from '@/lib/trpc/client';
import { useCookies } from 'next-client-cookies';
import { setImitationSession } from '@/app/(dashboard)/team/actions';
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
        useInvitationListQuery();

    // Show loading state if any data is still loading
    const isLoading =
        isSessionLoading || isTeamUsersLoading || isInvitationsLoading;

    // Process data - do this even during loading to maintain hook order
    const pendingInvitations = React.useMemo(
        () => invitations?.filter((x) => x.status === 'pending') ?? [],
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

    // Imitate user mutation
    const imitateUserMutation = useImitateUserMutation();

    // Reject invitation mutation
    const rejectInvitationMutation = useRejectInvitationMutation();

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
        console.log('HEH ', user);
        dialogs.open(TeamDialog, { user } as any);
    };

    const handleInvite = () => {
        return dialogs.open(TeamDialog, { isNew: true } as any);
    };

    // Handle user imitation
    const handleImitate = async (memberId: string) => {
        console.log('HANDLE ME');
        try {
            const imitation = await imitateUserMutation.mutateAsync({
                memberId,
            });
            console.log('Imitation response:');
            console.dir({ imitation });
            if (imitation.success) {
                console.log('Imitation successful:');
                notifications.show('User invited successfully');
                await setImitationSession(imitation.cookie);
                console.log('Imitation session set successfully');

                queryClient.invalidateQueries();
                authClient.getSession();

                //router.push('/');
                window.location.href = '/'; // Redirect to home page
                //then redirect to forwardslash
            }

            // Redirect is handled in the mutation hook
        } catch (error: any) {
            notifications.show(`Error imitating user: ${error.message}`, {
                severity: 'error',
            });
        }
    };

    // Handle invitation rejection
    const handleRejectInvitation = async (invitationId: string) => {
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

    // Render loading state if data is still loading
    if (isLoading) {
        return <TeamPageSkeleton />;
    }

    console.log({ teamUsers });

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
                                            <TableCell>{user.name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{user.role}</TableCell>
                                            <TableCell
                                                sx={{ textAlign: 'right' }}
                                            >
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

                        {pendingInvitations.length > 0 && (
                            <Box mt={4}>
                                <Typography variant="h6">
                                    Pending Invitations
                                </Typography>
                                <TableContainer component={Paper}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Email</TableCell>
                                                <TableCell>Role</TableCell>
                                                <TableCell
                                                    sx={{ textAlign: 'right' }}
                                                >
                                                    Actions
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {pendingInvitations?.map(
                                                (invitation) => (
                                                    <TableRow
                                                        key={invitation.id}
                                                    >
                                                        <TableCell>
                                                            {invitation.email}
                                                        </TableCell>
                                                        <TableCell>
                                                            {invitation.role}
                                                        </TableCell>
                                                        <TableCell
                                                            sx={{
                                                                textAlign:
                                                                    'right',
                                                            }}
                                                        >
                                                            <IconButton
                                                                onClick={() =>
                                                                    handleRejectInvitation(
                                                                        invitation.id
                                                                    )
                                                                }
                                                                title="Delete Invitation"
                                                            >
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}
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

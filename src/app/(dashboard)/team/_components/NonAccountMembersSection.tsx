'use client';

import React, { useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import { trpc } from '@/lib/trpc/client';
import { useNotifications } from '@/components/providers/NotificationsProvider';

type NonAccountMember = {
    id: string;
    userId: string;
    name: string;
    role: string;
    isAvailableByDefault: boolean;
    createdAt: Date;
};

export function NonAccountMembersSection() {
    const notifications = useNotifications();
    const utils = trpc.useUtils();

    // State for dialogs
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [selectedMember, setSelectedMember] =
        useState<NonAccountMember | null>(null);

    // Form state
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberRole, setNewMemberRole] = useState<'member' | 'admin'>(
        'member'
    );
    const [inviteEmail, setInviteEmail] = useState('');

    // Queries and mutations
    const { data: members = [], isLoading } =
        trpc.users.listNonAccountMembers.useQuery();

    const createMutation = trpc.users.createNonAccountMember.useMutation({
        onSuccess: () => {
            notifications.show('Non-account member created', {
                severity: 'success',
            });
            setCreateDialogOpen(false);
            setNewMemberName('');
            setNewMemberRole('member');
            utils.users.listNonAccountMembers.invalidate();
        },
        onError: (err) => {
            notifications.show(`Error: ${err.message}`, { severity: 'error' });
        },
    });

    const inviteMutation = trpc.users.inviteNonAccountMember.useMutation({
        onSuccess: () => {
            notifications.show('Invitation sent!', { severity: 'success' });
            setInviteDialogOpen(false);
            setInviteEmail('');
            setSelectedMember(null);
            utils.users.listNonAccountMembers.invalidate();
        },
        onError: (err) => {
            notifications.show(`Error: ${err.message}`, { severity: 'error' });
        },
    });

    const deleteMutation = trpc.users.delete.useMutation({
        onSuccess: () => {
            notifications.show('Member removed', { severity: 'success' });
            utils.users.listNonAccountMembers.invalidate();
        },
        onError: (err) => {
            notifications.show(`Error: ${err.message}`, { severity: 'error' });
        },
    });

    const handleCreate = () => {
        if (!newMemberName.trim()) return;
        createMutation.mutate({
            name: newMemberName.trim(),
            role: newMemberRole,
        });
    };

    const handleInvite = () => {
        if (!selectedMember || !inviteEmail.trim()) return;
        inviteMutation.mutate({
            memberId: selectedMember.id,
            email: inviteEmail.trim(),
        });
    };

    const handleDelete = (member: NonAccountMember) => {
        if (window.confirm(`Are you sure you want to remove ${member.name}?`)) {
            deleteMutation.mutate({ memberId: member.id });
        }
    };

    const openInviteDialog = (member: NonAccountMember) => {
        setSelectedMember(member);
        setInviteEmail('');
        setInviteDialogOpen(true);
    };

    if (isLoading) {
        return (
            <Box sx={{ mt: 4 }}>
                <Typography variant="h6">Non-Account Members</Typography>
                <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ mt: 4 }}>
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
            >
                <Typography variant="h6">
                    Non-Account Members
                    <Chip label={members.length} size="small" sx={{ ml: 1 }} />
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                >
                    Add Member
                </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                People who work shifts but don&apos;t have login accounts. Use
                &quot;Invite&quot; to send them an account invitation.
            </Typography>

            {members.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        No non-account members. Add someone who doesn&apos;t
                        need to log in.
                    </Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {members.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell>{member.name}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={member.role}
                                            size="small"
                                            color={
                                                member.role === 'admin'
                                                    ? 'primary'
                                                    : 'default'
                                            }
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            title="Send invitation"
                                            onClick={() =>
                                                openInviteDialog(member)
                                            }
                                        >
                                            <EmailIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            title="Delete"
                                            onClick={() => handleDelete(member)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Create Non-Account Member Dialog */}
            <Dialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Add Non-Account Member</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Name"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        margin="normal"
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={newMemberRole}
                            label="Role"
                            onChange={(e) =>
                                setNewMemberRole(
                                    e.target.value as 'member' | 'admin'
                                )
                            }
                        >
                            <MenuItem value="member">Member</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={
                            !newMemberName.trim() || createMutation.isPending
                        }
                    >
                        {createMutation.isPending ? 'Creating...' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Invite Dialog */}
            <Dialog
                open={inviteDialogOpen}
                onClose={() => setInviteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Invite {selectedMember?.name}</DialogTitle>
                <DialogContent>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                    >
                        Enter their email to send an account invitation. When
                        they accept, their shift history will be linked to their
                        account.
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInviteDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleInvite}
                        disabled={
                            !inviteEmail.trim() || inviteMutation.isPending
                        }
                    >
                        {inviteMutation.isPending
                            ? 'Sending...'
                            : 'Send Invitation'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

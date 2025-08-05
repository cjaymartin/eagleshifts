'use client';

import React, { useState } from 'react';
import {
    Box,
    Button,
    Dialog,
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
} from '@mui/material';
import { Add, Close, Delete, Edit, Group } from '@mui/icons-material';
import { useNotifications, useDialogs } from '@toolpad/core';
import { useAuthQuery } from '@/queries/users';
import {
    useLocationGroupsQuery,
    useLocationGroupDeleteMutation,
} from '@/queries/locations';
import LocationGroupForm from './LocationGroupForm';
import { getTextColor } from '@/utils/colorUtils';

export default function LocationGroupsTab() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [editGroupId, setEditGroupId] = useState<string | null>(null);

    const notifications = useNotifications();
    const dialogs = useDialogs();

    // Get user role to determine if they can create/edit/delete groups
    const { data: session } = useAuthQuery();
    const isAdmin =
        session?.user?.role === 'admin' || session?.user?.role === 'owner';

    // Fetch location groups
    const {
        data: locationGroups,
        isLoading,
        refetch,
    } = useLocationGroupsQuery();

    // Delete mutation
    const deleteMutation = useLocationGroupDeleteMutation();

    // Filter groups by search term
    const filteredGroups = locationGroups?.filter(
        (group) =>
            searchTerm.length < 3 ||
            group.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle edit group
    const handleEditGroup = (groupId: string) => {
        setEditGroupId(groupId);
        setIsFormDialogOpen(true);
    };

    // Handle delete group
    const handleDeleteGroup = async (groupId: string) => {
        try {
            const confirmed = await dialogs.confirm({
                title: 'Delete Group',
                message:
                    'Are you sure you want to delete this group? This action cannot be undone.',
                confirmText: 'Delete',
                cancelText: 'Cancel',
            } as any);

            if (confirmed) {
                await deleteMutation.mutateAsync({ id: groupId });
                notifications.show('Group deleted successfully', {
                    severity: 'success',
                    autoHideDuration: 3000,
                });
                refetch();
            }
        } catch (error: any) {
            notifications.show(error.message || 'Failed to delete group', {
                severity: 'error',
            });
        }
    };

    // Handle form submission
    const handleFormSubmit = () => {
        setIsFormDialogOpen(false);
        setEditGroupId(null);
        refetch();
    };

    return (
        <>
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
            >
                <TextField
                    label="Search Groups"
                    variant="outlined"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name..."
                    sx={{ width: 300 }}
                />
                {isAdmin && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={() => {
                            setEditGroupId(null);
                            setIsFormDialogOpen(true);
                        }}
                    >
                        Add Group
                    </Button>
                )}
            </Box>

            <Paper elevation={0} sx={{ p: 2 }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Color</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : filteredGroups && filteredGroups.length > 0 ? (
                                filteredGroups.map((group) => (
                                    <TableRow key={group.id}>
                                        <TableCell>
                                            <Box
                                                display="flex"
                                                alignItems="center"
                                            >
                                                <Group
                                                    sx={{
                                                        mr: 1,
                                                        color: group.color,
                                                    }}
                                                />
                                                {group.name}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box
                                                component="span"
                                                sx={{
                                                    backgroundColor:
                                                        group.color,
                                                    color: getTextColor(
                                                        group.color
                                                    ),
                                                    px: 1,
                                                    py: 0.5,
                                                    borderRadius: 1,
                                                    display: 'inline-block',
                                                    width: 100,
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {group.color}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {isAdmin && (
                                                <>
                                                    <IconButton
                                                        onClick={() =>
                                                            handleEditGroup(
                                                                group.id
                                                            )
                                                        }
                                                        size="small"
                                                    >
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton
                                                        onClick={() =>
                                                            handleDeleteGroup(
                                                                group.id
                                                            )
                                                        }
                                                        size="small"
                                                        color="error"
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">
                                        No groups found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Create/Edit Group Dialog */}
            {isFormDialogOpen && (
                <Dialog
                    fullWidth={true}
                    maxWidth="sm"
                    open={isFormDialogOpen}
                    onClose={() => {
                        setIsFormDialogOpen(false);
                        setEditGroupId(null);
                    }}
                >
                    <DialogTitle>
                        <Box display="flex" alignItems="center">
                            <Box flexGrow={1}>
                                {editGroupId
                                    ? 'Edit Group'
                                    : 'Create New Group'}
                            </Box>
                            <Box>
                                <IconButton
                                    onClick={() => {
                                        setIsFormDialogOpen(false);
                                        setEditGroupId(null);
                                    }}
                                >
                                    <Close />
                                </IconButton>
                            </Box>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        <LocationGroupForm
                            groupId={editGroupId}
                            onSubmit={handleFormSubmit}
                            onCancel={() => {
                                setIsFormDialogOpen(false);
                                setEditGroupId(null);
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

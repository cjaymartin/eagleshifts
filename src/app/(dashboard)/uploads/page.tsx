'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RestoreIcon from '@mui/icons-material/Restore';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import {
    useAllUploadsQuery,
    useDeleteFileMutation,
    usePermanentlyDeleteFileMutation,
} from '@/queries/uploads';
import { useTeamUsersQuery } from '@/queries/users';
import { useUploadGroupsQuery } from '@/queries/uploads';
import { useAuthQuery } from '@/queries/users';
import FilePreviewButton from '@/components/FilePreview';

export default function UploadsPage() {
    const notifications = useNotifications();
    const [includeDeleted, setIncludeDeleted] = useState(false);
    const [showOnlyInactive, setShowOnlyInactive] = useState(false);
    const [filters, setFilters] = useState({
        shiftId: '',
        uploadGroupId: '',
        uploaderId: '',
    });

    // Get the current user
    const { data: session } = useAuthQuery();
    const isAdmin =
        session?.user?.role === 'admin' || session?.user?.role === 'owner';

    // Get all uploads
    const {
        data: uploads,
        isLoading,
        refetch: refetchUploads,
    } = useAllUploadsQuery({
        includeDeleted,
        showOnlyInactive,
        ...filters,
    });

    // Get all team members
    const { data: teamMembers = [] } = useTeamUsersQuery();

    // Get all upload groups
    const { data: uploadGroups = [] } = useUploadGroupsQuery();

    // Effect to update filters when showOnlyInactive changes
    useEffect(() => {
        if (showOnlyInactive) {
            // Find inactive upload groups
            const inactiveGroups = uploadGroups.filter(
                (group) => !group.isActive
            );

            if (inactiveGroups.length > 0) {
                // Check if current filter is already an inactive group
                const currentGroupIsInactive = inactiveGroups.some(
                    (group) => group.id === filters.uploadGroupId
                );

                // If not, set to the first inactive group
                if (!currentGroupIsInactive) {
                    setFilters((prev) => ({
                        ...prev,
                        uploadGroupId: inactiveGroups[0].id,
                    }));
                }
            } else {
                // If there are no inactive groups, clear the filter to show all types
                setFilters((prev) => ({
                    ...prev,
                    uploadGroupId: '',
                }));
            }
        }
    }, [showOnlyInactive, uploadGroups, filters.uploadGroupId]);

    // Mutations
    const deleteFileMutation = useDeleteFileMutation();
    const permanentlyDeleteFileMutation = usePermanentlyDeleteFileMutation();

    // Handle filter changes
    const handleFilterChange = (field: string, value: string) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // Handle file deletion (soft delete)
    const handleDeleteFile = async (uploadId: string, fileName: string) => {
        if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

        try {
            await deleteFileMutation.mutateAsync({ uploadId });
            await refetchUploads();
            notifications.show(`File deleted successfully`, {
                severity: 'success',
                autoHideDuration: 3000,
            });
        } catch (error: any) {
            console.error('Error deleting file:', error);
            notifications.show(`Failed to delete file: ${error.message}`, {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    };

    // Handle permanent file deletion
    const handlePermanentlyDeleteFile = async (
        uploadId: string,
        fileName: string
    ) => {
        if (
            !confirm(
                `Are you sure you want to PERMANENTLY delete ${fileName}? This action cannot be undone.`
            )
        )
            return;

        try {
            await permanentlyDeleteFileMutation.mutateAsync({ uploadId });
            await refetchUploads();
            notifications.show(`File permanently deleted`, {
                severity: 'success',
                autoHideDuration: 3000,
            });
        } catch (error: any) {
            console.error('Error permanently deleting file:', error);
            notifications.show(
                `Failed to permanently delete file: ${error.message}`,
                { severity: 'error', autoHideDuration: 3000 }
            );
        }
    };

    // Handle file view
    const handleViewFile = (uploadId: string) => {
        window.open(`/api/uploads/view/${uploadId}`, '_blank');
    };

    // Format date
    const formatDate = (date: string | Date) => {
        return dayjs(date).format('MMM D, YYYY h:mm A');
    };

    // Format shift name and time
    const formatShift = (shift: any) => {
        if (!shift) return 'Unknown Shift';

        const title = shift.title || 'Untitled Shift';
        const start = shift.startTime ? formatDate(shift.startTime) : '';
        const end = shift.endTime ? formatDate(shift.endTime) : '';

        return `${title} (${start} - ${end})`;
    };

    return (
        <Container>
            {!isAdmin ? (
                <>
                    <Typography variant="h4" gutterBottom>
                        Unauthorized
                    </Typography>
                    <Typography>
                        You do not have permission to access this page.
                    </Typography>
                </>
            ) : (
                <Stack spacing={4}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    ></Box>

                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Filters
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <FormControl fullWidth>
                                        <InputLabel>Upload Type</InputLabel>
                                        <Select
                                            value={filters.uploadGroupId}
                                            label="Upload Type"
                                            onChange={(e) =>
                                                handleFilterChange(
                                                    'uploadGroupId',
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <MenuItem value="">
                                                All Types
                                            </MenuItem>
                                            {uploadGroups
                                                .filter((group) => {
                                                    // If showOnlyInactive is true, check if there are any inactive groups
                                                    if (showOnlyInactive) {
                                                        //const hasInactiveGroups = uploadGroups.some(g => !g.isActive);
                                                        return !group.isActive;
                                                        // If there are inactive groups, only show those, otherwise show all
                                                        //return hasInactiveGroups ? !group.isActive : true;
                                                    }
                                                    // If showOnlyInactive is false, show all groups
                                                    return group.isActive;
                                                })
                                                .map((group) => (
                                                    <MenuItem
                                                        key={group.id}
                                                        value={group.id}
                                                    >
                                                        {group.uploadName}
                                                        {!group.isActive && (
                                                            <Chip
                                                                size="small"
                                                                label="Inactive"
                                                                color="warning"
                                                                sx={{ ml: 1 }}
                                                            />
                                                        )}
                                                    </MenuItem>
                                                ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <FormControl fullWidth>
                                        <InputLabel>Uploader</InputLabel>
                                        <Select
                                            value={filters.uploaderId}
                                            label="Uploader"
                                            onChange={(e) =>
                                                handleFilterChange(
                                                    'uploaderId',
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <MenuItem value="">
                                                All Uploaders
                                            </MenuItem>
                                            {teamMembers.map((member) => (
                                                <MenuItem
                                                    key={member.id}
                                                    value={member.id}
                                                >
                                                    {member.name ||
                                                        member.email}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={includeDeleted}
                                                onChange={(e) =>
                                                    setIncludeDeleted(
                                                        e.target.checked
                                                    )
                                                }
                                            />
                                        }
                                        label="Include Deleted Files"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={showOnlyInactive}
                                                onChange={(e) =>
                                                    setShowOnlyInactive(
                                                        e.target.checked
                                                    )
                                                }
                                            />
                                        }
                                        label="Only Show Inactive Upload Types"
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => {
                                            setFilters({
                                                shiftId: '',
                                                uploadGroupId: '',
                                                uploaderId: '',
                                            });
                                            setIncludeDeleted(false);
                                            setShowOnlyInactive(false);
                                        }}
                                    >
                                        Clear Filters
                                    </Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Shift</TableCell>
                                    <TableCell>Upload Type</TableCell>
                                    <TableCell>File Name</TableCell>
                                    <TableCell>Uploader</TableCell>
                                    <TableCell>Upload Date</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell width="124px">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : uploads && uploads.length > 0 ? (
                                    uploads.map((upload) => (
                                        <TableRow key={upload.id}>
                                            <TableCell>
                                                {formatShift(upload.shift)}
                                            </TableCell>
                                            <TableCell>
                                                {upload.uploadGroup.uploadName}
                                                {!upload.uploadGroup
                                                    .isActive && (
                                                    <Chip
                                                        size="small"
                                                        label="Inactive"
                                                        color="warning"
                                                        sx={{ ml: 1 }}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {upload.fileName}
                                            </TableCell>
                                            <TableCell>
                                                {upload.uploader?.name ||
                                                    'Unknown'}
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(upload.uploadedAt)}
                                            </TableCell>
                                            <TableCell>
                                                {upload.isDeleted ? (
                                                    <Chip
                                                        size="small"
                                                        label={`Deleted by ${upload.deleter?.name || 'Unknown'}`}
                                                        color="error"
                                                    />
                                                ) : (
                                                    <Chip
                                                        size="small"
                                                        label="Active"
                                                        color="success"
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <FilePreviewButton
                                                    uploadId={upload.id}
                                                />
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        handleViewFile(
                                                            upload.id
                                                        )
                                                    }
                                                    title="Download file"
                                                >
                                                    <DownloadIcon fontSize="small" />
                                                </IconButton>

                                                {upload.isDeleted ? (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            handlePermanentlyDeleteFile(
                                                                upload.id,
                                                                upload.fileName
                                                            )
                                                        }
                                                        title="Permanently delete file"
                                                        color="error"
                                                    >
                                                        <DeleteForeverIcon fontSize="small" />
                                                    </IconButton>
                                                ) : (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            handleDeleteFile(
                                                                upload.id,
                                                                upload.fileName
                                                            )
                                                        }
                                                        title="Delete file"
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            No uploads found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Stack>
            )}
        </Container>
    );
}

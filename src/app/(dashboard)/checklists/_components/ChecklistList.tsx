import React, { useState } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import { trpc } from '@/lib/trpc/client';
import ChecklistForm from './ChecklistForm';
import ChecklistDetail from './ChecklistDetail';

export default function ChecklistList() {
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [selectedChecklist, setSelectedChecklist] = useState<any>(null);

    const notifications = useNotifications();

    // Fetch checklists
    const { data: checklists = [], refetch } = trpc.checklists.list.useQuery();

    // Delete checklist mutation
    const deleteChecklistMutation = trpc.checklists.delete.useMutation({
        onSuccess: () => {
            notifications.show('Checklist deleted successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });
            refetch();
            setOpenDeleteDialog(false);
        },
        onError: (error) => {
            notifications.show(`Error deleting checklist: ${error.message}`, {
                severity: 'error',
                autoHideDuration: 3000,
            });
        },
    });

    const handleCreateClick = () => {
        setOpenCreateDialog(true);
    };

    const handleEditClick = (checklist: any) => {
        setSelectedChecklist(checklist);
        setOpenEditDialog(true);
    };

    const handleDetailClick = (checklist: any) => {
        setSelectedChecklist(checklist);
        setOpenDetailDialog(true);
    };

    const handleDeleteClick = (checklist: any) => {
        setSelectedChecklist(checklist);
        setOpenDeleteDialog(true);
    };

    const handleDeleteConfirm = () => {
        if (selectedChecklist) {
            deleteChecklistMutation.mutate({ id: selectedChecklist.id });
        }
    };

    const handleCloseCreateDialog = () => {
        setOpenCreateDialog(false);
        refetch();
    };

    const handleCloseEditDialog = () => {
        setOpenEditDialog(false);
        refetch();
    };

    const handleCloseDetailDialog = () => {
        setOpenDetailDialog(false);
    };

    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
    };

    return (
        <Box>
            <Box
                sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}
            >
                <Typography variant="h6">All Checklists</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleCreateClick}
                >
                    Create Checklist
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Items</TableCell>
                            <TableCell>Used in Shifts</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {checklists.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    No checklists found. Create your first
                                    checklist!
                                </TableCell>
                            </TableRow>
                        ) : (
                            checklists.map((checklist) => (
                                <TableRow key={checklist.id}>
                                    <TableCell>{checklist.name}</TableCell>
                                    <TableCell>
                                        {checklist.description || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {checklist.items.length}
                                    </TableCell>
                                    <TableCell>
                                        {checklist._count?.shifts || 0}
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title="View Details">
                                            <IconButton
                                                onClick={() =>
                                                    handleDetailClick(checklist)
                                                }
                                            >
                                                <VisibilityIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Edit">
                                            <IconButton
                                                onClick={() =>
                                                    handleEditClick(checklist)
                                                }
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                onClick={() =>
                                                    handleDeleteClick(checklist)
                                                }
                                                disabled={
                                                    checklist._count?.shifts > 0
                                                }
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create Checklist Dialog */}
            <Dialog
                open={openCreateDialog}
                onClose={handleCloseCreateDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Create New Checklist</DialogTitle>
                <DialogContent>
                    <ChecklistForm onClose={handleCloseCreateDialog} />
                </DialogContent>
            </Dialog>

            {/* Edit Checklist Dialog */}
            <Dialog
                open={openEditDialog}
                onClose={handleCloseEditDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Edit Checklist</DialogTitle>
                <DialogContent>
                    {selectedChecklist && (
                        <ChecklistForm
                            checklist={selectedChecklist}
                            onClose={handleCloseEditDialog}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* View Checklist Details Dialog */}
            <Dialog
                open={openDetailDialog}
                onClose={handleCloseDetailDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Checklist Details</DialogTitle>
                <DialogContent>
                    {selectedChecklist && (
                        <ChecklistDetail
                            checklistId={selectedChecklist.id}
                            onClose={handleCloseDetailDialog}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
                <DialogTitle>Delete Checklist</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete the checklist &quot;
                        {selectedChecklist?.name}&quot;?
                        {selectedChecklist?._count?.shifts > 0 && (
                            <Box sx={{ color: 'error.main', mt: 1 }}>
                                This checklist is attached to{' '}
                                {selectedChecklist._count.shifts} shifts and
                                cannot be deleted.
                            </Box>
                        )}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        disabled={selectedChecklist?._count?.shifts > 0}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

'use client';

import React, { useState } from 'react';
import {
    Box,
    Button,
    Container,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Add, Close, Delete, Edit, FolderOutlined } from '@mui/icons-material';
import { useDialogs } from '@toolpad/core';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import { useAuthQuery } from '@/queries/users';
import {
    useDepartmentsQuery,
    useDepartmentDeleteMutation,
} from '@/queries/departments';
import DepartmentForm from '@/components/departments/DepartmentForm';

export default function DepartmentsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [editDepartmentId, setEditDepartmentId] = useState<string | null>(null);

    const notifications = useNotifications();
    const dialogs = useDialogs();

    // Get user role to determine if they can create/edit/delete departments
    const { data: session } = useAuthQuery();
    const isAdmin =
        session?.user?.role === 'admin' || session?.user?.role === 'owner';

    // Fetch departments
    const {
        data: departmentsData,
        isLoading,
        refetch,
    } = useDepartmentsQuery({
        name: searchTerm.length > 2 ? searchTerm : undefined,
    });

    // Delete mutation
    const deleteMutation = useDepartmentDeleteMutation();

    // Handle edit department
    const handleEditDepartment = (departmentId: string) => {
        setEditDepartmentId(departmentId);
        setIsFormDialogOpen(true);
    };

    // Handle delete department
    const handleDeleteDepartment = async (departmentId: string) => {
        try {
            const confirmed = await dialogs.confirm({
                title: 'Delete Department',
                message:
                    'Are you sure you want to delete this department? This action cannot be undone.',
                confirmText: 'Delete',
                cancelText: 'Cancel',
            } as any);

            if (confirmed) {
                await deleteMutation.mutateAsync({ id: departmentId });
                notifications.show('Department deleted successfully', {
                    severity: 'success',
                    autoHideDuration: 3000,
                });
                refetch();
            }
        } catch (error: any) {
            notifications.show(error.message || 'Failed to delete department', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    };

    // Handle form submission
    const handleFormSubmit = () => {
        setIsFormDialogOpen(false);
        setEditDepartmentId(null);
        refetch();
    };

    return (
        <Container maxWidth="lg">
            <Stack spacing={3}>
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Typography variant="h4">Departments</Typography>
                    {isAdmin && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<Add />}
                            onClick={() => {
                                setEditDepartmentId(null);
                                setIsFormDialogOpen(true);
                            }}
                        >
                            Add Department
                        </Button>
                    )}
                </Box>

                <Paper elevation={0} sx={{ p: 2 }}>
                    <TextField
                        fullWidth
                        label="Search Departments"
                        variant="outlined"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name..."
                        sx={{ mb: 2 }}
                    />

                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell>Color</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            align="center"
                                        >
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : departmentsData?.departments &&
                                  departmentsData.departments.length > 0 ? (
                                    departmentsData.departments.map(
                                        (department) => (
                                            <TableRow key={department.id}>
                                                <TableCell>
                                                    <Box
                                                        display="flex"
                                                        alignItems="center"
                                                    >
                                                        <FolderOutlined
                                                            sx={{
                                                                mr: 1,
                                                                color: department.color || 'inherit',
                                                            }}
                                                        />
                                                        {department.name}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    {department.description || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {department.color ? (
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                width: 24,
                                                                height: 24,
                                                                backgroundColor: department.color,
                                                                display: 'inline-block',
                                                                borderRadius: '50%',
                                                            }}
                                                        />
                                                    ) : (
                                                        '-'
                                                    )}
                                                </TableCell>
                                                <TableCell width={134}>
                                                    {isAdmin && (
                                                        <>
                                                            <IconButton
                                                                onClick={() =>
                                                                    handleEditDepartment(
                                                                        department.id
                                                                    )
                                                                }
                                                                size="small"
                                                            >
                                                                <Edit />
                                                            </IconButton>
                                                            <IconButton
                                                                onClick={() =>
                                                                    handleDeleteDepartment(
                                                                        department.id
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
                                        )
                                    )
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            align="center"
                                        >
                                            No departments found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Stack>

            {/* Create/Edit Department Dialog */}
            {isFormDialogOpen && (
                <Dialog
                    fullWidth={true}
                    maxWidth="md"
                    open={isFormDialogOpen}
                    onClose={() => {
                        setIsFormDialogOpen(false);
                        setEditDepartmentId(null);
                    }}
                >
                    <DialogTitle>
                        <Box display="flex" alignItems="center">
                            <Box flexGrow={1}>
                                {editDepartmentId
                                    ? 'Edit Department'
                                    : 'Create New Department'}
                            </Box>
                            <Box>
                                <IconButton
                                    onClick={() => {
                                        setIsFormDialogOpen(false);
                                        setEditDepartmentId(null);
                                    }}
                                >
                                    <Close />
                                </IconButton>
                            </Box>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        <DepartmentForm
                            departmentId={editDepartmentId!}
                            onSubmit={handleFormSubmit}
                            onCancel={() => {
                                setIsFormDialogOpen(false);
                                setEditDepartmentId(null);
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </Container>
    );
}
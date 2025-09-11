import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Divider,
    Alert,
    Grid,
    Paper,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import { trpc } from '@/lib/trpc/client';
import DraggableChecklistItems from './DraggableChecklistItems';
import ChecklistItemForm from './ChecklistItemForm';

// Define form validation schema
const checklistFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
});

type ChecklistFormProps = {
    checklist?: any;
    onClose: () => void;
};

export default function ChecklistForm({
    checklist,
    onClose,
}: ChecklistFormProps) {
    const isEditing = !!checklist;
    const [items, setItems] = useState<any[]>([]);
    const [showItemForm, setShowItemForm] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const notifications = useNotifications();

    // Setup form
    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm({
        resolver: zodResolver(checklistFormSchema),
        defaultValues: {
            name: checklist?.name || '',
            description: checklist?.description || '',
        },
    });

    // Fetch checklist details if editing
    const { data: checklistDetails, isLoading } = trpc.checklists.get.useQuery(
        { id: checklist?.id || '' },
        { enabled: isEditing }
    );

    // Mutations
    const createChecklistMutation = trpc.checklists.create.useMutation({
        onSuccess: () => {
            notifications.show('Checklist created successfully', { severity: 'success', autoHideDuration: 3000 });
            onClose();
        },
        onError: (error) => {
            notifications.show(`Error creating checklist: ${error.message}`, { severity: 'error', autoHideDuration: 3000 });
        },
    });

    const updateChecklistMutation = trpc.checklists.update.useMutation({
        onSuccess: () => {
            notifications.show('Checklist updated successfully', { severity: 'success', autoHideDuration: 3000 });
            onClose();
        },
        onError: (error) => {
            notifications.show(`Error updating checklist: ${error.message}`, { severity: 'error', autoHideDuration: 3000 });
        },
    });

    const addItemMutation = trpc.checklists.addItem.useMutation({
        onSuccess: (newItem) => {
            setItems([...items, newItem]);
            setShowItemForm(false);
            setEditingItem(null);
            notifications.show('Item added successfully', { severity: 'success', autoHideDuration: 3000 });
        },
        onError: (error) => {
            notifications.show(`Error adding item: ${error.message}`, { severity: 'error', autoHideDuration: 3000 });
        },
    });

    const updateItemMutation = trpc.checklists.updateItem.useMutation({
        onSuccess: (updatedItem) => {
            setItems(
                items.map((item) =>
                    item.id === updatedItem.id ? updatedItem : item
                )
            );
            setShowItemForm(false);
            setEditingItem(null);
            notifications.show('Item updated successfully', { severity: 'success', autoHideDuration: 3000 });
        },
        onError: (error) => {
            notifications.show(`Error updating item: ${error.message}`, { severity: 'error', autoHideDuration: 3000 });
        },
    });

    const deleteItemMutation = trpc.checklists.deleteItem.useMutation({
        onSuccess: () => {
            notifications.show('Item deleted successfully', { severity: 'success', autoHideDuration: 3000 });
        },
        onError: (error) => {
            notifications.show(`Error deleting item: ${error.message}`, { severity: 'error', autoHideDuration: 3000 });
        },
    });

    const reorderItemsMutation = trpc.checklists.reorderItems.useMutation({
        onSuccess: () => {
            notifications.show('Items reordered successfully', { severity: 'success', autoHideDuration: 3000 });
        },
        onError: (error) => {
            notifications.show(`Error reordering items: ${error.message}`, { severity: 'error', autoHideDuration: 3000 });
        },
    });

    // Load checklist items when editing
    useEffect(() => {
        if (checklistDetails) {
            setItems(checklistDetails.items);
        }
    }, [checklistDetails]);

    // Form submission handler
    const onSubmit = (data: any) => {
        if (isEditing) {
            updateChecklistMutation.mutate({
                id: checklist.id,
                name: data.name,
                description: data.description,
            });
        } else {
            createChecklistMutation.mutate({
                name: data.name,
                description: data.description,
                items: items.map((item) => ({
                    name: item.name,
                    geoLocationEnabled: item.geoLocationEnabled,
                    commentsOption: item.commentsOption,
                    uploadOption: item.uploadOption,
                })),
            });
        }
    };

    // Item handlers
    const handleAddItem = (itemData: any) => {
        if (editingItem) {
            updateItemMutation.mutate({
                id: editingItem.id,
                name: itemData.name,
                geoLocationEnabled: itemData.geoLocationEnabled,
                commentsOption: itemData.commentsOption,
                uploadOption: itemData.uploadOption,
            });
        } else if (isEditing && checklist?.id) {
            addItemMutation.mutate({
                checklistId: checklist.id,
                name: itemData.name,
                geoLocationEnabled: itemData.geoLocationEnabled,
                commentsOption: itemData.commentsOption,
                uploadOption: itemData.uploadOption,
            });
        } else {
            // For new checklists, just add to local state
            setItems([
                ...items,
                {
                    id: `temp-${Date.now()}`,
                    name: itemData.name,
                    geoLocationEnabled: itemData.geoLocationEnabled,
                    commentsOption: itemData.commentsOption,
                    uploadOption: itemData.uploadOption,
                    order: items.length,
                },
            ]);
            setShowItemForm(false);
        }
    };

    const handleEditItem = (item: any) => {
        setEditingItem(item);
        setShowItemForm(true);
    };

    const handleDeleteItem = (item: any) => {
        if (isEditing && item.id && !item.id.startsWith('temp-')) {
            deleteItemMutation.mutate({ id: item.id });
            setItems(items.filter((i) => i.id !== item.id));
        } else {
            setItems(items.filter((i) => i.id !== item.id));
        }
    };

    const handleReorderItems = (reorderedItems: any[]) => {
        setItems(reorderedItems);

        if (isEditing && checklist?.id) {
            reorderItemsMutation.mutate({
                checklistId: checklist.id,
                itemIds: reorderedItems.map((item) => item.id),
            });
        }
    };

    const handleCancelItemForm = () => {
        setShowItemForm(false);
        setEditingItem(null);
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
                <Grid component="div" size={{xs: 12}}>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Checklist Name"
                                fullWidth
                                error={!!errors.name}
                                helperText={errors.name?.message}
                                required
                            />
                        )}
                    />
                </Grid>
                <Grid component="div" size={{xs: 12}}>
                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Description"
                                fullWidth
                                multiline
                                rows={2}
                                error={!!errors.description}
                                helperText={errors.description?.message}
                            />
                        )}
                    />
                </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Checklist Items
                </Typography>

                {items.length === 0 && !showItemForm && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        No items added yet. Add items to your checklist.
                    </Alert>
                )}

                {items.length > 0 && (
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <DraggableChecklistItems
                            items={items}
                            onReorder={handleReorderItems}
                            onEdit={handleEditItem}
                            onDelete={handleDeleteItem}
                        />
                    </Paper>
                )}

                {showItemForm ? (
                    <ChecklistItemForm
                        item={editingItem}
                        onSubmit={handleAddItem}
                        onCancel={handleCancelItemForm}
                    />
                ) : (
                    <Button
                        variant="outlined"
                        onClick={() => setShowItemForm(true)}
                        sx={{ mt: 1 }}
                    >
                        Add Item
                    </Button>
                )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button onClick={onClose} sx={{ mr: 1 }}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={
                        createChecklistMutation.isPending ||
                        updateChecklistMutation.isPending
                    }
                >
                    {isEditing ? 'Update Checklist' : 'Create Checklist'}
                </Button>
            </Box>
        </Box>
    );
}

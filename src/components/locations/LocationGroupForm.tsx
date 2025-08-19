'use client';

import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Container,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import {
    useLocationGroupCreateMutation,
    useLocationGroupsQuery,
    useLocationGroupUpdateMutation,
} from '@/queries/locations';
import { getTextColor } from '@/utils/colorUtils';
import { MuiColorInput } from 'mui-color-input';

// Predefined colors for the color picker
const PREDEFINED_COLORS = [
    '#3f51b5', // Indigo
    '#2196f3', // Blue
    '#03a9f4', // Light Blue
    '#00bcd4', // Cyan
    '#009688', // Teal
    '#4caf50', // Green
    '#8bc34a', // Light Green
    '#cddc39', // Lime
    '#ffeb3b', // Yellow
    '#ffc107', // Amber
    '#ff9800', // Orange
    '#ff5722', // Deep Orange
    '#f44336', // Red
    '#e91e63', // Pink
    '#9c27b0', // Purple
    '#673ab7', // Deep Purple
    '#795548', // Brown
    '#607d8b', // Blue Grey
];

// Type for the form data
type LocationGroupFormData = {
    name: string;
    color: string;
};

// Props for the LocationGroupForm component
type LocationGroupFormProps = {
    groupId?: string | null;
    onSubmit?: () => void;
    onCancel?: () => void;
};

export default function LocationGroupForm({
    groupId,
    onSubmit,
    onCancel,
}: LocationGroupFormProps) {
    const notifications = useNotifications();

    // Fetch group data if editing
    const { data: locationGroups } = useLocationGroupsQuery();
    const group = locationGroups?.find((g) => g.id === groupId);

    // Mutations for creating and updating location groups
    const createMutation = useLocationGroupCreateMutation();
    const updateMutation = useLocationGroupUpdateMutation();

    // Set up form with react-hook-form
    const {
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<LocationGroupFormData>({
        defaultValues: {
            name: '',
            color: PREDEFINED_COLORS[0],
        },
    });

    // Watch color for the preview
    const selectedColor = watch('color');

    // Initialize form with group data if editing
    useEffect(() => {
        if (group) {
            reset({
                name: group.name,
                color: group.color,
            });
        }
    }, [group, reset]);

    // Form submission handler
    const onFormSubmit = async (data: LocationGroupFormData) => {
        try {
            if (groupId) {
                // Update existing group
                await updateMutation.mutateAsync({
                    id: groupId,
                    ...data,
                });
                notifications.show('Group updated successfully', {
                    severity: 'success',
                    autoHideDuration: 3000,
                });
            } else {
                // Create new group
                await createMutation.mutateAsync(data);
                notifications.show('Group created successfully', {
                    severity: 'success',
                    autoHideDuration: 3000,
                });
            }

            // Call the onSubmit callback if provided
            if (onSubmit) {
                onSubmit();
            }
        } catch (error: any) {
            console.error('Error saving group:', error);
            notifications.show(error.message || 'Failed to save group', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    };

    return (
        <Container>
            <form onSubmit={handleSubmit(onFormSubmit)}>
                <Stack spacing={3}>
                    {/* Name */}
                    <Controller
                        name="name"
                        control={control}
                        rules={{ required: 'Name is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Group Name"
                                variant="outlined"
                                fullWidth
                                error={!!errors.name}
                                helperText={errors.name?.message}
                            />
                        )}
                    />

                    {/* Color Picker */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Color
                        </Typography>
                        <Controller
                            name="color"
                            control={control}
                            rules={{ required: 'Color is required' }}
                            render={({ field }) => (
                                <>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 1,
                                            mb: 2,
                                        }}
                                    >
                                        {PREDEFINED_COLORS.map((color) => (
                                            <Box
                                                key={color}
                                                onClick={() =>
                                                    field.onChange(color)
                                                }
                                                sx={{
                                                    width: 36,
                                                    height: 36,
                                                    backgroundColor: color,
                                                    borderRadius: '50%',
                                                    cursor: 'pointer',
                                                    border:
                                                        field.value === color
                                                            ? '2px solid black'
                                                            : 'none',
                                                    '&:hover': {
                                                        opacity: 0.8,
                                                    },
                                                }}
                                            />
                                        ))}
                                    </Box>

                                    {/* Custom color input */}
                                    <Box sx={{ mt: 2 }}>
                                        <MuiColorInput
                                            label="Custom Color"
                                            value={field.value}
                                            onChange={(newColor) => {
                                                field.onChange(newColor);
                                            }}
                                            format="hex"
                                            fullWidth
                                        />
                                    </Box>

                                    {/* Color preview */}
                                    <Box sx={{ mt: 2 }}>
                                        <Typography
                                            variant="subtitle2"
                                            gutterBottom
                                        >
                                            Preview
                                        </Typography>
                                        <Box
                                            sx={{
                                                p: 2,
                                                backgroundColor: field.value,
                                                color: getTextColor(
                                                    field.value
                                                ),
                                                borderRadius: 1,
                                                textAlign: 'center',
                                            }}
                                        >
                                            Sample Text
                                        </Box>
                                    </Box>
                                </>
                            )}
                        />
                    </Box>

                    {/* Form Actions */}
                    <Stack
                        direction="row"
                        spacing={2}
                        justifyContent="flex-end"
                    >
                        {onCancel && (
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={onCancel}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Saving...'
                                : groupId
                                  ? 'Update Group'
                                  : 'Create Group'}
                        </Button>
                    </Stack>
                </Stack>
            </form>
        </Container>
    );
}

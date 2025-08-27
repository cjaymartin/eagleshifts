'use client';

import React, { useEffect } from 'react';
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
    useDepartmentCreateMutation,
    useDepartmentQuery,
    useDepartmentUpdateMutation,
} from '@/queries/departments';
import { MuiColorInput } from 'mui-color-input';
import { getTextColor } from '@/utils/colorUtils';

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
type DepartmentFormData = {
    id?: string;
    name: string;
    description?: string;
    color?: string;
};

// Props for the DepartmentForm component
type DepartmentFormProps = {
    departmentId?: string;
    onSubmit?: (data: DepartmentFormData) => void;
    onCancel?: () => void;
};

export default function DepartmentForm({
    departmentId,
    onSubmit,
    onCancel,
}: DepartmentFormProps) {
    const notifications = useNotifications();

    // Fetch department data if editing
    const { data: department } = useDepartmentQuery(departmentId || '');

    // Mutations for creating and updating departments
    const createMutation = useDepartmentCreateMutation();
    const updateMutation = useDepartmentUpdateMutation();

    // Set up form with react-hook-form
    const {
        control,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
        reset,
        watch,
    } = useForm<DepartmentFormData>({
        defaultValues: {
            name: '',
            description: '',
            color: '#3f51b5', // Default color
        },
    });

    // Watch color for the color picker
    const color = watch('color');

    // Initialize form with department data if editing
    useEffect(() => {
        if (department) {
            reset({
                name: department.name,
                description: department.description || '',
                color: department.color || '#3f51b5',
            });
        }
    }, [department, reset]);

    // Form submission handler
    const onFormSubmit = async (data: DepartmentFormData) => {
        try {
            if (departmentId) {
                // Update existing department
                await updateMutation.mutateAsync({
                    id: departmentId,
                    ...data,
                });
                notifications.show('Department updated successfully', {
                    severity: 'success',
                    autoHideDuration: 3000,
                });
            } else {
                // Create new department
                const result = await createMutation.mutateAsync(data);
                notifications.show('Department created successfully', {
                    severity: 'success',
                    autoHideDuration: 3000,
                });

                // Return the created department ID if available
                if (result && result.id) {
                    data.id = result.id;
                }
            }

            // Call the onSubmit callback if provided
            if (onSubmit) {
                onSubmit(data);
            }
        } catch (error: any) {
            console.error('Error saving department:', error);
            notifications.show(error.message || 'Failed to save department', {
                severity: 'error',
            });
        }
    };

    return (
        <Container>
            <form onSubmit={handleSubmit(onFormSubmit)}>
                <Stack spacing={3}>
                    <Typography variant="h6">
                        {departmentId ? 'Edit Department' : 'Create New Department'}
                    </Typography>

                    {/* Name */}
                    <Controller
                        name="name"
                        control={control}
                        rules={{ required: 'Name is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Name"
                                variant="outlined"
                                fullWidth
                                error={!!errors.name}
                                helperText={errors.name?.message}
                            />
                        )}
                    />

                    {/* Description */}
                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Description (Optional)"
                                variant="outlined"
                                fullWidth
                                multiline
                                rows={3}
                                error={!!errors.description}
                                helperText={errors.description?.message}
                            />
                        )}
                    />

                    {/* Color Picker */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Color (Optional)
                        </Typography>
                        <Controller
                            name="color"
                            control={control}
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
                                : departmentId
                                  ? 'Update Department'
                                  : 'Create Department'}
                        </Button>
                    </Stack>
                </Stack>
            </form>
        </Container>
    );
}

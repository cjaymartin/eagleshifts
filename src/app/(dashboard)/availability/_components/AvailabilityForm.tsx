import React from 'react';
import {
    Button,
    Container,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';

// Extend dayjs with plugins
dayjs.extend(customParseFormat);
dayjs.extend(utc);
import { useForm, Controller } from 'react-hook-form';
import { useNotifications } from '@toolpad/core';
import { useAuthQuery, useTeamUsersQuery } from '@/queries/users';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/api/trpc/[trpc]';
import {
    useAvailabilityCreateMutation,
    useAvailabilityUpdateMutation,
    useAvailabilityDeleteMutation,
} from '@/queries/availability';

dayjs.extend(customParseFormat);

// Type for AvailabilityForm props
type AvailabilityFormProps = {
    isNew?: boolean;
    availabilityId?: string;
    availability?: inferRouterOutputs<AppRouter>['availability']['byId'] | null;
    onClose?: () => void;
    userId?: string;
    memberId?: string;
};

export default function AvailabilityForm(props: AvailabilityFormProps) {
    const {
        availabilityId,
        availability,
        isNew: propsIsNew,
        onClose,
        userId,
        memberId,
    } = props;
    const notifications = useNotifications();

    const defaultValues = {
        id: '',
        startDate: null,
        endDate: null,
        isAvailable: true,
        desc: '',
        memberId: memberId || '',
    };

    // Transform availability data to the format expected by the form
    const transformedAvailability = availability
        ? {
              ...availability,
              startDate: availability.startDate
                  ? dayjs.utc(availability.startDate, 'YYYY-MM-DD').toDate()
                  : null,
              endDate: availability.endDate
                  ? dayjs.utc(availability.endDate, 'YYYY-MM-DD').toDate()
                  : null,
          }
        : defaultValues;

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        setError,
    } = useForm({
        defaultValues: availability
            ? {
                  id: transformedAvailability.id,
                  startDate: transformedAvailability.startDate,
                  endDate: transformedAvailability.endDate,
                  isAvailable: transformedAvailability.isAvailable,
                  desc: transformedAvailability.desc,
                  memberId: transformedAvailability.memberId,
              }
            : defaultValues,
    });

    // Helper for setting form errors
    type FormError = {
        field: string;
        message: string;
    };

    // const setErrors = (errorList: FormError[]) => {
    //     errorList.forEach((err: any /*FormError*/) => {
    //         setError(err.field, {
    //             type: 'manual',
    //             message: err.message,
    //         });
    //     });
    // };

    const { data: session } = useAuthQuery();
    const user = session?.user;

    // Determine if this is a new availability entry based on props or availabilityId
    const isNew = propsIsNew ?? !availabilityId;
    const role = user?.role || 'member';
    const isAdmin = ['admin', 'owner'].includes(role);

    // Get mutations for creating, updating, and deleting availabilities
    const createMutation = useAvailabilityCreateMutation();
    const updateMutation = useAvailabilityUpdateMutation();
    const deleteMutation = useAvailabilityDeleteMutation();

    // Define form data type
    type AvailabilityFormData = {
        id?: string;
        startDate: Date | null;
        endDate: Date | null;
        isAvailable: boolean;
        desc: string;
        memberId?: string;
    };

    // Form submission handlers
    async function onNewFormSubmit(formData: AvailabilityFormData) {
        try {
            // Validate form data
            if (!formData.startDate) {
                setError('startDate', { message: 'Start date is required' });
                return;
            }
            if (!formData.endDate) {
                setError('endDate', { message: 'End date is required' });
                return;
            }

            // Format data for API using UTC to ensure consistent date handling
            const availabilityData = {
                startDate: dayjs.utc(formData.startDate).format('YYYY-MM-DD'),
                endDate: dayjs.utc(formData.endDate).format('YYYY-MM-DD'),
                desc: formData.desc || '',
                isAvailable: formData.isAvailable,
                memberId: formData.memberId || memberId || user?.memberId,
            };

            // Ensure memberId is provided
            if (!availabilityData.memberId) {
                notifications.show('Member ID is required', {
                    severity: 'error',
                    autoHideDuration: 3000,
                });
                return;
            }

            // Create availability
            await createMutation.mutateAsync(availabilityData as any);
            notifications.show('Availability created successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });

            // Close dialog
            if (onClose) {
                onClose();
            }
        } catch (error: any) {
            console.error('Error creating availability:', error);
            notifications.show('Failed to create availability', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    }

    async function onUpdateFormSubmit(formData: AvailabilityFormData) {
        try {
            if (!availabilityId) {
                notifications.show('Availability ID is required for updates', {
                    severity: 'error',
                    autoHideDuration: 3000,
                });
                return;
            }

            // Format data for API using UTC to ensure consistent date handling
            const availabilityData = {
                id: availabilityId,
                startDate: dayjs.utc(formData.startDate).format('YYYY-MM-DD'),
                endDate: dayjs.utc(formData.endDate).format('YYYY-MM-DD'),
                desc: formData.desc || '',
                isAvailable: formData.isAvailable,
            };

            // Update availability
            await updateMutation.mutateAsync(availabilityData);
            notifications.show('Availability updated successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });

            // Close dialog
            if (onClose) {
                onClose();
            }
        } catch (error: any) {
            console.error('Error updating availability:', error);
            notifications.show('Failed to update availability', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    }

    async function handleDelete() {
        try {
            if (!availabilityId) {
                notifications.show('Availability ID is required for deletion', {
                    severity: 'error',
                    autoHideDuration: 3000,
                });
                return;
            }

            // Delete availability
            await deleteMutation.mutateAsync({ id: availabilityId });
            notifications.show('Availability deleted successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });

            // Close dialog
            if (onClose) {
                onClose();
            }
        } catch (error: any) {
            console.error('Error deleting availability:', error);
            notifications.show('Failed to delete availability', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    }

    const onSubmit = handleSubmit(isNew ? onNewFormSubmit : onUpdateFormSubmit);

    return (
        <Container>
            <form onSubmit={onSubmit}>
                <Stack spacing={2}>
                    <Stack direction="row" spacing={2} sx={{ m: 2 }}>
                        <Controller
                            name="startDate"
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    label="Start Date"
                                    value={
                                        field.value
                                            ? dayjs.utc(field.value)
                                            : null
                                    }
                                    onChange={(date) =>
                                        field.onChange(
                                            date ? date.toDate() : null
                                        )
                                    }
                                    slotProps={{
                                        textField: {
                                            error: !!errors.startDate,
                                            helperText:
                                                errors.startDate?.message,
                                        },
                                    }}
                                />
                            )}
                        />
                        <Controller
                            name="endDate"
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    label="End Date"
                                    value={
                                        field.value
                                            ? dayjs.utc(field.value)
                                            : null
                                    }
                                    onChange={(date) =>
                                        field.onChange(
                                            date ? date.toDate() : null
                                        )
                                    }
                                    slotProps={{
                                        textField: {
                                            error: !!errors.endDate,
                                            helperText: errors.endDate?.message,
                                        },
                                    }}
                                />
                            )}
                        />
                    </Stack>

                    <Controller
                        name="isAvailable"
                        control={control}
                        render={({ field }) => (
                            <FormControl>
                                <FormLabel>
                                    Are you Available on these days?
                                </FormLabel>
                                <RadioGroup
                                    row={true}
                                    {...field}
                                    value={field.value ? true : false}
                                    onChange={(e) =>
                                        field.onChange(
                                            e.target.value === 'true'
                                        )
                                    }
                                >
                                    <FormControlLabel
                                        value={true}
                                        control={<Radio />}
                                        label="Available"
                                    />
                                    <FormControlLabel
                                        value={false}
                                        control={<Radio />}
                                        label="Unavailable"
                                    />
                                </RadioGroup>
                            </FormControl>
                        )}
                    />

                    <Controller
                        name="desc"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                multiline
                                rows={3}
                                label="Description"
                                variant="outlined"
                                error={!!errors.desc}
                                helperText={errors.desc?.message}
                            />
                        )}
                    />

                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="contained"
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Saving...'
                                : isNew
                                  ? 'Create'
                                  : 'Update'}
                        </Button>
                        {!isNew && isAdmin && (
                            <Button
                                variant="contained"
                                color="error"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                            >
                                Delete
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                    </Stack>
                </Stack>
            </form>
        </Container>
    );
}

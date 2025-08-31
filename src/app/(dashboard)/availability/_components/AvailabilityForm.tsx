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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DateTime, Settings } from 'luxon';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Set default timezone to UTC
Settings.defaultZone = 'UTC';

import { useForm, Controller } from 'react-hook-form';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import { useAuthQuery } from '@/queries/users';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/api/trpc/[trpc]';
import {
    useAvailabilityCreateMutation,
    useAvailabilityUpdateMutation,
    useAvailabilityDeleteMutation,
} from '@/queries/availability';

// Define form data type
type AvailabilityFormData = {
    id?: string;
    startDate: Date | null;
    endDate: Date | null;
    startTime: Date | null;
    endTime: Date | null;
    isAvailable: boolean;
    desc: string;
    memberId?: string;
};

// Create zod schema for form validation
const availabilityFormSchema = z
    .object({
        id: z.string().optional(),
        startDate: z.preprocess(
            (val) =>
                val === null || val === undefined || val === ''
                    ? undefined
                    : val,
            z.date({
                error: (issue) => {
                    if (issue.code === 'invalid_type') {
                        return 'Start date is required';
                    }
                },
            })
        ),
        endDate: z.preprocess(
            (val) =>
                val === null || val === undefined || val === ''
                    ? undefined
                    : val,
            z.date({
                error: (issue) => {
                    if (issue.code === 'invalid_type') {
                        return 'End date is required';
                    }
                },
            })
        ),
        startTime: z.date().nullable(),
        endTime: z.date().nullable(),
        isAvailable: z.boolean(),
        desc: z.string().default(''),
        memberId: z.string().optional(),
    })
    .refine(
        (data) => {
            // Skip validation if either date is missing
            if (!data.startDate || !data.endDate) return true;

            // Create datetime objects for comparison using native Date objects
            const startDateTime = new Date(data.startDate);
            if (data.startTime) {
                // Use Luxon to help with proper UTC handling
                const luxonStartTime = DateTime.fromJSDate(data.startTime);
                startDateTime.setHours(
                    luxonStartTime.hour,
                    luxonStartTime.minute
                );
            } else {
                startDateTime.setHours(0, 0, 0, 0); // Start of day
            }

            const endDateTime = new Date(data.endDate);
            if (data.endTime) {
                // Use Luxon to help with proper UTC handling
                const luxonEndTime = DateTime.fromJSDate(data.endTime);
                endDateTime.setHours(luxonEndTime.hour, luxonEndTime.minute);
            } else {
                endDateTime.setHours(23, 59, 59, 999); // End of day
            }

            // Validate that start datetime is before end datetime
            return startDateTime <= endDateTime;
        },
        {
            message: 'End date/time must be after start date/time',
            path: ['endDate'], // Show error on the endDate field
        }
    );

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
        memberId,
    } = props;
    const notifications = useNotifications();

    const defaultValues = {
        id: '',
        startDate: null,
        endDate: null,
        startTime: null,
        endTime: null,
        isAvailable: true,
        desc: '',
        memberId: memberId || '',
    };

    // Transform availability data to the format expected by the form
    const transformedAvailability = availability
        ? {
              ...availability,
              startDate: availability.startDate
                  ? DateTime.fromISO(availability.startDate.toString())
                        .toUTC()
                        .startOf('day')
                        .toJSDate() // Convert to native Date
                  : null,
              endDate: availability.endDate
                  ? DateTime.fromISO(availability.endDate.toString())
                        .toUTC()
                        .startOf('day')
                        .toJSDate() // Convert to native Date
                  : null,
              // For startTime and endTime, convert from 4-digit integers to Date objects
              // Only show time if it's not the default value (0 for startTime, 2359 for endTime)
              startTime:
                  availability.startTime && availability.startTime !== 0
                      ? DateTime.now()
                            .set({
                                hour: Math.floor(availability.startTime / 100),
                                minute: availability.startTime % 100,
                            })
                            .toJSDate()
                      : null,
              endTime:
                  availability.endTime && availability.endTime !== 2359
                      ? DateTime.now()
                            .set({
                                hour: Math.floor(availability.endTime / 100),
                                minute: availability.endTime % 100,
                            })
                            .toJSDate()
                      : null,
          }
        : defaultValues;

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<AvailabilityFormData>({
        resolver: zodResolver(availabilityFormSchema) as any,
        defaultValues: availability
            ? {
                  id: transformedAvailability.id,
                  startDate: transformedAvailability.startDate,
                  endDate: transformedAvailability.endDate,
                  startTime: transformedAvailability.startTime,
                  endTime: transformedAvailability.endTime,
                  isAvailable: transformedAvailability.isAvailable,
                  desc: transformedAvailability.desc,
                  memberId: transformedAvailability.memberId,
              }
            : defaultValues,
    });

    const { data: session } = useAuthQuery();
    const user = session?.user;

    // Determine if this is a new availability entry based on props, availabilityId, or availability.id
    const isNew = propsIsNew ?? (!availabilityId && !availability?.id);
    const role = user?.role || 'member';
    const isAdmin = ['admin', 'owner'].includes(role);

    // Get mutations for creating, updating, and deleting availabilities
    const createMutation = useAvailabilityCreateMutation();
    const updateMutation = useAvailabilityUpdateMutation();
    const deleteMutation = useAvailabilityDeleteMutation();

    // Form submission handlers
    async function onNewFormSubmit(formData: AvailabilityFormData) {
        try {
            // Convert time selections to 4-digit integers (e.g., 0600 for 6:00 AM)
            const startTimeInt = formData.startTime
                ? formData.startTime.getHours() * 100 +
                  formData.startTime.getMinutes()
                : 0;

            const endTimeInt = formData.endTime
                ? formData.endTime.getHours() * 100 +
                  formData.endTime.getMinutes()
                : 2359;

            const availabilityData = {
                startDate: formData.startDate, // Already a native Date object
                endDate: formData.endDate, // Already a native Date object
                startTime: startTimeInt,
                endTime: endTimeInt,
                desc: formData.desc || '',
                isAvailable: formData.isAvailable,
                memberId: formData.memberId || memberId || user?.memberId,
            };

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

            // Convert time selections to 4-digit integers (e.g., 0600 for 6:00 AM)
            const startTimeInt = formData.startTime
                ? formData.startTime.getHours() * 100 +
                  formData.startTime.getMinutes()
                : 0;

            const endTimeInt = formData.endTime
                ? formData.endTime.getHours() * 100 +
                  formData.endTime.getMinutes()
                : 2359;

            const availabilityData = {
                id: availabilityId,
                startDate: formData.startDate, // Already a native Date object
                endDate: formData.endDate, // Already a native Date object
                startTime: startTimeInt,
                endTime: endTimeInt,
                desc: formData.desc || '',
                isAvailable: formData.isAvailable,
            };

            // Update availability
            await updateMutation.mutateAsync(availabilityData as any);
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

    const onSubmit = handleSubmit(
        (isNew ? onNewFormSubmit : onUpdateFormSubmit) as any
    );

    return (
        <Container>
            <form onSubmit={onSubmit}>
                <Stack spacing={2}>
                    <LocalizationProvider dateAdapter={AdapterLuxon}>
                        {/* Date fields */}
                        <Stack direction="row" spacing={2}>
                            <Controller
                                name="startDate"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        label="Start Date"
                                        value={
                                            field.value
                                                ? DateTime.fromJSDate(
                                                      field.value
                                                  ).toUTC()
                                                : null
                                        }
                                        onChange={(date) => {
                                            // Convert Luxon DateTime to native Date if needed
                                            if (date && 'toJSDate' in date) {
                                                field.onChange(
                                                    (date as any).toJSDate()
                                                );
                                            } else {
                                                field.onChange(date);
                                            }
                                        }}
                                        slotProps={{
                                            textField: {
                                                error: !!errors.startDate,
                                                helperText:
                                                    errors.startDate?.message,
                                                fullWidth: true,
                                            },
                                        }}
                                    />
                                )}
                            />

                            <Controller
                                name="startTime"
                                control={control}
                                render={({ field }) => (
                                    <TimePicker
                                        label="Start Time (optional)"
                                        value={
                                            field.value
                                                ? DateTime.fromJSDate(
                                                      field.value
                                                  ).toUTC()
                                                : null
                                        }
                                        onChange={(time) => {
                                            // Convert Luxon DateTime to native Date if needed
                                            if (time && 'toJSDate' in time) {
                                                field.onChange(
                                                    (time as any).toJSDate()
                                                );
                                            } else {
                                                field.onChange(time);
                                            }
                                        }}
                                        slotProps={{
                                            textField: {
                                                error: !!errors.startTime,
                                                helperText:
                                                    errors.startTime?.message,
                                                fullWidth: true,
                                            },
                                        }}
                                    />
                                )}
                            />
                        </Stack>

                        {/* Time fields */}
                        <Stack direction="row" spacing={2}>
                            <Controller
                                name="endDate"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        label="End Date"
                                        value={
                                            field.value
                                                ? DateTime.fromJSDate(
                                                      field.value
                                                  ).toUTC()
                                                : null
                                        }
                                        onChange={(date) => {
                                            // Convert Luxon DateTime to native Date if needed
                                            if (date && 'toJSDate' in date) {
                                                field.onChange(
                                                    (date as any).toJSDate()
                                                );
                                            } else {
                                                field.onChange(date);
                                            }
                                        }}
                                        slotProps={{
                                            textField: {
                                                error: !!errors.endDate,
                                                helperText:
                                                    errors.endDate?.message,
                                                fullWidth: true,
                                            },
                                        }}
                                    />
                                )}
                            />
                            <Controller
                                name="endTime"
                                control={control}
                                render={({ field }) => (
                                    <TimePicker
                                        label="End Time (optional)"
                                        value={
                                            field.value
                                                ? DateTime.fromJSDate(
                                                      field.value
                                                  ).toUTC()
                                                : null
                                        }
                                        onChange={(time) => {
                                            // Convert Luxon DateTime to native Date if needed
                                            if (time && 'toJSDate' in time) {
                                                field.onChange(
                                                    (time as any).toJSDate()
                                                );
                                            } else {
                                                field.onChange(time);
                                            }
                                        }}
                                        slotProps={{
                                            textField: {
                                                error: !!errors.endTime,
                                                helperText:
                                                    errors.endTime?.message,
                                                fullWidth: true,
                                            },
                                        }}
                                    />
                                )}
                            />
                        </Stack>
                    </LocalizationProvider>

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

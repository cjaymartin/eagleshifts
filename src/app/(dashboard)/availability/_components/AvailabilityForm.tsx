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
    Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { MobileTimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { combineDateTime } from '@/utils/dateUtils';

// Extend dayjs with plugins
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
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
import { useUserProfileQuery } from '@/queries/team';
import { useBusinessProfileQuery } from '@/queries/team';

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

    // Get user profile to access timezone
    const { data: userProfile } = useUserProfileQuery();
    // Get business profile for fallback timezone
    const { data: businessProfile } = useBusinessProfileQuery();

    // Get the member's timezone or fall back to business timezone
    const memberTimezone =
        userProfile?.timeZone || businessProfile?.timezone || 'UTC';

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
              // For startDate and endDate, use the date fields directly without timezone conversion
              startDate: availability.startDate
                  ? dayjs.utc(availability.startDate).startOf('day').toDate()
                  : null,
              endDate: availability.endDate
                  ? dayjs.utc(availability.endDate).startOf('day').toDate()
                  : null,
              // For startTime and endTime, convert from 4-digit integers to Date objects
              // Only show time if it's not the default value (0 for startTime, 2359 for endTime)
              startTime:
                  availability.startTime && availability.startTime !== 0
                      ? dayjs()
                            .hour(Math.floor(availability.startTime / 100))
                            .minute(availability.startTime % 100)
                            .toDate()
                      : null,
              endTime:
                  availability.endTime && availability.endTime !== 2359
                      ? dayjs()
                            .hour(Math.floor(availability.endTime / 100))
                            .minute(availability.endTime % 100)
                            .toDate()
                      : null,
          }
        : defaultValues;

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        setError,
        getValues,
    } = useForm({
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

    // Determine if this is a new availability entry based on props, availabilityId, or availability.id
    const isNew = propsIsNew ?? (!availabilityId && !availability?.id);
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
        startTime: Date | null;
        endTime: Date | null;
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

            // Validate that startDate+startTime is before endDate+endTime - use UTC to avoid timezone issues
            const startDateTime = formData.startTime
                ? dayjs.utc(formData.startDate)
                      .hour(dayjs(formData.startTime).hour())
                      .minute(dayjs(formData.startTime).minute())
                : dayjs.utc(formData.startDate).startOf('day');

            const endDateTime = formData.endTime
                ? dayjs.utc(formData.endDate)
                      .hour(dayjs(formData.endTime).hour())
                      .minute(dayjs(formData.endTime).minute())
                : dayjs.utc(formData.endDate).endOf('day');

            if (startDateTime.isAfter(endDateTime)) {
                setError('endDate', {
                    message: 'End date/time must be after start date/time',
                });
                return;
            }

            // Use the member's timezone or fall back to business timezone
            const timezone = memberTimezone;

            // Create datetime strings by combining the date with the time
            // Use centralized date utility to combine date and time, convert to UTC
            const startTimeISO = combineDateTime(
                formData.startDate,
                formData.startTime
                    ? dayjs(formData.startTime).format('HH:mm')
                    : '00:00',
                {
                    organizationTimezone: timezone,
                    fallbackTimezone: 'UTC',
                }
            );

            const endTimeISO = combineDateTime(
                formData.endDate,
                formData.endTime
                    ? dayjs(formData.endTime).format('HH:mm')
                    : '23:59',
                {
                    organizationTimezone: timezone,
                    fallbackTimezone: 'UTC',
                }
            );

            // Convert time selections to 4-digit integers (e.g., 0600 for 6:00 AM)
            const startTimeInt = formData.startTime
                ? parseInt(dayjs(formData.startTime).format('HHmm'))
                : 0;

            const endTimeInt = formData.endTime
                ? parseInt(dayjs(formData.endTime).format('HHmm'))
                : 2359;

            // Format data for API - ensure dates are in UTC with no time component
            const utcStartDate = dayjs.utc(formData.startDate).startOf('day');
            const utcEndDate = dayjs.utc(formData.endDate).startOf('day');

            const availabilityData = {
                startDate: utcStartDate.toDate(),
                endDate: utcEndDate.toDate(),
                startTime: startTimeInt,
                endTime: endTimeInt,
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

            // Validate form data
            if (!formData.startDate) {
                setError('startDate', { message: 'Start date is required' });
                return;
            }

            if (!formData.endDate) {
                setError('endDate', { message: 'End date is required' });
                return;
            }

            // Validate that startDate+startTime is before endDate+endTime - use UTC to avoid timezone issues
            const startDateTime = formData.startTime
                ? dayjs.utc(formData.startDate)
                      .hour(dayjs(formData.startTime).hour())
                      .minute(dayjs(formData.startTime).minute())
                : dayjs.utc(formData.startDate).startOf('day');

            const endDateTime = formData.endTime
                ? dayjs.utc(formData.endDate)
                      .hour(dayjs(formData.endTime).hour())
                      .minute(dayjs(formData.endTime).minute())
                : dayjs.utc(formData.endDate).endOf('day');

            if (startDateTime.isAfter(endDateTime)) {
                setError('endDate', {
                    message: 'End date/time must be after start date/time',
                });
                return;
            }

            // Use the member's timezone or fall back to business timezone
            const timezone = memberTimezone;

            // Create datetime strings by combining the date with the time
            // Use centralized date utility to combine date and time, convert to UTC
            const startTimeISO = combineDateTime(
                formData.startDate,
                formData.startTime
                    ? dayjs(formData.startTime).format('HH:mm')
                    : '00:00',
                {
                    organizationTimezone: timezone,
                    fallbackTimezone: 'UTC',
                }
            );

            const endTimeISO = combineDateTime(
                formData.endDate,
                formData.endTime
                    ? dayjs(formData.endTime).format('HH:mm')
                    : '23:59',
                {
                    organizationTimezone: timezone,
                    fallbackTimezone: 'UTC',
                }
            );

            // Convert time selections to 4-digit integers (e.g., 0600 for 6:00 AM)
            const startTimeInt = formData.startTime
                ? parseInt(dayjs(formData.startTime).format('HHmm'))
                : 0;

            const endTimeInt = formData.endTime
                ? parseInt(dayjs(formData.endTime).format('HHmm'))
                : 2359;

            // Format data for API - ensure dates are in UTC with no time component
            const utcStartDate = dayjs.utc(formData.startDate).startOf('day');
            const utcEndDate = dayjs.utc(formData.endDate).startOf('day');

            const availabilityData = {
                id: availabilityId,
                startDate: utcStartDate.toDate(),
                endDate: utcEndDate.toDate(),
                startTime: startTimeInt,
                endTime: endTimeInt,
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

    const onSubmit = handleSubmit(
        (isNew ? onNewFormSubmit : onUpdateFormSubmit) as any
    );

    return (
        <Container>
            <form onSubmit={onSubmit}>
                <Stack spacing={2}>
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
                                            fullWidth: true,
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
                            name="startTime"
                            control={control}
                            render={({ field }) => (
                                <MobileTimePicker
                                    label="Start Time (optional)"
                                    value={
                                        field.value
                                            ? dayjs(field.value)
                                            : null
                                    }
                                    onChange={(date) =>
                                        field.onChange(
                                            date ? date.toDate() : null
                                        )
                                    }
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
                        <Controller
                            name="endTime"
                            control={control}
                            render={({ field }) => (
                                <MobileTimePicker
                                    label="End Time (optional)"
                                    value={
                                        field.value
                                            ? dayjs(field.value)
                                            : null
                                    }
                                    onChange={(date) =>
                                        field.onChange(
                                            date ? date.toDate() : null
                                        )
                                    }
                                    slotProps={{
                                        textField: {
                                            error: !!errors.endTime,
                                            helperText: errors.endTime?.message,
                                            fullWidth: true,
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

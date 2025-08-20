import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Container,
    Dialog,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { combineDateTime } from '@/utils/dateUtils';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { useDialogs } from '@toolpad/core';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import FormDatePicker from '@/components/form/FormDatePicker';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import AssignmentIcon from '@mui/icons-material/Assignment';
import {
    useAuthQuery,
    useTeamUsersLookupQuery,
    useTeamUsersQuery,
} from '@/queries/users';
import { useBusinessProfileQuery } from '@/queries/team';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/api/trpc/[trpc]';
import ShiftAssignmentTool from '@/app/(dashboard)/shifts/_components/ShiftAssignmentTool';
import ShiftUploads from '@/app/(dashboard)/shifts/_components/ShiftUploads';
import {
    useShiftCancelMutation,
    useShiftCreateMutation,
    useShiftUpdateMutation,
} from '@/queries/shifts';
import {
    useShiftRequestCreateMutation,
    useShiftRequestsListQuery,
} from '@/queries/requests';
import LocationAutocomplete from '@/components/form/LocationAutocomplete';
import LocationViewDialog from '@/components/locations/LocationViewDialog';
import LocationForm from '@/components/locations/LocationForm';
import { reset } from 'next/dist/lib/picocolors';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// Define form data type
type ShiftFormData = {
    id?: string;
    title: string;
    locationId: string | null;
    legacyLocation?: string;
    date: Date | null;
    startTime: Date | null;
    endTime: Date | null;
    slots: number;
    notes?: string;
    adminNotes?: string;
    assignments?: any[];
};

// Create zod schema for form validation
const shiftFormSchema = z
    .object({
        id: z.string().optional(),
        title: z
            .string({
                error: (issue) => {
                    if (issue.code === 'invalid_type') {
                        return 'Title is required';
                    }
                },
            })
            .min(1, 'Title is required'),
        locationId: z
            .string({
                error: (issue) => {
                    if (issue.code === 'invalid_type') {
                        return 'Location is required';
                    }
                },
            })
            .min(1, 'Location is required')
            .nonoptional(),
        legacyLocation: z.string().optional(),
        date: z.date({
            error: (issue) => {
                if (issue.code === 'invalid_type') {
                    return 'Date is required';
                }
            },
        }),
        startTime: z.date({
            error: (issue) => {
                if (issue.code === 'invalid_type') {
                    return 'Start time is required';
                }
            },
        }),
        endTime: z.date({
            error: (issue) => {
                if (issue.code === 'invalid_type') {
                    return 'End time is required';
                }
            },
        }),
        slots: z
            .number({
                error: (issue) => {
                    if (issue.code === 'invalid_type') {
                        return 'Slots is required';
                    }
                },
            })
            .min(1, 'At least one slot is required'),
        notes: z.string().optional(),
        adminNotes: z.string().optional(),
        assignments: z.array(z.any()).optional(),
    })
    .refine(
        (data) => {
            // Skip validation if either time is missing
            if (!data.startTime || !data.endTime) return true;

            // Create datetime objects for comparison
            const startDateTime = dayjs(data.startTime);
            const endDateTime = dayjs(data.endTime);

            // Validate that start time is before end time
            return !startDateTime.isAfter(endDateTime);
        },
        {
            message: 'End time must be after start time',
            path: ['endTime'], // Show error on the endTime field
        }
    );

// Helper function to close the dialog
const useShiftDialogHelpers = () => ({
    reset: () => {
        // In a real implementation, this would close the dialog
    },
});

// Type for ShiftForm props
type ShiftFormProps = {
    isNew?: boolean;
    isDuplicate?: boolean;
    shiftId?: string;
    shift?: inferRouterOutputs<AppRouter>['shifts']['byId'] | null;
    onClose?: () => void;
};

export default function ShiftForm(props: ShiftFormProps) {
    console.log('ShiftForm render', {
        props,
        timestamp: new Date().toISOString(),
    });

    const { reset: handleClose } = useShiftDialogHelpers();
    const {
        shiftId,
        shift,
        isNew: propsIsNew,
        isDuplicate: propsDuplicate,
        onClose,
    } = props;
    const notifications = useNotifications();

    const [isCancelled, setIsCancelled] = useState(shift?.isCancelled);
    useEffect(() => {
        setIsCancelled(shift?.isCancelled);
    }, [shift?.isCancelled]);

    const defaultValues = {
        id: '',
        title: '',
        locationId: null,
        legacyLocation: '',
        date: null,
        startTime: null,
        endTime: null,
        slots: 1,
        notes: '',
        adminNotes: '',
        assignments: [],
    };

    // State for location dialogs
    const [viewLocationId, setViewLocationId] = useState<string | null>(null);
    const [isLocationViewOpen, setIsLocationViewOpen] = useState(false);
    const [isLocationFormOpen, setIsLocationFormOpen] = useState(false);
    const dialogs = useDialogs();

    // Get team users data to map from memberId to userId
    const { data: teamUsers = [] } = useTeamUsersQuery();

    // Get organization profile data
    const { data: businessProfile } = useBusinessProfileQuery();

    // Transform shiftAssignments to the format expected by the form
    const transformedShift = shift
        ? {
              ...shift,
              // Parse dates from ISO format
              date: shift.startTime
                  ? dayjs(shift.startTime)
                        .tz(
                            shift.timezone || businessProfile?.timezone || 'UTC'
                        )
                        .startOf('day')
                        .toDate()
                  : null,
              startTime:
                  (!propsIsNew || propsDuplicate) && shift.startTime
                      ? dayjs(shift.startTime)
                            .tz(
                                shift.timezone ||
                                    businessProfile?.timezone ||
                                    'UTC'
                            )
                            .toDate()
                      : null,
              endTime:
                  (!propsIsNew || propsDuplicate) && shift.endTime
                      ? dayjs(shift.endTime)
                            .tz(
                                shift.timezone ||
                                    businessProfile?.timezone ||
                                    'UTC'
                            )
                            .toDate()
                      : null,
              // Handle location fields
              locationId: shift.locationId || null,
              legacyLocation: shift.locationId
                  ? ''
                  : shift.legacyLocation || shift.location || '',
              assignments:
                  shift.shiftAssignments?.map((assignment) => {
                      return {
                          memberId: assignment.memberId,
                          outcome: assignment.outcome,
                          reason: assignment.reason || '',
                      };
                  }) || [],
          }
        : defaultValues;

    const methods = useForm<ShiftFormData>({
        resolver: zodResolver(shiftFormSchema) as any,
        defaultValues: transformedShift as any,
    });
    const {
        reset,
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        getValues,
        setError,
        setValue,
    } = methods;
    //const [date,setDate] = useState<Date | null>(null);

    console.log('ShiftForm after useForm', {
        formState: { errors, isSubmitting },
        timestamp: new Date().toISOString(),
    });

    // // Helper for setting form errors
    // const setErrors = (errorList: any) => {
    //     errorList.forEach((err: any) => {
    //         setError(err.field, {
    //             type: 'manual',
    //             message: err.message,
    //         });
    //     });
    // };

    const { data: session } = useAuthQuery();
    const user = session?.user;
    const memberId = user?.memberId;

    // Determine if this is a new shift based on props, shiftId, or shift.id
    const isNew = propsIsNew ?? (!shiftId && !shift?.id);

    console.log({ isNew, propsIsNew, shiftId, bah: shift?.id });
    const role = user?.role || 'member';
    const isAdmin = ['admin', 'owner'].includes(role);

    // Get mutations for creating and updating shifts
    const createMutation = useShiftCreateMutation();
    const updateMutation = useShiftUpdateMutation();
    const setCancelledMutations = useShiftCancelMutation();

    // Form submission handlers
    async function onNewFormSubmit(formData: ShiftFormData) {
        try {
            console.log({ formData });

            // Use the shift's timezone, or organization's timezone, or default to UTC
            const timezone =
                shift?.timezone || businessProfile?.timezone || 'UTC';

            // Create datetime strings by combining the date with the time
            // We need to work with the local time directly to avoid double timezone conversion
            // Use centralized date utility to combine date and time, convert to UTC
            const startTimeISO = combineDateTime(
                formData.date!,
                dayjs(formData.startTime).format('HH:mm'),
                {
                    organizationTimezone: timezone,
                    fallbackTimezone: 'America/New_York',
                }
            );

            const endTimeISO = combineDateTime(
                formData.date!,
                dayjs(formData.endTime).format('HH:mm'),
                {
                    organizationTimezone: timezone,
                    fallbackTimezone: 'America/New_York',
                }
            );

            // Format data for API - note that we're not including the date field
            const shiftData = {
                title: formData.title,
                startTime: startTimeISO,
                endTime: endTimeISO,
                slots: Number(formData.slots),
                timezone: timezone,
                locationId: formData.locationId!,
                legacyLocation: formData.locationId
                    ? undefined
                    : formData.legacyLocation,
                notes: formData.notes,
                adminNotes: formData.adminNotes,
                assignments: formData.assignments || [],
            };

            // Create shift
            await createMutation.mutateAsync(shiftData);
            notifications.show('Shift created successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });

            // Close dialog
            if (onClose) {
                onClose();
            } else {
                handleClose();
            }
        } catch (error: any) {
            console.error('Error creating shift:', error);
            notifications.show('Failed to create shift', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    }

    async function handleCancelShiftButtonClicked() {
        if (!shift) return;

        const shouldCancel = !isCancelled;

        const confirmed = await dialogs.confirm(
            'Are you sure? Anyone assigned to this shift will be notified!',
            {
                okText: 'Yes',
                cancelText: 'Cancel',
            }
        );

        if (confirmed) {
            await setCancelledMutations.mutateAsync({
                id: shift.id,
                isCancelled: shouldCancel,
                shouldNotify: true,
            });
            notifications.show('Shift cancellation updated successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });
            setIsCancelled(shouldCancel);
        }
    }

    async function onUpdateFormSubmit(formData: ShiftFormData) {
        try {
            if (!shiftId) {
                notifications.show('Shift ID is required for updates', {
                    severity: 'error',
                    autoHideDuration: 3000,
                });
                return;
            }

            const timezone =
                shift?.timezone || businessProfile?.timezone || 'UTC';

            // Use centralized date utility to combine date and time, convert to UTC
            const startTimeISO = combineDateTime(
                formData.date!,
                dayjs(formData.startTime).format('HH:mm'),
                {
                    organizationTimezone: timezone,
                    fallbackTimezone: 'America/New_York',
                }
            );

            const endTimeISO = combineDateTime(
                formData.date!,
                dayjs(formData.endTime).format('HH:mm'),
                {
                    organizationTimezone: timezone,
                    fallbackTimezone: 'America/New_York',
                }
            );

            const shiftData = {
                id: shiftId,
                title: formData.title,
                startTime: startTimeISO,
                endTime: endTimeISO,
                slots: Number(formData.slots),
                timezone: timezone,
                locationId: formData.locationId!,
                legacyLocation: formData.locationId
                    ? undefined
                    : formData.legacyLocation,
                notes: formData.notes,
                adminNotes: formData.adminNotes,
                assignments: formData.assignments || [],
            };

            await updateMutation.mutateAsync(shiftData);
            notifications.show('Shift updated successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });

            if (onClose) {
                onClose();
            } else {
                handleClose();
            }
        } catch (error: any) {
            console.error('Error updating shift:', error);
            notifications.show('Failed to update shift', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    }

    const onSubmit = handleSubmit(isNew ? onNewFormSubmit : onUpdateFormSubmit);

    const { data: teamMembers = [] } = useTeamUsersQuery();
    const { data: userLookup } = useTeamUsersLookupQuery();

    // Check if user is assigned to this shift
    const assignments = getValues('assignments') || [];
    const isAssigned = memberId
        ? assignments.some((a: any) => a.memberId === memberId)
        : false;

    const slots = getValues('slots') || 1;
    const hasAvailableSlots =
        assignments.length === 0 || assignments.length < Number(slots);

    // Get the user's shift requests
    const { data: userRequests = [] } = useShiftRequestsListQuery();

    // Check if the user has already requested this shift
    const hasRequests = shiftId
        ? userRequests.some(
              (request) =>
                  request.shiftId === shiftId && request.status === 'pending'
          )
        : false;

    // Check if user has a rejected request for this shift
    const hasRejectedRequest = shiftId
        ? userRequests.some(
              (request) =>
                  request.shiftId === shiftId && request.status === 'rejected'
          )
        : false;

    // Create shift request mutation
    const createRequestMutation = useShiftRequestCreateMutation();

    async function handleShiftRequest() {
        if (!shiftId) {
            notifications.show('Shift ID is required', {
                severity: 'error',
                autoHideDuration: 3000,
            });
            return;
        }

        try {
            await createRequestMutation.mutateAsync({
                shiftId,
                reason: '',
            });

            notifications.show('Shift request submitted', {
                severity: 'success',
                autoHideDuration: 3000,
            });
        } catch (error: any) {
            console.error('Error requesting shift:', error);
            notifications.show(error.message || 'Failed to request shift', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    }

    return (
        <>
            <FormProvider {...methods}>
                <Container>
                    <form onSubmit={onSubmit}>
                        {isCancelled && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                This shift has been cancelled.
                            </Alert>
                        )}

                        <Stack spacing={2}>
                            {!isAdmin && isAssigned && (
                                <Container>
                                    You are assigned to this shift!
                                </Container>
                            )}
                            {!isAdmin &&
                                !isAssigned &&
                                hasAvailableSlots &&
                                hasRequests && (
                                    <Container>
                                        You have already requested to be
                                        considered for this shift.
                                    </Container>
                                )}
                            {!isAdmin &&
                                !isAssigned &&
                                hasAvailableSlots &&
                                !hasRequests &&
                                !hasRejectedRequest && (
                                    <Container>
                                        <Button onClick={handleShiftRequest}>
                                            <AssignmentIcon />
                                            Click here to request this shift!
                                        </Button>
                                    </Container>
                                )}

                            {/* Show nothing (leave area blank) for rejected requests */}
                            <Controller
                                name="title"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        disabled={!isAdmin}
                                        label="Title"
                                        variant="outlined"
                                        error={!!errors.title}
                                        helperText={
                                            errors.title?.message as any
                                        }
                                    />
                                )}
                            />
                            {/* Location Autocomplete */}
                            <Controller
                                name="locationId"
                                control={control}
                                render={({ field }) => {
                                    console.log(
                                        'ShiftForm LocationAutocomplete Controller render',
                                        {
                                            fieldValue: field.value,
                                            timestamp: new Date().toISOString(),
                                            fieldRef: field,
                                        }
                                    );

                                    return (
                                        <LocationAutocomplete
                                            value={field.value}
                                            onChange={(locationId) => {
                                                console.log(
                                                    'ShiftForm LocationAutocomplete onChange',
                                                    {
                                                        locationId,
                                                        timestamp:
                                                            new Date().toISOString(),
                                                    }
                                                );
                                                field.onChange(locationId);
                                                // Clear legacy location when a location is selected
                                                if (locationId) {
                                                    setValue(
                                                        'legacyLocation',
                                                        ''
                                                    );
                                                }
                                            }}
                                            disabled={!isAdmin}
                                            error={!!errors.locationId}
                                            helperText={
                                                errors.locationId
                                                    ?.message as any
                                            }
                                            onCreateNew={() =>
                                                setIsLocationFormOpen(true)
                                            }
                                            onViewLocation={(locationId) => {
                                                setViewLocationId(locationId);
                                                setIsLocationViewOpen(true);
                                            }}
                                        />
                                    );
                                }}
                            />

                            {/* Location View Dialog */}
                            <LocationViewDialog
                                locationId={viewLocationId}
                                open={isLocationViewOpen}
                                onClose={() => setIsLocationViewOpen(false)}
                            />

                            <FormDatePicker
                                name="date"
                                label="Date"
                                disabled={!isAdmin}
                            />
                            {/*<Controller*/}
                            {/*    name="date"*/}
                            {/*    control={control}*/}
                            {/*    render={({ field }) => (*/}
                            {/*        <DatePicker*/}
                            {/*            {...field}*/}
                            {/*            disabled={!isAdmin}*/}
                            {/*            label="Date"*/}
                            {/*            value={*/}
                            {/*                field.value ? dayjs.utc(field.value) : null*/}
                            {/*            }*/}
                            {/*            onChange={(date) =>*/}
                            {/*                field.onChange(date ? date.toDate() : null)*/}
                            {/*            }*/}
                            {/*            slotProps={{*/}
                            {/*                textField: {*/}
                            {/*                    error: !!errors.date,*/}
                            {/*                    helperText: errors.date?.message as any,*/}
                            {/*                },*/}
                            {/*            }}*/}
                            {/*        />*/}
                            {/*    )}*/}
                            {/*/>*/}
                            <Controller
                                name="startTime"
                                control={control}
                                render={({ field }) => (
                                    <TimePicker
                                        disabled={!isAdmin}
                                        label="Start Time"
                                        value={
                                            field.value
                                                ? dayjs(field.value).tz(
                                                      shift?.timezone ||
                                                          businessProfile?.timezone ||
                                                          'UTC'
                                                  )
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
                                                helperText: errors.startTime
                                                    ?.message as any,
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
                                        {...field}
                                        label="End Time"
                                        disabled={!isAdmin}
                                        // Ensure value is a valid dayjs object or null
                                        value={
                                            field.value
                                                ? dayjs(field.value)
                                                : null
                                        }
                                        onChange={(date) =>
                                            // Pass a standard JS Date object or null back to the form
                                            field.onChange(
                                                date ? date.toDate() : null
                                            )
                                        }
                                        // Set to mobile view mode
                                        slotProps={{
                                            textField: {
                                                error: !!errors.endTime,
                                                helperText: errors.endTime
                                                    ?.message as any,
                                            },
                                        }}
                                    />
                                )}
                            />
                            <Grid container spacing={2} alignItems="center">
                                <Grid>
                                    <Typography variant="h6">
                                        {assignments?.length || 0}
                                    </Typography>
                                </Grid>
                                <Grid>
                                    <Typography variant="body1">of</Typography>
                                </Grid>
                                <Grid>
                                    <Controller
                                        name="slots"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                disabled={!isAdmin}
                                                label="Slots"
                                                variant="outlined"
                                                type="number"
                                                error={!!errors.slots}
                                                helperText={
                                                    errors.slots?.message as any
                                                }
                                                inputProps={{ min: 1 }}
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>

                            <Controller
                                name="assignments"
                                control={control}
                                render={({ field }) => (
                                    <ShiftAssignmentTool
                                        {...(field as any)}
                                        shift={shift as any}
                                        control={control}
                                        readOnly={!isAdmin}
                                    />
                                )}
                            />

                            {/* Uploads section */}
                            {shiftId && (isAdmin || isAssigned) && (
                                <ShiftUploads
                                    shiftId={shiftId}
                                    readOnly={!isAdmin && !isAssigned}
                                />
                            )}

                            <Controller
                                name="notes"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        multiline
                                        rows={3}
                                        disabled={!isAdmin}
                                        label="Notes"
                                        variant="outlined"
                                        error={!!errors.notes}
                                        helperText={
                                            errors.notes?.message as any
                                        }
                                    />
                                )}
                            />
                            {isAdmin && (
                                <Controller
                                    name="adminNotes"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            multiline
                                            rows={3}
                                            label="Admin Notes"
                                            variant="outlined"
                                            error={!!errors.adminNotes}
                                            helperText={
                                                errors.adminNotes
                                                    ?.message as any
                                            }
                                        />
                                    )}
                                />
                            )}

                            <Stack direction="row" spacing={2}>
                                {isAdmin && !isNew && (
                                    <Button
                                        variant="contained"
                                        type="button"
                                        color="secondary"
                                        disabled={isSubmitting}
                                        onClick={handleCancelShiftButtonClicked}
                                    >
                                        {isCancelled
                                            ? 'Un-Cancel Shift'
                                            : 'Cancel Shift'}
                                    </Button>
                                )}
                                {isAdmin && (
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
                                )}
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                >
                                    Close
                                </Button>
                            </Stack>
                        </Stack>
                    </form>
                </Container>
            </FormProvider>
            {/* Location Form Dialog */}
            {isLocationFormOpen && (
                <Dialog
                    fullWidth={true}
                    maxWidth="md"
                    open={isLocationFormOpen}
                    onClose={() => setIsLocationFormOpen(false)}
                >
                    <DialogTitle>
                        <Box display="flex" alignItems="center">
                            <Box flexGrow={1}>Create New Location</Box>
                            <Box>
                                <IconButton
                                    onClick={() => setIsLocationFormOpen(false)}
                                >
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        <LocationForm
                            onSubmit={(data: any) => {
                                // Close only the location form dialog
                                setIsLocationFormOpen(false);

                                // If we have the ID of the newly created location, select it
                                if (data.id) {
                                    // Wait for the location query to be invalidated and refetched
                                    // This ensures the new location is available in the dropdown
                                    setTimeout(() => {
                                        // Set the locationId field to the newly created location's ID
                                        setValue('locationId', data.id, {
                                            shouldValidate: false,
                                        });
                                    }, 100);
                                }
                            }}
                            onCancel={() => setIsLocationFormOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

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
import { DateTime, Settings } from 'luxon';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { combineDateAndTime, getTimeInZone } from '@/utils/dateAndTimeUtils';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Set default timezone to UTC
//Settings.defaultZone = 'UTC';
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
    useShiftDraftCreateMutation,
    useShiftDraftDeleteMutation,
    useShiftDraftUpdateMutation,
} from '@/queries/shiftDrafts';
import {
    useShiftRequestCreateMutation,
    useShiftRequestsListQuery,
} from '@/queries/requests';
import LocationAutocomplete from '@/components/form/LocationAutocomplete';
import LocationViewDialog from '@/components/locations/LocationViewDialog';
import LocationForm from '@/components/locations/LocationForm';
import DepartmentAutocomplete from '@/components/form/DepartmentAutocomplete';
import { reset } from 'next/dist/lib/picocolors';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// Define form data type
type ShiftFormData = {
    id?: string;
    title: string;
    locationId: string | null;
    departmentId?: string | null;
    legacyLocation?: string;
    date: Date | null;
    startTime: Date | null;
    endTime: Date | null;
    slots: number;
    notes?: string;
    adminNotes?: string;
    assignments?: any[];
    isDraft?: boolean | null;
    draftId?: string | null;
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
        departmentId: z.string().nullable().optional(),
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
            const startDateTime = DateTime.fromJSDate(data.startTime);
            const endDateTime = DateTime.fromJSDate(data.endTime);

            // Validate that start time is before end time
            return startDateTime <= endDateTime;
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

type ShiftFormShift = inferRouterOutputs<AppRouter>['shifts']['byId'] & {
    isDraft?: boolean | null;
    draftId?: string | null;
};

// Type for ShiftForm props
type ShiftFormProps = {
    isNew?: boolean;
    isDuplicate?: boolean;
    shiftId?: string;
    shift?: ShiftFormShift | null;
    onClose?: () => void;
};

export default function ShiftForm(props: ShiftFormProps) {
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
              title: shift?.title ?? '',
              notes: shift?.notes ?? '',
              adminNotes: shift?.adminNotes ?? '',
              slots: shift?.slots || 1,
              // Parse dates from ISO format
              // For drafts, use the date field directly
              date: (shift as any)?.date
                  ? (() => {
                        // Check if date is already a Date object
                        const isDateObject =
                            (shift as any).date instanceof Date;

                        let dateTime;
                        if (isDateObject) {
                            dateTime = DateTime.fromJSDate(
                                (shift as any).date
                            ).setZone(
                                shift.timezone ||
                                    businessProfile?.timezone ||
                                    'UTC'
                            );
                        } else {
                            // Assume it's an ISO string
                            dateTime = DateTime.fromISO(
                                (shift as any).date
                            ).setZone(
                                shift.timezone ||
                                    businessProfile?.timezone ||
                                    'UTC'
                            );
                        }

                        return dateTime.isValid ? dateTime.toJSDate() : null;
                    })()
                  : shift.startTime
                    ? (() => {
                          // Check if startTime is already a Date object
                          const isDateObject = shift.startTime instanceof Date;

                          let dateTime;
                          if (isDateObject) {
                              dateTime = DateTime.fromJSDate(shift.startTime)
                                  .setZone(
                                      shift.timezone ||
                                          businessProfile?.timezone ||
                                          'UTC'
                                  )
                                  .startOf('day');
                          } else {
                              // Assume it's an ISO string
                              dateTime = DateTime.fromISO(
                                  shift.startTime as any
                              )
                                  .setZone(
                                      shift.timezone ||
                                          businessProfile?.timezone ||
                                          'UTC'
                                  )
                                  .startOf('day');
                          }

                          return dateTime.isValid ? dateTime.toJSDate() : null;
                      })()
                    : null,
              // Handle startTime and endTime which may be strings or null for drafts
              //
              startTime: shift.startTime ?? null,
              endTime: shift.endTime ?? null,

              // Handle location fields
              locationId: shift.locationId || null,
              departmentId: shift.departmentId || null,
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
        watch,
    } = methods;
    //const [date,setDate] = useState<Date | null>(null);

    // Watch all form values for debugging
    const allValues = watch();

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

    const role = user?.role || 'member';
    const isAdmin = ['admin', 'owner'].includes(role);

    // Get mutations for creating and updating shifts
    const createMutation = useShiftCreateMutation();
    const updateMutation = useShiftUpdateMutation();
    const setCancelledMutations = useShiftCancelMutation();
    const createDraftMutation = useShiftDraftCreateMutation();
    const updateDraftMutation = useShiftDraftUpdateMutation();
    const deleteDraftMutation = useShiftDraftDeleteMutation();

    // Form submission handlers
    async function onNewFormSubmit(formData: ShiftFormData) {
        try {
            // Use the shift's timezone, or organization's timezone, or default to UTC
            const timezone =
                shift?.timezone || businessProfile?.timezone || 'UTC';

            // Create datetime strings by combining the date with the time
            // We need to work with the local time directly to avoid double timezone conversion
            // Use centralized date utility to combine date and time, convert to UTC
            const startTimeISO = combineDateAndTime(
                formData.date!,
                getTimeInZone(formData.startTime!, timezone),
                timezone
            );

            const endTimeISO = combineDateAndTime(
                formData.date!,
                getTimeInZone(formData.endTime!, timezone),
                timezone
            );

            // Format data for API - note that we're not including the date field
            const shiftData = {
                title: formData.title,
                startTime: startTimeISO,
                endTime: endTimeISO,
                slots: Number(formData.slots),
                timezone: timezone,
                locationId: formData.locationId!,
                departmentId: formData.departmentId,
                legacyLocation: formData.locationId
                    ? undefined
                    : formData.legacyLocation,
                notes: formData.notes,
                adminNotes: formData.adminNotes,
                assignments: (formData.assignments || []).map((assignment) => ({
                    ...assignment,
                    outcome:
                        assignment.outcome === 'assigned' ||
                        assignment.outcome === 'waiting' ||
                        assignment.outcome === 'refused'
                            ? assignment.outcome
                            : 'waiting', // Default to 'waiting' if outcome is invalid
                })),
            };

            // Create shift
            await createMutation.mutateAsync(shiftData as any);
            notifications.show('Shift created successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });

            // If this shift was created from a draft, delete the draft
            if (shift?.isDraft && shift?.draftId) {
                try {
                    await deleteDraftMutation.mutateAsync({
                        id: shift.draftId,
                    });
                } catch (error) {
                    console.error(
                        'Error deleting draft after creating shift:',
                        error
                    );
                }
            }

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
            const startTimeISO = combineDateAndTime(
                formData.date!,
                getTimeInZone(formData.startTime!, timezone),
                timezone
            );

            const endTimeISO = combineDateAndTime(
                formData.date!,
                getTimeInZone(formData.endTime!, timezone),
                timezone
            );


            const shiftData = {
                id: shiftId,
                title: formData.title,
                startTime: startTimeISO,
                endTime: endTimeISO,
                slots: Number(formData.slots),
                timezone: timezone,
                locationId: formData.locationId!,
                departmentId: formData.departmentId,
                legacyLocation: formData.locationId
                    ? undefined
                    : formData.legacyLocation,
                notes: formData.notes,
                adminNotes: formData.adminNotes,
                assignments: (formData.assignments || []).map((assignment) => ({
                    ...assignment,
                    outcome:
                        assignment.outcome === 'assigned' ||
                        assignment.outcome === 'waiting' ||
                        assignment.outcome === 'refused'
                            ? assignment.outcome
                            : 'waiting', // Default to 'waiting' if outcome is invalid
                })),
            };

            await updateMutation.mutateAsync(shiftData as any);
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

    // Function to save the current form data as a draft
    async function onSaveDraft() {
        try {
            // Validate the form data
            const formData = getValues();

            // Check if required fields are filled
            if (!formData.title || !formData.date) {
                notifications.show(
                    'Please fill in title and date before saving as draft',
                    {
                        severity: 'error',
                        autoHideDuration: 3000,
                    }
                );
                return;
            }

            // Use the shift's timezone, or organization's timezone, or default to UTC
            const timezone =
                shift?.timezone || businessProfile?.timezone || 'UTC';

            // Get the date in ISO format
            const dateISO = DateTime.fromJSDate(formData.date!).toFormat(
                'yyyy-MM-dd'
            );

            // Create datetime strings by combining the date with the time
            // We need to work with the local time directly to avoid double timezone conversion
            // Use centralized date utility to combine date and time, convert to UTC
            let startTimeISO = null;
            let endTimeISO = null;

            if (formData.startTime) {
                startTimeISO = combineDateAndTime(
                    formData.date!,
                    getTimeInZone(formData.startTime, timezone),
                    timezone
                );
            }

            if (formData.endTime) {
                endTimeISO = combineDateAndTime(
                    formData.date!,
                    getTimeInZone(formData.endTime, timezone),
                    timezone
                );
            }

            // Format data for API
            const draftData = {
                title: formData.title,
                date: dateISO,
                startTime: startTimeISO,
                endTime: endTimeISO,
                slots: Number(formData.slots || 1),
                timezone: timezone,
                locationId: formData.locationId || undefined,
                departmentId: formData.departmentId,
                legacyLocation: formData.locationId
                    ? undefined
                    : formData.legacyLocation,
                notes: formData.notes,
                adminNotes: formData.adminNotes,
            };

            // Check if we're editing an existing draft
            if (shift?.isDraft && shift?.draftId) {
                // Update existing draft
                await updateDraftMutation.mutateAsync({
                    id: shift.draftId,
                    ...draftData,
                } as any);
                notifications.show('Draft updated successfully', {
                    severity: 'success',
                    autoHideDuration: 3000,
                });
            } else {
                // Create new draft
                await createDraftMutation.mutateAsync(draftData as any);
                notifications.show('Draft saved successfully', {
                    severity: 'success',
                    autoHideDuration: 3000,
                });
            }
        } catch (error: any) {
            console.error('Error saving draft:', error);
            notifications.show('Failed to save draft', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    }

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
                                    return (
                                        <LocationAutocomplete
                                            value={field.value}
                                            onChange={(locationId) => {
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

                            {/* Department Autocomplete */}
                            <Controller
                                name="departmentId"
                                control={control}
                                render={({ field }) => {
                                    return (
                                        <DepartmentAutocomplete
                                            value={field.value as any}
                                            onChange={(departmentId) => {
                                                field.onChange(departmentId);
                                            }}
                                            disabled={!isAdmin}
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
                            {/*<LocalizationProvider dateAdapter={AdapterLuxon}>*/}
                            {businessProfile && (
                                <Controller
                                    name="startTime"
                                    control={control}
                                    render={({ field }) => {
                                        let luxonValue = null;
                                        if (field.value) {
                                            luxonValue = DateTime.fromJSDate(
                                                field.value
                                            ).toUTC();
                                        }

                                        return (
                                            <TimePicker
                                                disabled={!isAdmin}
                                                label="Start Time"
                                                value={luxonValue}
                                                timezone={
                                                    businessProfile.timezone
                                                }
                                                onChange={(time) => {
                                                    // Convert Luxon DateTime to native Date if needed
                                                    if (
                                                        time &&
                                                        typeof time ===
                                                            'object' &&
                                                        'toJSDate' in time
                                                    ) {
                                                        try {
                                                            const jsDate = (
                                                                time as any
                                                            ).toJSDate();
                                                            field.onChange(
                                                                jsDate
                                                            );
                                                        } catch (error) {
                                                            console.error(
                                                                'Error converting to JS Date:',
                                                                {
                                                                    error,
                                                                    time,
                                                                    timestamp:
                                                                        new Date().toISOString(),
                                                                }
                                                            );
                                                            field.onChange(
                                                                null
                                                            );
                                                        }
                                                    } else {
                                                        field.onChange(time);
                                                    }
                                                }}
                                                slotProps={{
                                                    textField: {
                                                        error: !!errors.startTime,
                                                        helperText: errors
                                                            .startTime
                                                            ?.message as any,
                                                    },
                                                }}
                                            />
                                        );
                                    }}
                                />
                            )}
                            {businessProfile && (
                                <Controller
                                    name="endTime"
                                    control={control}
                                    render={({ field }) => {
                                        let luxonValue = null;
                                        if (field.value) {
                                            luxonValue = DateTime.fromJSDate(
                                                field.value
                                            ).toUTC();
                                        }

                                        return (
                                            <TimePicker
                                                label="End Time"
                                                disabled={!isAdmin}
                                                value={luxonValue}
                                                timezone={
                                                    businessProfile.timezone
                                                }
                                                onChange={(time) => {
                                                    // Convert Luxon DateTime to native Date if needed
                                                    if (
                                                        time &&
                                                        typeof time ===
                                                            'object' &&
                                                        'toJSDate' in time
                                                    ) {
                                                        try {
                                                            const jsDate = (
                                                                time as any
                                                            ).toJSDate();
                                                            field.onChange(
                                                                jsDate
                                                            );
                                                        } catch (error) {
                                                            console.error(
                                                                'Error converting to JS Date:',
                                                                {
                                                                    error,
                                                                    time,
                                                                    timestamp:
                                                                        new Date().toISOString(),
                                                                }
                                                            );
                                                            field.onChange(
                                                                null
                                                            );
                                                        }
                                                    } else {
                                                        field.onChange(time);
                                                    }
                                                }}
                                                slotProps={{
                                                    textField: {
                                                        error: !!errors.endTime,
                                                        helperText: errors
                                                            .endTime
                                                            ?.message as any,
                                                    },
                                                }}
                                            />
                                        );
                                    }}
                                />
                            )}
                            {/*</LocalizationProvider>*/}
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
                                {isNew && (
                                    <Button
                                        variant="contained"
                                        type="button"
                                        color="info"
                                        disabled={isSubmitting}
                                        onClick={onSaveDraft}
                                    >
                                        Save to Draft
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

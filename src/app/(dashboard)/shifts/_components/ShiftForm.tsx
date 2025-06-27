import React from 'react';
import {
    Button,
    Container,
    Grid,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useForm, Controller } from 'react-hook-form';
import { useNotifications } from '@toolpad/core';

import AssignmentIcon from '@mui/icons-material/Assignment';
import {
    useAuthQuery,
    useTeamUsersLookupQuery,
    useTeamUsersQuery,
} from '@/queries/users';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/api/trpc/[trpc]';
import ShiftAssignmentTool from '@/app/(dashboard)/shifts/_components/ShiftAssignmentTool';
import { useShiftCreateMutation, useShiftUpdateMutation } from '@/queries/shifts';

dayjs.extend(customParseFormat);

// Helper function to close the dialog
const useShiftDialogHelpers = () => ({
    reset: () => {
        // In a real implementation, this would close the dialog
        console.log('Dialog reset called');
    },
});

// Type for ShiftForm props
type ShiftFormProps = {
    isNew?: boolean;
    shiftId?: string;
    shift?: inferRouterOutputs<AppRouter>['shifts']['byId'] | null;
    onClose?: () => void;
};

export default function ShiftForm(props: ShiftFormProps) {
    const { reset: handleClose } = useShiftDialogHelpers();
    const { shiftId, shift, isNew: propsIsNew, onClose } = props;
    const notifications = useNotifications();

    const defaultValues = {
        id: '',
        title: '',
        location: '',
        date: null,
        startTime: null,
        endTime: null,
        slots: 1,
        notes: '',
        adminNotes: '',
        assignments: [],
    };

    // Get team users data to map from memberId to userId
    const { data: teamUsers = [] } = useTeamUsersQuery();

    // Create a mapping from memberId to userId
    const memberToUserMap = React.useMemo(() => {
        const map = {};
        teamUsers.forEach(user => {
            user.members?.forEach(member => {
                map[member.id] = user.id;
            });
        });
        return map;
    }, [teamUsers]);

    // Transform shiftAssignments to the format expected by the form
    const transformedShift = shift ? {
        ...shift,
        assignments: shift.shiftAssignments?.map(assignment => {
            // Map memberId to userId using the memberToUserMap
            const userId = memberToUserMap[assignment.memberId] || assignment.memberId;
            return {
                userId,
                outcome: assignment.outcome,
                reason: assignment.reason || ''
            };
        }) || []
    } : defaultValues;

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        getValues,
        watch,
        reset,
        setError,
    } = useForm({
        defaultValues: transformedShift,
    });

    // Helper for setting form errors
    const setErrors = (errorList) => {
        errorList.forEach((err) => {
            setError(err.field, {
                type: 'manual',
                message: err.message,
            });
        });
    };

    const { data: session } = useAuthQuery();
    const user = session?.user;

    // Determine if this is a new shift based on props or shiftId
    const isNew = propsIsNew ?? !shiftId;
    const role = user?.role || 'member';
    const isAdmin = ['admin', 'owner'].includes(role);

    // Get mutations for creating and updating shifts
    const createMutation = useShiftCreateMutation();
    const updateMutation = useShiftUpdateMutation();

    // Form submission handlers
    async function onNewFormSubmit(formData) {
        try {
            // Validate form data
            if (!formData.title) {
                setError('title', { message: 'Title is required' });
                return;
            }
            if (!formData.date) {
                setError('date', { message: 'Date is required' });
                return;
            }
            if (!formData.startTime) {
                setError('startTime', { message: 'Start time is required' });
                return;
            }
            if (!formData.endTime) {
                setError('endTime', { message: 'End time is required' });
                return;
            }

            // Format data for API
            const shiftData = {
                title: formData.title,
                date: dayjs(formData.date).format('YYYY-MM-DD'),
                startTime: dayjs(formData.startTime).format('YYYY-MM-DD HH:mm:ss'),
                endTime: dayjs(formData.endTime).format('YYYY-MM-DD HH:mm:ss'),
                slots: Number(formData.slots),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                location: formData.location,
                notes: formData.notes,
                adminNotes: formData.adminNotes,
                assignments: formData.assignments || [],
            };

            // Create shift
            await createMutation.mutateAsync(shiftData);
            notifications.show('Shift created successfully', { severity: 'success', autoHideDuration: 3000 });

            // Close dialog
            if (onClose) {
                onClose();
            } else {
                handleClose();
            }
        } catch (error) {
            console.error('Error creating shift:', error);
            notifications.show('Failed to create shift', { severity: 'error' });
        }
    }

    async function onUpdateFormSubmit(formData) {
        try {
            if (!shiftId) {
                notifications.show('Shift ID is required for updates', { severity: 'error' });
                return;
            }

            // Format data for API
            const shiftData = {
                id: shiftId,
                title: formData.title,
                date: dayjs(formData.date).format('YYYY-MM-DD'),
                startTime: dayjs(formData.startTime).format('YYYY-MM-DD HH:mm:ss'),
                endTime: dayjs(formData.endTime).format('YYYY-MM-DD HH:mm:ss'),
                slots: Number(formData.slots),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                location: formData.location,
                notes: formData.notes,
                adminNotes: formData.adminNotes,
                assignments: formData.assignments || [],
            };

            // Update shift
            await updateMutation.mutateAsync(shiftData);
            notifications.show('Shift updated successfully', { severity: 'success', autoHideDuration: 3000 });

            // Close dialog
            if (onClose) {
                onClose();
            } else {
                handleClose();
            }
        } catch (error) {
            console.error('Error updating shift:', error);
            notifications.show('Failed to update shift', { severity: 'error' });
        }
    }

    const onSubmit = handleSubmit(
        isNew ? onNewFormSubmit : onUpdateFormSubmit
    );

    const { data: teamMembers = [] } = useTeamUsersQuery();
    const { data: userLookup } = useTeamUsersLookupQuery();

    const userId = user?.id;

    // Check if user is assigned to this shift
    const assignments = getValues('assignments') || [];
    const isAssigned = assignments.some(a => a.userId === userId);

    const slots = getValues('slots') || 1;
    const hasAvailableSlots = assignments.length === 0 || assignments.length < Number(slots);

    // In a real implementation, this would fetch shift requests from the server
    const hasRequests = false;

    async function handleShiftRequest() {
        // In a real implementation, this would create a shift request
        notifications.show('Shift request submitted', { severity: 'success', autoHideDuration: 3000 });
    }

    const date = watch('date');

    return (
        <Container>
            <form onSubmit={onSubmit}>
                <Stack spacing={2}>
                    {!isAdmin && isAssigned && (
                        <Container>You are assigned to this shift!</Container>
                    )}
                    {!isAdmin &&
                        !isAssigned &&
                        hasAvailableSlots &&
                        hasRequests && (
                            <Container>
                                You have already requested to be considered for
                                this shift.
                            </Container>
                        )}
                    {!isAdmin &&
                        !isAssigned &&
                        hasAvailableSlots &&
                        !hasRequests && (
                            <Container>
                                <Button onClick={handleShiftRequest}>
                                    <AssignmentIcon />
                                    Click here to request this shift!
                                </Button>
                            </Container>
                        )}
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
                                helperText={errors.title?.message}
                            />
                        )}
                    />
                    <Controller
                        name="location"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                disabled={!isAdmin}
                                label="Location"
                                variant="outlined"
                                error={!!errors.location}
                                helperText={errors.location?.message}
                            />
                        )}
                    />
                    <Controller
                        name="date"
                        control={control}
                        render={({ field }) => (
                            <DatePicker
                                disabled={!isAdmin}
                                label="Date"
                                value={
                                    field.value ? dayjs(field.value) : null
                                }
                                onChange={(date) =>
                                    field.onChange(date ? date.toDate() : null)
                                }
                                slotProps={{
                                    textField: {
                                        error: !!errors.date,
                                        helperText: errors.date?.message,
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
                                disabled={!isAdmin}
                                label="Start Time"
                                value={field.value ? dayjs(field.value) : null}
                                onChange={(date) =>
                                    field.onChange(date ? date.toDate() : null)
                                }
                                slotProps={{
                                    textField: {
                                        error: !!errors.startTime,
                                        helperText: errors.startTime?.message,
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
                                disabled={!isAdmin}
                                label="End Time"
                                value={field.value ? dayjs(field.value) : null}
                                onChange={(date) =>
                                    field.onChange(date ? date.toDate() : null)
                                }
                                slotProps={{
                                    textField: {
                                        error: !!errors.endTime,
                                        helperText: errors.endTime?.message,
                                    },
                                }}
                            />
                        )}
                    />
                    <Grid container spacing={2} alignItems="center">
                        <Grid item>
                            <Typography variant="h6">
                                {assignments?.length || 0}
                            </Typography>
                        </Grid>
                        <Grid item>
                            <Typography variant="body1">of</Typography>
                        </Grid>
                        <Grid item>
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
                                        helperText={errors.slots?.message}
                                        inputProps={{ min: 1 }}
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>

                    {/* Log the assignments data */}
                    {console.log('Assignments data:', getValues('assignments'))}

                    <Controller
                        name="assignments"
                        control={control}
                        render={({ field }) => (
                            <ShiftAssignmentTool
                                {...field}
                                shift={shift}
                                date={date}
                                readOnly={!isAdmin}
                            />
                        )}
                    />

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
                                helperText={errors.notes?.message}
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
                                    helperText={errors.adminNotes?.message}
                                />
                            )}
                        />
                    )}

                    <Stack direction="row" spacing={2}>
                        {isAdmin && (
                            <Button 
                                variant="contained" 
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : (isNew ? 'Create' : 'Update')}
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={onClose || handleClose}
                            disabled={isSubmitting}
                        >
                            {isAdmin ? 'Cancel' : 'Close'}
                        </Button>
                    </Stack>
                </Stack>
            </form>
        </Container>
    );
}

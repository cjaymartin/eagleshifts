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
import { useForm, Controller } from 'react-hook-form';
import { useNotifications } from '@toolpad/core';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/api/trpc/[trpc]';
import { useAuthQuery } from '@/queries/users';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Import the mutations we'll create later
import { useShiftRequestCreateMutation, useShiftRequestUpdateMutation } from '@/queries/requests';

dayjs.extend(customParseFormat);
dayjs.extend(utc);

// Type for RequestForm props
type RequestFormProps = {
    isNew?: boolean;
    requestId?: string;
    request?: inferRouterOutputs<AppRouter>['requests']['byId'] | null;
    shift?: inferRouterOutputs<AppRouter>['shifts']['byId'] | null;
    onClose?: () => void;
};

export default function RequestForm(props: RequestFormProps) {
    const { requestId, request, shift, isNew: propsIsNew, onClose } = props;
    const notifications = useNotifications();

    const defaultValues = {
        id: '',
        status: 'pending',
        reason: '',
        shiftId: shift?.id || '',
    };

    // Transform request to the format expected by the form
    const transformedRequest = request
        ? {
              ...request,
              shiftId: request.shiftId,
          }
        : {
              ...defaultValues,
              shiftId: shift?.id || '',
          };

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        setError,
    } = useForm({
        defaultValues: transformedRequest,
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

    // Determine if this is a new request based on props or requestId
    const isNew = propsIsNew ?? !requestId;
    const role = user?.role || 'member';
    const isAdmin = ['admin', 'owner'].includes(role);

    // Get mutations for creating and updating requests
    const createMutation = useShiftRequestCreateMutation();
    const updateMutation = useShiftRequestUpdateMutation();

    // Form submission handlers
    async function onNewFormSubmit(formData) {
        try {
            // Validate form data
            if (!formData.shiftId) {
                setError('shiftId', { message: 'Shift is required' });
                return;
            }

            // Format data for API
            const requestData = {
                shiftId: formData.shiftId,
                reason: formData.reason,
            };

            // Create request
            await createMutation.mutateAsync(requestData);
            notifications.show('Request submitted successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });

            // Close dialog
            if (onClose) {
                onClose();
            }
        } catch (error) {
            console.error('Error creating request:', error);
            notifications.show('Failed to submit request', { severity: 'error' });
        }
    }

    async function onUpdateFormSubmit(formData) {
        try {
            if (!requestId) {
                notifications.show('Request ID is required for updates', {
                    severity: 'error',
                });
                return;
            }

            // Format data for API
            const requestData = {
                id: requestId,
                status: formData.status,
                reason: formData.reason,
            };

            // Update request
            await updateMutation.mutateAsync(requestData);
            notifications.show('Request updated successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });

            // Close dialog
            if (onClose) {
                onClose();
            }
        } catch (error) {
            console.error('Error updating request:', error);
            notifications.show('Failed to update request', { severity: 'error' });
        }
    }

    const onSubmit = handleSubmit(isNew ? onNewFormSubmit : onUpdateFormSubmit);

    return (
        <Container>
            <form onSubmit={onSubmit}>
                <Stack spacing={2}>
                    {shift && (
                        <div>
                            <Typography variant="h6">{shift.title}</Typography>
                            {shift.location && (
                                <Typography variant="body1">{shift.location}</Typography>
                            )}
                            <Typography variant="body2">
                                {dayjs.utc(shift.date).format('MMMM D, YYYY')}
                            </Typography>
                            <Typography variant="body2">
                                {dayjs.utc(shift.startTime).format('h:mm A')} - 
                                {dayjs.utc(shift.endTime).format('h:mm A')}
                            </Typography>
                        </div>
                    )}

                    {!isNew && isAdmin && (
                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <FormControl component="fieldset">
                                    <FormLabel component="legend">Status</FormLabel>
                                    <RadioGroup {...field} row>
                                        <FormControlLabel
                                            value="pending"
                                            control={<Radio />}
                                            label="Pending"
                                        />
                                        <FormControlLabel
                                            value="approved"
                                            control={<Radio />}
                                            label="Approved"
                                        />
                                        <FormControlLabel
                                            value="rejected"
                                            control={<Radio />}
                                            label="Rejected"
                                        />
                                    </RadioGroup>
                                </FormControl>
                            )}
                        />
                    )}

                    <Controller
                        name="reason"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                multiline
                                rows={3}
                                disabled={!isNew && !isAdmin}
                                label={isAdmin ? "Admin Notes" : "Reason for Request"}
                                variant="outlined"
                                error={!!errors.reason}
                                helperText={errors.reason?.message}
                            />
                        )}
                    />

                    <Stack direction="row" spacing={2}>
                        {(isNew || isAdmin) && (
                            <Button
                                variant="contained"
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? 'Saving...'
                                    : isNew
                                    ? 'Submit Request'
                                    : 'Update Request'}
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={onClose}
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
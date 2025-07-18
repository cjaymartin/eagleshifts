'use client';

import React from 'react';
import {
    Button,
    Container,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Grid,
    TextField,
    Box,
    Typography,
} from '@mui/material';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    useUserNotificationSettingsQuery,
    useUpdateUserNotificationSettingsMutation,
} from '@/queries/team';
import { useNotifications } from '@toolpad/core';
import { useAuthQuery } from '@/queries/users';

// Schema for user notification settings
const notificationFormSchema = z.object({
    notifyMeBeforeShift: z.boolean().default(false),
    notifyMeBeforeShiftDays: z.string().optional(),
    weeklyDigest: z.boolean().default(false),
    unfilledDigest: z.boolean().default(false),
});

type NotificationFormData = z.infer<typeof notificationFormSchema>;

export default function NotificationsForm() {
    const { data: notificationSettings, isLoading } =
        useUserNotificationSettingsQuery();
    const updateNotificationsMutation =
        useUpdateUserNotificationSettingsMutation();
    const notifications = useNotifications();
    const { data: session } = useAuthQuery();
    const role = session?.user?.role || 'member';
    const isAdmin = ['admin', 'owner'].includes(role);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<NotificationFormData>({
        resolver: zodResolver(notificationFormSchema) as any,
        defaultValues: {
            notifyMeBeforeShift: false,
            notifyMeBeforeShiftDays: '',
            weeklyDigest: false,
            unfilledDigest: false,
        },
    });

    const onSubmit: SubmitHandler<NotificationFormData> = async (data) => {
        try {
            await updateNotificationsMutation.mutateAsync(data);
            notifications.show('Notification settings updated successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });
        } catch (error) {
            notifications.show('Failed to update notification settings', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    };

    // Watch the notifyMeBeforeShift value to conditionally render the days input
    const notifyMeBeforeShift = watch('notifyMeBeforeShift');

    // Update form when notification settings data is loaded
    React.useEffect(() => {
        if (notificationSettings) {
            reset({
                notifyMeBeforeShift:
                    notificationSettings.notifyMeBeforeShift || false,
                notifyMeBeforeShiftDays:
                    notificationSettings.notifyMeBeforeShiftDays || '',
                weeklyDigest: notificationSettings.weeklyDigest || false,
                unfilledDigest: notificationSettings.unfilledDigest || false,
            });
        }
    }, [notificationSettings, reset]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <Container>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container direction="column" spacing={2} sx={{ m: 1 }}>
                    <Grid>
                        <FormGroup row>
                            <Controller
                                name="notifyMeBeforeShift"
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                {...field}
                                                checked={field.value}
                                            />
                                        }
                                        label="Notify me"
                                    />
                                )}
                            />
                            {notifyMeBeforeShift && (
                                <Controller
                                    name="notifyMeBeforeShiftDays"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            size="small"
                                            variant="standard"
                                            sx={{
                                                width: '5ch',
                                                marginTop: '10px',
                                            }}
                                        />
                                    )}
                                />
                            )}
                            {notifyMeBeforeShift && (
                                <FormControlLabel
                                    control={<Box ml={3} />}
                                    label="days before each shift."
                                />
                            )}
                        </FormGroup>
                    </Grid>
                    <Grid>
                        <FormGroup row>
                            <Controller
                                name="weeklyDigest"
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                {...field}
                                                checked={field.value}
                                            />
                                        }
                                        label="Send me a weekly digest of upcoming shifts."
                                    />
                                )}
                            />
                        </FormGroup>
                    </Grid>
                </Grid>

                {isAdmin && (
                    <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
                        Administrative Notification Options
                    </Typography>
                )}

                {isAdmin && (
                    <Grid
                        container
                        direction="column"
                        spacing={2}
                        sx={{ m: 1 }}
                    >
                        <Grid size={12}>
                            <Controller
                                name="unfilledDigest"
                                control={control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                {...field}
                                                checked={field.value}
                                            />
                                        }
                                        label="Send me a weekly digest email of unfilled shifts"
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>
                )}

                <Grid container spacing={3} sx={{ m: 1 }}>
                    <Grid>
                        <Button
                            variant="contained"
                            color="primary"
                            type="submit"
                        >
                            Save
                        </Button>
                    </Grid>
                    <Grid>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={() => {
                                if (notificationSettings) {
                                    reset({
                                        notifyMeBeforeShift:
                                            notificationSettings.notifyMeBeforeShift ||
                                            false,
                                        notifyMeBeforeShiftDays:
                                            notificationSettings.notifyMeBeforeShiftDays ||
                                            '',
                                        weeklyDigest:
                                            notificationSettings.weeklyDigest ||
                                            false,
                                        unfilledDigest:
                                            notificationSettings.unfilledDigest ||
                                            false,
                                    });
                                }
                            }}
                        >
                            Cancel
                        </Button>
                    </Grid>
                </Grid>
            </form>
        </Container>
    );
}

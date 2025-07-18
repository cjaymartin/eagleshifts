'use client';

import React from 'react';
import { Button, Container, Grid, FormControlLabel } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    useBusinessNotificationSettingsQuery,
    useUpdateBusinessNotificationSettingsMutation,
} from '@/queries/team';
import { useNotifications } from '@toolpad/core';
import DayOfWeekPicker from './DayOfWeekPicker';

// Schema for business notification settings
const notificationFormSchema = z.object({
    digestEmailDate: z.string().min(1, { message: 'Required' }),
});

type NotificationFormData = z.infer<typeof notificationFormSchema>;

export default function BusinessNotificationsForm() {
    const { data: notificationSettings, isLoading } =
        useBusinessNotificationSettingsQuery();
    const updateNotificationsMutation =
        useUpdateBusinessNotificationSettingsMutation();
    const notifications = useNotifications();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<NotificationFormData>({
        resolver: zodResolver(notificationFormSchema),
        defaultValues: {
            digestEmailDate: 'saturday',
        },
    });

    // Update form when notification settings data is loaded
    React.useEffect(() => {
        if (notificationSettings) {
            reset({
                digestEmailDate:
                    notificationSettings.digestEmailDate || 'saturday',
            });
        }
    }, [notificationSettings, reset]);

    const onSubmit = async (data: NotificationFormData) => {
        try {
            await updateNotificationsMutation.mutateAsync(data);
            notifications.show('Notification settings updated successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });
        } catch (error: any) {
            notifications.show('Failed to update notification settings', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <Container maxWidth="xl">
            <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container direction="column" spacing={2} sx={{ m: 1 }}>
                    <Grid>
                        <FormControlLabel
                            control={
                                <Controller
                                    name="digestEmailDate"
                                    control={control}
                                    render={({ field }) => (
                                        <DayOfWeekPicker
                                            {...field}
                                            label="Email Date"
                                            sx={{ minWidth: 100 }}
                                        />
                                    )}
                                />
                            }
                            label="Day of Week for Sending Digest Emails &nbsp;"
                            labelPlacement="start"
                        />
                    </Grid>
                </Grid>
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
                                        digestEmailDate:
                                            notificationSettings.digestEmailDate ||
                                            'saturday',
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

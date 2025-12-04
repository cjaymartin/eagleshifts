'use client';

import React from 'react';
import {
    Button,
    Container,
    Grid,
    TextField,
    FormControlLabel,
    MenuItem,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    useBusinessProfileQuery,
    useUpdateBusinessProfileMutation,
} from '@/queries/team';
import { useNotifications } from '@/components/providers/NotificationsProvider';

// We need to create a DayOfWeekPicker component
import DayOfWeekPicker from './DayOfWeekPicker';

// Schema for business profile
const profileFormSchema = z.object({
    name: z.string().min(1, { message: 'Required' }),
    weekStart: z.string().min(1, { message: 'Required' }),
    timezone: z.string().min(1, { message: 'Required' }),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function BusinessProfileForm() {
    const { data: profile, isLoading } = useBusinessProfileQuery();
    const updateProfileMutation = useUpdateBusinessProfileMutation();
    const notifications = useNotifications();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            name: '',
            weekStart: 'saturday',
            timezone: 'America/New_York',
        },
    });

    // Update form when profile data is loaded
    React.useEffect(() => {
        if (profile) {
            reset({
                name: profile.name || '',
                weekStart: profile.weekStart || 'saturday',
                timezone: profile.timezone || 'America/New_York',
            });
        }
    }, [profile, reset]);

    const onSubmit = async (data: ProfileFormData) => {
        try {
            await updateProfileMutation.mutateAsync(data);
            notifications.show('Business profile updated successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });

            // Refresh the page to update the WorkOS organization picker
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error: any) {
            notifications.show('Failed to update business profile', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <Container>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container direction="column" spacing={2} sx={{ m: 1 }}>
                    <Grid>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Business Name"
                                    variant="outlined"
                                    fullWidth
                                    error={!!errors.name}
                                    helperText={errors.name?.message}
                                />
                            )}
                        />
                    </Grid>
                    <Grid>
                        <Controller
                            name="timezone"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Timezone"
                                    select
                                    fullWidth
                                    variant="outlined"
                                    error={!!errors.timezone}
                                    helperText={errors.timezone?.message}
                                >
                                    {[
                                        'America/New_York',
                                        'America/Chicago',
                                        'America/Denver',
                                        'America/Los_Angeles',
                                        'America/Anchorage',
                                        'Pacific/Honolulu',
                                        'Europe/London',
                                        'Europe/Paris',
                                        'Asia/Tokyo',
                                        'Australia/Sydney',
                                    ].map((zone) => (
                                        <MenuItem key={zone} value={zone}>
                                            {zone}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />
                    </Grid>
                    <Grid>
                        <FormControlLabel
                            sx={{ m: 2 }}
                            control={
                                <Controller
                                    name="weekStart"
                                    control={control}
                                    render={({ field }) => (
                                        <DayOfWeekPicker
                                            {...field}
                                            label="Start of Week"
                                            sx={{ minWidth: 100 }}
                                        />
                                    )}
                                />
                            }
                            label="First Day of Week &nbsp;"
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
                                if (profile) {
                                    reset({
                                        name: profile.name || '',
                                        weekStart:
                                            profile.weekStart || 'saturday',
                                        timezone:
                                            profile.timezone ||
                                            'America/New_York',
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

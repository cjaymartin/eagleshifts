'use client';

import React, { useState } from 'react';
import { Button, Container, Grid, TextField, Alert } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUserProfileQuery, useUpdateUserProfileMutation } from '@/queries/team';
import { useNotifications } from '@toolpad/core';
import MuiPhoneNumber from 'mui-phone-number';

// Schema for user profile
const profileFormSchema = z.object({
  displayName: z.string().min(1, { message: 'Required' }),
  email: z.string().email({ message: 'Invalid Format' }),
  phoneNumber: z.string().min(1, { message: 'Required' }),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function MyProfileForm() {
  const { data: profile, isLoading } = useUserProfileQuery();
  const updateProfileMutation = useUpdateUserProfileMutation();
  const notifications = useNotifications();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      email: '',
      phoneNumber: '',
    },
  });

  // Update form when profile data is loaded
  React.useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName || '',
        email: profile.email || '',
        phoneNumber: profile.phoneNumber || '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfileMutation.mutateAsync(data);
      notifications.show('Profile updated successfully', {
        severity: 'success',
        autoHideDuration: 3000,
      });
    } catch (error) {
      notifications.show('Failed to update profile', {
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
              name="displayName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Name"
                  variant="outlined"
                  fullWidth
                  error={!!errors.displayName}
                  helperText={errors.displayName?.message}
                />
              )}
            />
          </Grid>
          <Grid>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email Address"
                  variant="outlined"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  InputProps={{ readOnly: true }}
                />
              )}
            />
          </Grid>
          <Grid>
            <Controller
              name="phoneNumber"
              control={control}
              render={({ field }) => (
                <MuiPhoneNumber
                  {...field}
                  defaultCountry="us"
                  label="Phone Number"
                  variant="outlined"
                  fullWidth
                  error={!!errors.phoneNumber}
                  helperText={errors.phoneNumber?.message}
                />
              )}
            />
          </Grid>
        </Grid>
        <Grid container spacing={3} sx={{ m: 1 }}>
          <Grid>
            <Button variant="contained" color="primary" type="submit">
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
                    displayName: profile.displayName || '',
                    email: profile.email || '',
                    phoneNumber: profile.phoneNumber || '',
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

'use client';

import React from 'react';
import {
    Button,
    Container,
    Grid,
    IconButton,
    Stack,
    TextField,
    Typography,
    Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    useBusinessShiftSettingsQuery,
    useUpdateBusinessShiftSettingsMutation,
} from '@/queries/team';
import { useInitializeUploadGroupsMutation } from '@/queries/uploads';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import { debounce } from 'lodash';

// Schema for business shift settings
const MAX_UPLOADS = 5;
const shiftSettingsFormSchema = z.object({
    uploadNames: z
        .array(z.string().min(1, { message: 'Required' }))
        .max(MAX_UPLOADS),
});

type ShiftSettingsFormData = z.infer<typeof shiftSettingsFormSchema>;

export default function BusinessShiftSettingsForm() {
    const { data: shiftSettings, isLoading } = useBusinessShiftSettingsQuery();
    const updateShiftSettingsMutation =
        useUpdateBusinessShiftSettingsMutation();
    const initializeUploadGroupsMutation = useInitializeUploadGroupsMutation();
    const notifications = useNotifications();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
        watch,
    } = useForm<ShiftSettingsFormData>({
        resolver: zodResolver(shiftSettingsFormSchema),
        defaultValues: {
            uploadNames: [],
        },
    });

    // Set up field array for uploadNames
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'uploadNames',
    } as any);

    // Watch the form values for debugging
    const formValues = watch();

    // Update form when shift settings data is loaded
    React.useEffect(() => {
        if (shiftSettings) {
            reset({
                uploadNames: shiftSettings.uploadNames || [],
            });
        }
    }, [shiftSettings, reset]);

    const onSubmit = async (data: ShiftSettingsFormData) => {
        try {
            await updateShiftSettingsMutation.mutateAsync(data);

            // Initialize upload groups after updating shift settings
            try {
                const result = await initializeUploadGroupsMutation.mutateAsync();
                notifications.show(`Shift settings updated and upload groups initialized: ${result.created} created, ${result.deactivated} deactivated`, {
                    severity: 'success',
                    autoHideDuration: 3000,
                });
            } catch (uploadError: any) {
                console.error('Error initializing upload groups:', uploadError);
                notifications.show('Shift settings updated but failed to initialize upload groups', {
                    severity: 'warning',
                    autoHideDuration: 3000,
                });
            }
        } catch (error: any) {
            notifications.show('Failed to update shift settings', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    };

    // Debounced function to handle adding a new uploadable file
    const addUploadableFile = debounce(() => {
        if (fields.length < MAX_UPLOADS) {
            append('');
        } else {
            notifications.show(
                `You can't add more than ${MAX_UPLOADS} uploadable files.`,
                {
                    severity: 'error',
                    autoHideDuration: 3000,
                }
            );
        }
    }, 250);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <Container>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Uploadable Files
                </Typography>

                <Stack
                    direction="column"
                    spacing={2}
                    sx={{ mb: 3 }}
                    maxWidth="sm"
                >
                    {fields.map((field, index) => (
                        <Stack
                            direction="row"
                            spacing={2}
                            key={field.id}
                            alignItems="center"
                        >
                            <Controller
                                name={`uploadNames.${index}`}
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label={`Upload Name ${index + 1}`}
                                        variant="outlined"
                                        fullWidth
                                        error={!!errors.uploadNames?.[index]}
                                        helperText={
                                            errors.uploadNames?.[index]?.message
                                        }
                                    />
                                )}
                            />
                            <IconButton
                                color="error"
                                onClick={() => remove(index)}
                                size="small"
                            >
                                <DeleteOutlineIcon />
                            </IconButton>
                        </Stack>
                    ))}

                    {errors.uploadNames &&
                        typeof errors.uploadNames.message === 'string' && (
                            <Typography color="error" variant="body2">
                                {errors.uploadNames.message}
                            </Typography>
                        )}
                </Stack>

                <Button
                    startIcon={<AddIcon />}
                    variant="outlined"
                    onClick={addUploadableFile}
                    sx={{ mb: 3 }}
                    disabled={fields.length >= MAX_UPLOADS}
                >
                    Add Uploadable File
                </Button>

                <Grid container spacing={3}>
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
                                if (shiftSettings) {
                                    reset({
                                        uploadNames:
                                            shiftSettings.uploadNames || [],
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

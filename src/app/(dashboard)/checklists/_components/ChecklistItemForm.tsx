import React from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
    Switch,
    Paper,
    Grid,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define form validation schema
const checklistItemFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    geoLocationEnabled: z.boolean().default(false),
    commentsOption: z.enum(['required', 'optional', 'off']).default('optional'),
    uploadOption: z.enum(['required', 'optional', 'off']).default('off'),
});

type ChecklistItemFormProps = {
    item?: any;
    onSubmit: (data: any) => void;
    onCancel: () => void;
};

export default function ChecklistItemForm({ item, onSubmit, onCancel }: ChecklistItemFormProps) {
    const isEditing = !!item;

    // Setup form
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(checklistItemFormSchema),
        defaultValues: {
            name: item?.name || '',
            geoLocationEnabled: item?.geoLocationEnabled || false,
            commentsOption: item?.commentsOption || 'optional',
            uploadOption: item?.uploadOption || 'off',
        },
    });

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
                {isEditing ? 'Edit Item' : 'Add New Item'}
            </Typography>

            <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Item Name"
                                    fullWidth
                                    error={!!errors.name}
                                    helperText={errors.name?.message}
                                    required
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <FormControl component="fieldset" sx={{ mt: 2 }}>
                            <FormControlLabel
                                control={
                                    <Controller
                                        name="geoLocationEnabled"
                                        control={control}
                                        render={({ field: { value, onChange, ...field } }) => (
                                            <Switch
                                                checked={value}
                                                onChange={onChange}
                                                {...field}
                                            />
                                        )}
                                    />
                                }
                                label="Enable Geolocation"
                            />
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">Comments</FormLabel>
                            <Controller
                                name="commentsOption"
                                control={control}
                                render={({ field }) => (
                                    <RadioGroup row {...field}>
                                        <FormControlLabel
                                            value="required"
                                            control={<Radio />}
                                            label="Required"
                                        />
                                        <FormControlLabel
                                            value="optional"
                                            control={<Radio />}
                                            label="Optional"
                                        />
                                        <FormControlLabel
                                            value="off"
                                            control={<Radio />}
                                            label="Off"
                                        />
                                    </RadioGroup>
                                )}
                            />
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">File Upload</FormLabel>
                            <Controller
                                name="uploadOption"
                                control={control}
                                render={({ field }) => (
                                    <RadioGroup row {...field}>
                                        <FormControlLabel
                                            value="required"
                                            control={<Radio />}
                                            label="Required"
                                        />
                                        <FormControlLabel
                                            value="optional"
                                            control={<Radio />}
                                            label="Optional"
                                        />
                                        <FormControlLabel
                                            value="off"
                                            control={<Radio />}
                                            label="Off"
                                        />
                                    </RadioGroup>
                                )}
                            />
                        </FormControl>
                    </Grid>
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                    <Button onClick={onCancel} sx={{ mr: 1 }}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit(onSubmit)}
                        variant="contained" 
                        color="primary"
                    >
                        {isEditing ? 'Update Item' : 'Add Item'}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

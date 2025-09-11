'use client';

import React, { useEffect, useState } from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    Container,
    Grid,
    // IconButton,
    // InputAdornment,
    Stack,
    TextField,
    // Tooltip,
    Typography,
} from '@mui/material';
// import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import { Controller, useForm } from 'react-hook-form';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import {
    useLocationCreateMutation,
    useLocationGroupsQuery,
    useLocationQuery,
    useLocationUpdateMutation,
} from '@/queries/locations';
import DepartmentAutocomplete from '@/components/form/DepartmentAutocomplete';
import LocationPickerMap from './LocationPickerMap';

// Type for the form data
type LocationFormData = {
    id?: string;
    name: string;
    address: string;
    //latitude: number;
    //longitude: number;
    groupId?: string;
    defaultDepartmentId?: string;
    tags?: string[];
};

// Props for the LocationForm component
type LocationFormProps = {
    locationId?: string;
    onSubmit?: (data: LocationFormData) => void;
    onCancel?: () => void;
};

export default function LocationForm({
    locationId,
    onSubmit,
    onCancel,
}: LocationFormProps) {
    const notifications = useNotifications();
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [isGuessingAddress, setIsGuessingAddress] = useState(false);

    // Fetch location data if editing
    const { data: location } = useLocationQuery(locationId || '');

    // Fetch location groups
    const { data: locationGroupsData } = useLocationGroupsQuery();
    const locationGroups = locationGroupsData || [];

    // Mutations for creating and updating locations
    const createMutation = useLocationCreateMutation();
    const updateMutation = useLocationUpdateMutation();

    // Set up form with react-hook-form
    const {
        control,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
        reset,
        watch,
    } = useForm<LocationFormData>({
        defaultValues: {
            name: '',
            address: '',
            //latitude: 40.7128, // Default to New York City
            //longitude: -74.006,
            groupId: undefined,
            defaultDepartmentId: undefined,
            tags: [],
        },
    });

    // Watch coordinates for the map
    //const latitude = watch('latitude');
    //const longitude = watch('longitude');

    // Initialize form with location data if editing
    useEffect(() => {
        if (location) {
            reset({
                name: location.name,
                address: location.address,
                //latitude: location.latitude,
                //longitude: location.longitude,
                groupId: location.groupId || undefined,
                defaultDepartmentId: location.defaultDepartmentId || undefined,
                tags: location.tags || [],
            });
            setSelectedTags(location.tags || []);
        }
    }, [location, reset]);

    // Handle map marker drag
    // const handleMapPositionChange = (lat: number, lng: number) => {
    //     setValue('latitude', lat);
    //     setValue('longitude', lng);
    // };

    // Handle getting coordinates from address
    // const handleGetCoordinatesFromAddress = async () => {
    //     try {
    //         setIsGuessingAddress(true);
    //
    //         // Get current address from form
    //         const address = watch('address');
    //
    //         if (!address) {
    //             notifications.show('Please enter an address first', {
    //                 severity: 'warning',
    //             });
    //             return;
    //         }
    //
    //         // Call Nominatim API for forward geocoding
    //         const response = await fetch(
    //             `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
    //             {
    //                 headers: {
    //                     'Accept-Language': 'en',
    //                     'User-Agent': 'EagleShifts Location Manager',
    //                 },
    //             }
    //         );
    //
    //         if (!response.ok) {
    //             throw new Error('Failed to fetch coordinates');
    //         }
    //
    //         const data = await response.json();
    //
    //         if (data && data.length > 0) {
    //             // Update coordinates fields
    //             setValue('latitude', parseFloat(data[0].lat));
    //             setValue('longitude', parseFloat(data[0].lon));
    //             notifications.show('Coordinates updated successfully', {
    //                 severity: 'success',
    //             });
    //         } else {
    //             notifications.show(
    //                 'Could not find coordinates for this address',
    //                 { severity: 'warning' }
    //             );
    //         }
    //     } catch (error) {
    //         console.error('Error getting coordinates:', error);
    //         notifications.show('Failed to get coordinates', {
    //             severity: 'error',
    //         });
    //     } finally {
    //         setIsGuessingAddress(false);
    //     }
    // };

    // Handle getting address from name
    // const handleGetAddressFromName = async () => {
    //     try {
    //         setIsGuessingAddress(true);
    //
    //         // Get current name from form
    //         const name = watch('name');
    //
    //         if (!name) {
    //             notifications.show('Please enter a location name first', {
    //                 severity: 'warning',
    //             });
    //             return;
    //         }
    //
    //         // Call Nominatim API for search by name
    //         const response = await fetch(
    //             `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}&limit=1`,
    //             {
    //                 headers: {
    //                     'Accept-Language': 'en',
    //                     'User-Agent': 'EagleShifts Location Manager',
    //                 },
    //             }
    //         );
    //
    //         if (!response.ok) {
    //             throw new Error('Failed to fetch address');
    //         }
    //
    //         const data = await response.json();
    //
    //         if (data && data.length > 0) {
    //             // Update address field
    //             setValue('address', data[0].display_name);
    //             notifications.show('Address updated successfully', {
    //                 severity: 'success',
    //             });
    //         } else {
    //             notifications.show('Could not find address for this name', {
    //                 severity: 'warning',
    //             });
    //         }
    //     } catch (error) {
    //         console.error('Error getting address:', error);
    //         notifications.show('Failed to get address', { severity: 'error' });
    //     } finally {
    //         setIsGuessingAddress(false);
    //     }
    // };

    // Handle tag input
    const handleAddTag = () => {
        if (newTag && !selectedTags.includes(newTag)) {
            const updatedTags = [...selectedTags, newTag];
            setSelectedTags(updatedTags);
            setValue('tags', updatedTags);
            setNewTag('');
        }
    };

    const handleDeleteTag = (tagToDelete: string) => {
        const updatedTags = selectedTags.filter((tag) => tag !== tagToDelete);
        setSelectedTags(updatedTags);
        setValue('tags', updatedTags);
    };

    // Form submission handler
    const onFormSubmit = async (data: LocationFormData) => {
        try {
            if (locationId) {
                // Update existing location
                await updateMutation.mutateAsync({
                    id: locationId,
                    ...data,
                });
                notifications.show('Location updated successfully', {
                    severity: 'success',
                    autoHideDuration: 3000,
                });
            } else {
                // Create new location
                const result = await createMutation.mutateAsync(data);
                notifications.show('Location created successfully', {
                    severity: 'success',
                    autoHideDuration: 3000,
                });

                // Return the created location ID if available
                if (result && result.id) {
                    data.id = result.id;
                }
            }

            // Call the onSubmit callback if provided
            if (onSubmit) {
                onSubmit(data);
            }
        } catch (error: any) {
            console.error('Error saving location:', error);
            notifications.show(error.message || 'Failed to save location', {
                severity: 'error',
            });
        }
    };

    return (
        <Container>
            <form onSubmit={handleSubmit(onFormSubmit)}>
                <Stack spacing={3}>
                    <Typography variant="h6">
                        {locationId ? 'Edit Location' : 'Create New Location'}
                    </Typography>

                    {/* Name */}
                    <Controller
                        name="name"
                        control={control}
                        rules={{ required: 'Name is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Name"
                                variant="outlined"
                                fullWidth
                                error={!!errors.name}
                                helperText={errors.name?.message}
                            />
                        )}
                    />

                    {/* Address */}
                    <Controller
                        name="address"
                        control={control}
                        rules={{ required: 'Address is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Address"
                                variant="outlined"
                                fullWidth
                                error={!!errors.address}
                                helperText={errors.address?.message}
                                // InputProps={{
                                //     endAdornment: (
                                //         <InputAdornment position="end">
                                //             <Tooltip title="Get address from name">
                                //                 <IconButton
                                //                     edge="end"
                                //                     onClick={
                                //                         handleGetAddressFromName
                                //                     }
                                //                     disabled={isGuessingAddress}
                                //                     aria-label="get address from name"
                                //                 >
                                //                     <LocationSearchingIcon
                                //                         color={
                                //                             isGuessingAddress
                                //                                 ? 'disabled'
                                //                                 : 'primary'
                                //                         }
                                //                     />
                                //                 </IconButton>
                                //             </Tooltip>
                                //         </InputAdornment>
                                //     ),
                                // }}
                            />
                        )}
                    />

                    {/* Group */}
                    <Controller
                        name="groupId"
                        control={control}
                        render={({ field }) => (
                            <Autocomplete
                                value={
                                    field.value
                                        ? locationGroups.find(
                                              (group) =>
                                                  group.id === field.value
                                          ) || null
                                        : null
                                }
                                onChange={(_, newValue) => {
                                    field.onChange(newValue?.id || undefined);
                                }}
                                options={locationGroups}
                                getOptionLabel={(option) => option.name}
                                renderOption={(props, option) => (
                                    <li {...props} key={option.id}>
                                        <Box
                                            key={option.id}
                                            component="span"
                                            sx={{
                                                width: 14,
                                                height: 14,
                                                mr: 1,
                                                backgroundColor: option.color,
                                                display: 'inline-block',
                                                borderRadius: '50%',
                                            }}
                                        />
                                        {option.name}
                                    </li>
                                )}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Group (Optional)"
                                        variant="outlined"
                                    />
                                )}
                            />
                        )}
                    />

                    {/* Default Department */}
                    <Controller
                        name="defaultDepartmentId"
                        control={control}
                        render={({ field }) => (
                            <DepartmentAutocomplete
                                value={field.value || null}
                                onChange={(value) => field.onChange(value)}
                            />
                        )}
                    />

                    {/* Tags */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Tags (Optional)
                        </Typography>
                        <Grid container spacing={1} alignItems="center">
                            <Grid>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    label="Add Tag"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddTag();
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid>
                                <Button
                                    variant="contained"
                                    onClick={handleAddTag}
                                    disabled={!newTag}
                                >
                                    Add
                                </Button>
                            </Grid>
                        </Grid>
                        <Box
                            sx={{
                                mt: 1,
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 0.5,
                            }}
                        >
                            {selectedTags.map((tag) => (
                                <Chip
                                    key={tag}
                                    label={tag}
                                    onDelete={() => handleDeleteTag(tag)}
                                />
                            ))}
                        </Box>
                    </Box>

                    {/* Map for selecting coordinates */}
                    {/*<Box>*/}
                    {/*    <Box*/}
                    {/*        display="flex"*/}
                    {/*        alignItems="center"*/}
                    {/*        justifyContent="space-between"*/}
                    {/*        mb={1}*/}
                    {/*    >*/}
                    {/*        <Typography variant="subtitle2">*/}
                    {/*            Select Location on Map*/}
                    {/*        </Typography>*/}
                    {/*        <Button*/}
                    {/*            variant="contained"*/}
                    {/*            color="primary"*/}
                    {/*            onClick={handleGetCoordinatesFromAddress}*/}
                    {/*            disabled={isGuessingAddress}*/}
                    {/*            startIcon={<LocationSearchingIcon />}*/}
                    {/*        >*/}
                    {/*            Get coordinates from address*/}
                    {/*        </Button>*/}
                    {/*    </Box>*/}
                    {/*    <Box sx={{ height: 400, width: '100%', mb: 2 }}>*/}
                    {/*        <LocationPickerMap*/}
                    {/*            latitude={latitude}*/}
                    {/*            longitude={longitude}*/}
                    {/*            onPositionChange={handleMapPositionChange}*/}
                    {/*        />*/}
                    {/*    </Box>*/}
                    {/*</Box>*/}

                    {/* Coordinates */}
                    {/*<Grid container spacing={2}>*/}
                    {/*    <Grid size={{ xs: 6 }}>*/}
                    {/*        <Controller*/}
                    {/*            name="latitude"*/}
                    {/*            control={control}*/}
                    {/*            rules={{ required: 'Latitude is required' }}*/}
                    {/*            render={({ field }) => (*/}
                    {/*                <TextField*/}
                    {/*                    {...field}*/}
                    {/*                    label="Latitude"*/}
                    {/*                    variant="outlined"*/}
                    {/*                    fullWidth*/}
                    {/*                    type="number"*/}
                    {/*                    inputProps={{*/}
                    {/*                        step: 0.000001,*/}
                    {/*                    }}*/}
                    {/*                    error={!!errors.latitude}*/}
                    {/*                    helperText={errors.latitude?.message}*/}
                    {/*                />*/}
                    {/*            )}*/}
                    {/*        />*/}
                    {/*    </Grid>*/}
                    {/*    <Grid size={{ xs: 6 }}>*/}
                    {/*        <Controller*/}
                    {/*            name="longitude"*/}
                    {/*            control={control}*/}
                    {/*            rules={{ required: 'Longitude is required' }}*/}
                    {/*            render={({ field }) => (*/}
                    {/*                <TextField*/}
                    {/*                    {...field}*/}
                    {/*                    label="Longitude"*/}
                    {/*                    variant="outlined"*/}
                    {/*                    fullWidth*/}
                    {/*                    type="number"*/}
                    {/*                    inputProps={{*/}
                    {/*                        step: 0.000001,*/}
                    {/*                    }}*/}
                    {/*                    error={!!errors.longitude}*/}
                    {/*                    helperText={errors.longitude?.message}*/}
                    {/*                />*/}
                    {/*            )}*/}
                    {/*        />*/}
                    {/*    </Grid>*/}
                    {/*</Grid>*/}

                    {/* Form Actions */}
                    <Stack
                        direction="row"
                        spacing={2}
                        justifyContent="flex-end"
                    >
                        {onCancel && (
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={onCancel}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Saving...'
                                : locationId
                                  ? 'Update Location'
                                  : 'Create Location'}
                        </Button>
                    </Stack>
                </Stack>
            </form>
        </Container>
    );
}

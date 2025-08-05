'use client';

import { styled } from '@mui/system';
import {
    Autocomplete,
    Box,
    IconButton,
    InputAdornment,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Skeleton,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';
import { Add, LocationOn, Visibility } from '@mui/icons-material';
import { useLocationsQuery } from '@/queries/locations';
import { useAuthQuery } from '@/queries/users';

// Type for the location option
type LocationOption = {
    id: string;
    name: string;
    address: string;
    groupName?: string;
    groupColor?: string;
};

export type LocationAutocompleteProps = Omit<
    React.ComponentProps<typeof Autocomplete>,
    'onChange' | 'options' | 'renderInput' | 'renderOption'
> & {
    value: string | null;
    onChange: (locationId: string | null) => void;
    disabled?: boolean;
    onCreateNew?: () => void;
    onViewLocation?: (locationId: string) => void;
};

// Counter to track render calls
let renderCount = 0;

export default function LocationAutocomplete(props: LocationAutocompleteProps) {
    console.log('LocationAutocomplete render', {
        value: props.value,
        timestamp: new Date().toISOString(),
        propsRef: props,
    });

    const {
        value,
        onChange,
        disabled,
        onCreateNew,
        onViewLocation,
        ...acProps
    } = props;
    const [inputValue, setInputValue] = useState('');

    // Get user role to determine if they can create new locations
    const { data: session, isLoading: isSessionLoading } = useAuthQuery();
    const isAdmin =
        session?.user?.role === 'admin' || session?.user?.role === 'owner';

    // Fetch locations
    const { data: locationsData, isLoading: isLocationsLoading } =
        useLocationsQuery({
            name: inputValue.length > 2 ? inputValue : undefined, // Only filter if at least 3 characters
        });

    // Combine loading states
    const isLoading = isSessionLoading || isLocationsLoading;

    // Transform locations into options for the autocomplete
    const locationOptions = useMemo(() => {
        if (!locationsData?.locations) return [];

        return locationsData.locations.map((location) => ({
            id: location.id,
            name: location.name,
            address: location.address,
            groupName: location.group?.name,
            groupColor: location.group?.color,
        }));
    }, [locationsData]);

    // Find the selected location
    const selectedLocation = useMemo(() => {
        if (!value || !locationOptions.length) return null;
        return locationOptions.find((option) => option.id === value) || null;
    }, [value, locationOptions]);

    // Handle view location button click
    const handleViewLocation = useCallback(() => {
        if (value && onViewLocation) {
            onViewLocation(value);
        }
    }, [value, onViewLocation]);

    if (isLoading) {
        return <Skeleton variant="rectangular" height={56} />;
    }
    return (
        <Autocomplete
            {...acProps}
            disabled={disabled}
            value={selectedLocation}
            onChange={(_, option: any) => {
                onChange(option ? option.id : null);
            }}
            inputValue={inputValue}
            onInputChange={(x, newInputValue) => {
                console.log('INPUTCHANGE');
                console.log({ x, newInputValue });
                setInputValue(newInputValue);
            }}
            options={locationOptions}
            getOptionLabel={(option: any) => option.name}
            isOptionEqualToValue={(option: any, value) =>
                option.id === value.id
            }
            renderOption={(props, option) => (
                <MenuItem {...props} key={option.id} value={option.id}>
                    <ListItemIcon key={'icon-' + option.id}>
                        <LocationOn
                            style={{
                                color: option.groupColor || 'inherit',
                            }}
                        />
                    </ListItemIcon>
                    <ListItemText key={'text-' + option.id}>
                        <Typography variant="body1">{option.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                            {option.address}
                            {option.groupName && ` • ${option.groupName}`}
                        </Typography>
                    </ListItemText>
                </MenuItem>
            )}
            renderInput={(params) => {
                console.log('LocationAutocomplete renderInput called', {
                    timestamp: new Date().toISOString(),
                    renderCount: ++renderCount,
                });

                // Simple approach: just render the TextField with minimal props
                return (
                    <TextField
                        {...params}
                        label="Location"
                        placeholder="Search for a location"
                        slotProps={{
                            input: {
                                ...params.InputProps,
                                endAdornment: (
                                    <React.Fragment>
                                        {params.InputProps.endAdornment}
                                        {value && onViewLocation && (
                                            <Tooltip title="View location details">
                                                <IconButton
                                                    onClick={handleViewLocation}
                                                    disabled={disabled}
                                                    size="small"
                                                >
                                                    <Visibility />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {isAdmin && onCreateNew && !value && (
                                            <Tooltip title="Create new location">
                                                <IconButton
                                                    onClick={onCreateNew}
                                                    disabled={disabled}
                                                    size="small"
                                                >
                                                    <Add />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </React.Fragment>
                                ),
                            },
                        }}
                    />
                );
            }}
        />
    );
}

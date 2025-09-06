'use client';

import { styled } from '@mui/system';
import {
    Autocomplete,
    Box,
    IconButton,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Skeleton,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';
import { Add, Close, FolderOutlined, Visibility } from '@mui/icons-material';
import { useDepartmentsQuery, useDepartmentQuery } from '@/queries/departments';
import { useAuthQuery } from '@/queries/users';

// Type for the department option
type DepartmentOption = {
    id: string;
    name: string;
    description?: string;
    color?: string;
};

export type DepartmentAutocompleteProps = Omit<
    React.ComponentProps<typeof Autocomplete>,
    'onChange' | 'options' | 'renderInput' | 'renderOption'
> & {
    value: string | null;
    onChange: (departmentId: string | null) => void;
    disabled?: boolean;
    onCreateNew?: () => void;
    onViewDepartment?: (departmentId: string) => void;
    error?: boolean;
    helperText?: React.ReactNode;
};

export default function DepartmentAutocomplete(props: DepartmentAutocompleteProps) {
    const {
        value,
        onChange,
        disabled,
        onCreateNew,
        onViewDepartment,
        error,
        helperText,
        ...acProps
    } = props;
    const [inputValue, setInputValue] = useState('');

    // Get user role to determine if they can create new departments
    const { data: session, isLoading: isSessionLoading } = useAuthQuery();
    const isAdmin =
        session?.user?.role === 'admin' || session?.user?.role === 'owner';

    // Fetch departments
    const { data: departmentsData, isLoading: isDepartmentsLoading } =
        useDepartmentsQuery({
            search: inputValue.length > 2 ? inputValue : undefined, // Only filter if at least 3 characters
        });

    // Combine loading states
    const isLoading = isSessionLoading;

    // Transform departments into options for the autocomplete
    const departmentOptions = useMemo(() => {
        if (!departmentsData?.departments) return [];

        return departmentsData.departments.map((department) => ({
            id: department.id,
            name: department.name,
            description: department.description,
            color: department.color,
        }));
    }, [departmentsData]);

    // Fetch the selected department details if needed
    const { data: selectedDepartmentData } = useDepartmentQuery(value || '');

    // Find the selected department
    const selectedDepartment = useMemo(() => {
        if (!value) return null;

        // First try to find it in the current search results
        const foundInOptions = departmentOptions.find(
            (option) => option.id === value
        );
        if (foundInOptions) return foundInOptions;

        // If not found in options but we have the data from the direct query, use that
        if (selectedDepartmentData) {
            return {
                id: selectedDepartmentData.id,
                name: selectedDepartmentData.name,
                description: selectedDepartmentData.description,
                color: selectedDepartmentData.color,
            };
        }

        // Fallback to a placeholder to maintain selection state
        return {
            id: value,
            name: 'Loading...',
            description: '',
            color: undefined,
        };
    }, [value, departmentOptions, selectedDepartmentData]);

    // Handle view department button click
    const handleViewDepartment = useCallback(() => {
        if (value && onViewDepartment) {
            onViewDepartment(value);
        }
    }, [value, onViewDepartment]);

    if (isLoading) {
        return <Skeleton variant="rectangular" height={56} />;
    }
    return (
        <Autocomplete
            {...acProps}
            disabled={disabled}
            value={selectedDepartment}
            onChange={(_, option: any) => {
                onChange(option ? option.id : null);
            }}
            inputValue={inputValue}
            onInputChange={(event, newInputValue, reason) => {
                // Only update the input value if it's a user input event
                if (reason === 'input') {
                    setInputValue(newInputValue);
                }
            }}
            options={departmentOptions}
            getOptionLabel={(option: any) => option.name}
            isOptionEqualToValue={(option: any, value) =>
                option.id === value.id
            }
            filterOptions={(x) => x} // Disable built-in filtering to use server-side filtering
            renderOption={(props, option) => (
                <MenuItem {...props} key={option.id} value={option.id}>
                    <ListItemIcon key={'icon-' + option.id}>
                        <FolderOutlined
                            style={{
                                color: option.color || 'inherit',
                            }}
                        />
                    </ListItemIcon>
                    <ListItemText key={'text-' + option.id}>
                        <Typography variant="body1">{option.name}</Typography>
                        {option.description && (
                            <Typography variant="caption" color="textSecondary">
                                {option.description}
                            </Typography>
                        )}
                    </ListItemText>
                </MenuItem>
            )}
            renderInput={(params) => {
                // If a department is selected, show the icon and name and description view
                if (selectedDepartment) {
                    return (
                        <React.Fragment>
                            {/* Hidden TextField to satisfy MUI Autocomplete's requirement for an input element */}
                            <div style={{ display: 'none' }}>
                                <TextField {...params} />
                            </div>
                            <Box
                                sx={{
                                    border: '1px solid rgba(0, 0, 0, 0.23)',
                                    borderRadius: 1,
                                    p: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    '&:hover': {
                                        borderColor: 'rgba(0, 0, 0, 0.87)',
                                    },
                                }}
                            >
                                <FolderOutlined
                                    style={{
                                        color:
                                            selectedDepartment.color ||
                                            'inherit',
                                        marginRight: 8,
                                    }}
                                />
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="body1">
                                        {selectedDepartment.name}
                                    </Typography>
                                    {selectedDepartment.description && (
                                        <Typography
                                            variant="caption"
                                            color="textSecondary"
                                        >
                                            {selectedDepartment.description}
                                        </Typography>
                                    )}
                                </Box>
                                <Tooltip title="Clear selection">
                                    <IconButton
                                        onClick={() => onChange(null)}
                                        disabled={disabled}
                                        size="small"
                                    >
                                        <Close />
                                    </IconButton>
                                </Tooltip>
                                {onViewDepartment && (
                                    <Tooltip title="View department details">
                                        <IconButton
                                            onClick={handleViewDepartment}
                                            disabled={disabled}
                                            size="small"
                                        >
                                            <Visibility />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Box>
                        </React.Fragment>
                    );
                }

                // If no department is selected, show the regular search field
                return (
                    <TextField
                        {...params}
                        label="Department (Optional)"
                        placeholder="Search for a department"
                        error={error}
                        helperText={helperText}
                        slotProps={{
                            input: {
                                ...params.InputProps,
                                endAdornment: (
                                    <React.Fragment>
                                        {params.InputProps.endAdornment}
                                        {isAdmin && onCreateNew && (
                                            <Tooltip title="Create new department">
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
import React from 'react';
import {
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Grid,
    Button,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import { LogActionType } from '@/lib/logging';

import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import 'luxon';

// Define the filter state type
export interface LogFilterState {
    actionType?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
    page: number;
    limit: number;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
}

interface LogFiltersProps {
    filters: LogFilterState;
    setFilters: React.Dispatch<React.SetStateAction<LogFilterState>>;
    logTypes: string[];
    userLookup: Record<string, { id: string; name?: string; email: string }>;
}

// Map action types to human-readable descriptions
const actionTypeDescriptions: Record<string, string> = {
    [LogActionType.LOGIN]: 'User Login',
    [LogActionType.SHIFT_CREATE]: 'Shift Created',
    [LogActionType.SHIFT_UPDATE]: 'Shift Updated',
    [LogActionType.SHIFT_DELETE]: 'Shift Deleted',
    [LogActionType.SHIFT_ASSIGNMENT_CREATE]: 'Shift Assignment Created',
    [LogActionType.SHIFT_ASSIGNMENT_UPDATE]: 'Shift Assignment Updated',
    [LogActionType.SHIFT_ASSIGNMENT_DELETE]: 'Shift Assignment Deleted',
    [LogActionType.TEAM_INVITE_SEND]: 'Team Invitation Sent',
    [LogActionType.TEAM_INVITE_ACCEPT]: 'Team Invitation Accepted',
    [LogActionType.SHIFT_REQUEST_CREATE]: 'Shift Request Created',
    [LogActionType.SHIFT_REQUEST_UPDATE]: 'Shift Request Updated',
    [LogActionType.USER_STATUS_CHANGE]: 'User Status Changed',
};

export function LogFilters({
    filters,
    setFilters,
    logTypes,
    userLookup,
}: LogFiltersProps) {
    // Convert user lookup to array for select dropdown
    const users = Object.values(userLookup).map((user) => ({
        id: user.id,
        name: user.name || user.email,
    }));

    // Handle filter changes
    const handleFilterChange = (field: keyof LogFilterState, value: any) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
            // Reset to first page when filters change
            page: 0,
        }));
    };

    // Handle date changes
    const handleDateChange = (
        field: 'startDate' | 'endDate',
        date: dayjs.Dayjs | null
    ) => {
        if (date) {
            // Format date as ISO string for API
            const formattedDate = date.format('YYYY-MM-DD');
            handleFilterChange(field, formattedDate);
        } else {
            handleFilterChange(field, undefined);
        }
    };

    // Reset all filters
    const handleResetFilters = () => {
        setFilters({
            actionType: undefined,
            startDate: undefined,
            endDate: undefined,
            userId: undefined,
            page: 0,
            limit: filters.limit, // Keep the current limit
            sortBy: 'timestamp',
            sortDirection: 'desc',
        });
    };

    return (
        <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
                {/* Action Type Filter */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel id="action-type-label" shrink>
                            Action Type
                        </InputLabel>
                        <Select
                            labelId="action-type-label"
                            id="action-type"
                            value={filters.actionType || ''}
                            label="Action Type"
                            onChange={(e) =>
                                handleFilterChange(
                                    'actionType',
                                    e.target.value || undefined
                                )
                            }
                            displayEmpty
                        >
                            <MenuItem value="">All Actions</MenuItem>
                            {logTypes.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {actionTypeDescriptions[type] || type}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* User Filter */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel id="user-label" shrink>
                            User
                        </InputLabel>
                        <Select
                            labelId="user-label"
                            id="user"
                            value={filters.userId || ''}
                            label="User"
                            onChange={(e) =>
                                handleFilterChange(
                                    'userId',
                                    e.target.value || undefined
                                )
                            }
                            displayEmpty
                        >
                            <MenuItem value="">All Users</MenuItem>
                            {users.map((user) => (
                                <MenuItem key={user.id} value={user.id}>
                                    {user.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Date Range Filters */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <LocalizationProvider dateAdapter={AdapterLuxon}>
                        <DatePicker
                            label="Start Date"
                            value={
                                filters.startDate
                                    ? dayjs(filters.startDate)
                                    : null
                            }
                            onChange={(date) =>
                                handleDateChange('startDate', date as any)
                            }
                            slotProps={{
                                textField: { size: 'small', fullWidth: true },
                            }}
                        />
                    </LocalizationProvider>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            label="End Date"
                            value={
                                filters.endDate ? dayjs(filters.endDate) : null
                            }
                            onChange={(date) =>
                                handleDateChange('endDate', date as any)
                            }
                            slotProps={{
                                textField: { size: 'small', fullWidth: true },
                            }}
                        />
                    </LocalizationProvider>
                </Grid>

                {/* Filter Actions */}
                <Grid size={{ xs: 12, md: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<FilterListIcon />}
                            size="small"
                            onClick={() => {
                                // This is just to trigger a re-fetch with current filters
                                setFilters((prev) => ({ ...prev }));
                            }}
                        >
                            Apply
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<ClearIcon />}
                            size="small"
                            onClick={handleResetFilters}
                        >
                            Reset
                        </Button>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}

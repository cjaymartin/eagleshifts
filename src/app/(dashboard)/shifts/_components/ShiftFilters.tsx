import React, { useMemo, useState } from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import { useForm, Controller } from 'react-hook-form';
import dayjs from 'dayjs';
import { useAuthQuery, useTeamUsersQuery } from '@/queries/users';
import { useLocationsQuery, useLocationGroupsQuery } from '@/queries/locations';
import { PickerValue } from '@mui/x-date-pickers/internals';

const defaultFilters: ShiftFormFilterSchema = {
    title: '',
    locationIds: [],
    locationGroupIds: [],
    startDate: null as Date | null,
    endDate: null as Date | null,
    assigned: [],
    unfilled: { label: 'Any', id: 'any' },
};

type ShiftFormFilterSchema = {
    title: string;
    locationIds: { id: string; name: string }[];
    locationGroupIds: { id: string; name: string }[];
    startDate: Date | null;
    endDate: Date | null;
    assigned: { id: string; name: string }[];
    unfilled: { label: string; id: string };
};

export type ShiftFilterSchema = {
    title: string;
    locationIds: string[];
    locationGroupIds: string[];
    startDate: Date | undefined;
    endDate: Date | undefined;
    assigned: string[];
    unfilled: string;
};

export function ShiftFilters({
    filters = defaultFilters,
    setFilters,
}: {
    filters?: ShiftFormFilterSchema;
    setFilters: (filters: ShiftFilterSchema) => void;
}) {
    const { data: session } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';
    const isAdmin = ['admin', 'owner'].includes(role);

    const { data: teamMembers } = useTeamUsersQuery();
    const { data: locationsData } = useLocationsQuery();
    const locations = useMemo(() => {
        if (!locationsData?.locations) return [];
        return locationsData.locations.map((location) => ({
            id: location.id,
            name: location.name,
        }));
    }, [locationsData]);
    const { data: locationGroupsData } = useLocationGroupsQuery();
    const locationGroups = useMemo(() => {
        if (!locationGroupsData) return [];
        return locationGroupsData.map((group) => ({
            id: group.id,
            name: group.name,
        }));
    }, [locationGroupsData]);

    const { control, handleSubmit, reset, formState } =
        useForm<ShiftFormFilterSchema>({
            defaultValues: filters,
        });

    const onSubmit = (data: ShiftFormFilterSchema) => {
        // Format date fields
        const formattedFilters: ShiftFilterSchema = {
            ...data,
            startDate: data.startDate
                ? dayjs.utc(data.startDate).toDate()
                : undefined,
            endDate: data.endDate
                ? dayjs.utc(data.endDate).toDate()
                : undefined,
            assigned: data.assigned.map((user) => user.id),
            unfilled: data.unfilled?.id,
            locationIds: data.locationIds.map((loc) => loc.id),
            locationGroupIds: data.locationGroupIds.map((group) => group.id),
        };
        setFilters(formattedFilters);
        setTimeout(() => {
            reset(
                {},
                { keepValues: true, keepDirty: false, keepSubmitCount: true }
            );
        }, 50);
    };

    const handleRemoveFilters = () => {
        reset(defaultFilters);
        onSubmit(defaultFilters);
    };

    //todo: WHY does formState.isDirty not work?  It sets false, but then comes back and sets true on its own
    const isFormDirty = Object.keys(formState.dirtyFields).length > 0;
    const isFormEmpty = formState.submitCount == 0;

    // Function to get active filter count
    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.title) count++;
        if (filters.locationIds.length > 0) count++;
        if (filters.locationGroupIds.length > 0) count++;
        if (filters.startDate) count++;
        if (filters.endDate) count++;
        if (filters.assigned && filters.assigned.length > 0) count++;
        if (filters.unfilled && filters.unfilled.id !== 'any') count++;
        return count;
    };

    const [modalOpen, setModalOpen] = useState(false);
    const activeFilterCount = getActiveFilterCount();

    // Function to render active filter summary
    const renderFilterSummary = () => {
        if (activeFilterCount === 0) return null;

        const filterChips = [];

        if (filters.title) {
            filterChips.push(
                <Chip
                    key="title"
                    label={`Title: ${filters.title}`}
                    size="small"
                    variant="outlined"
                />
            );
        }

        if (filters.locationIds.length > 0) {
            filterChips.push(
                <Chip
                    key="locations"
                    label={`Locations: ${filters.locationIds.length}`}
                    size="small"
                    variant="outlined"
                />
            );
        }

        if (filters.locationGroupIds.length > 0) {
            filterChips.push(
                <Chip
                    key="locationGroups"
                    label={`Location Groups: ${filters.locationGroupIds.length}`}
                    size="small"
                    variant="outlined"
                />
            );
        }

        if (filters.startDate) {
            filterChips.push(
                <Chip
                    key="startDate"
                    label={`From: ${dayjs(filters.startDate).format('MMM D, YYYY')}`}
                    size="small"
                    variant="outlined"
                />
            );
        }

        if (filters.endDate) {
            filterChips.push(
                <Chip
                    key="endDate"
                    label={`To: ${dayjs(filters.endDate).format('MMM D, YYYY')}`}
                    size="small"
                    variant="outlined"
                />
            );
        }

        if (filters.assigned && filters.assigned.length > 0) {
            filterChips.push(
                <Chip
                    key="assigned"
                    label={`Assigned: ${filters.assigned.length}`}
                    size="small"
                    variant="outlined"
                />
            );
        }

        console.log({ filters });

        if (filters.unfilled && (filters as any).unfilled != 'any') {
            const filledLabel = {
                unfilled: 'Open',
                filled: 'Filled',
            }[(filters as any).unfilled as string];
            if (filledLabel) {
                filterChips.push(
                    <Chip
                        key="status"
                        label={`Status: ${filledLabel}`}
                        size="small"
                        variant="outlined"
                    />
                );
            }
        }

        return (
            <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}
            >
                {filterChips}
                <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    onClick={handleRemoveFilters}
                >
                    Clear All
                </Button>
            </Stack>
        );
    };

    const handleOpenModal = () => {
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const handleApplyFilters = (data: ShiftFormFilterSchema) => {
        onSubmit(data);
        handleCloseModal();
    };

    return (
        <Container sx={{ p: 2 }}>
            <Paper
                elevation={2}
                sx={{
                    borderRadius: 2,
                    p: 2,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <FilterListIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">
                            Filters{' '}
                            {activeFilterCount > 0 && `(${activeFilterCount})`}
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleOpenModal}
                        startIcon={<FilterListIcon />}
                    >
                        {activeFilterCount > 0 ? 'Edit Filters' : 'Add Filters'}
                    </Button>
                </Box>

                {activeFilterCount > 0 && (
                    <Box sx={{ mt: 2 }}>{renderFilterSummary()}</Box>
                )}
            </Paper>

            {/* Filter Modal */}
            <Dialog
                open={modalOpen}
                onClose={handleCloseModal}
                fullWidth
                maxWidth="md"
                aria-labelledby="filter-dialog-title"
            >
                <DialogTitle id="filter-dialog-title">
                    <Box display="flex" alignItems="center">
                        <Box flexGrow={1}>
                            <Typography variant="h6">
                                Filter Shifts
                            </Typography>
                        </Box>
                        <IconButton
                            edge="end"
                            color="inherit"
                            onClick={handleCloseModal}
                            aria-label="close"
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <form onSubmit={handleSubmit(handleApplyFilters)}>
                        <Grid container spacing={3}>
                            {/* Basic Information Group */}
                            <Grid size={{ xs: 12 }}>
                                <Typography
                                    variant="subtitle1"
                                    fontWeight="bold"
                                    gutterBottom
                                >
                                    Basic Information
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                        <Controller
                                            name="title"
                                            control={control}
                                            render={({ field }) => (
                                                <TextField
                                                    {...field}
                                                    label="Title"
                                                    variant="outlined"
                                                    fullWidth
                                                />
                                            )}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                        <Controller
                                            name="unfilled"
                                            control={control}
                                            render={({ field }) => (
                                                <Autocomplete
                                                    {...field}
                                                    options={[
                                                        {
                                                            label: 'Any',
                                                            id: 'any',
                                                        },
                                                        {
                                                            label: 'Open',
                                                            id: 'unfilled',
                                                        },
                                                        isAdmin
                                                            ? {
                                                                  label: 'Filled',
                                                                  id: 'filled',
                                                              }
                                                            : {
                                                                  label: 'Mine',
                                                                  id: 'mine',
                                                              },
                                                    ]}
                                                    isOptionEqualToValue={(
                                                        option,
                                                        value
                                                    ) =>
                                                        option.id ===
                                                        value.id
                                                    }
                                                    getOptionLabel={(
                                                        option
                                                    ) =>
                                                        option?.label || ''
                                                    }
                                                    onChange={(_, value) =>
                                                        field.onChange(
                                                            value
                                                        )
                                                    }
                                                    renderInput={(
                                                        params
                                                    ) => (
                                                        <TextField
                                                            {...params}
                                                            label="Status"
                                                            placeholder="Choose One"
                                                        />
                                                    )}
                                                />
                                            )}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>

                            {/* Location Group */}
                            <Grid size={{ xs: 12 }}>
                                <Typography
                                    variant="subtitle1"
                                    fontWeight="bold"
                                    gutterBottom
                                >
                                    Location
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Controller
                                            name="locationIds"
                                            control={control}
                                            render={({ field }) => (
                                                <Autocomplete
                                                    {...field}
                                                    multiple
                                                    options={locations}
                                                    isOptionEqualToValue={(
                                                        option,
                                                        value
                                                    ) =>
                                                        option.id ===
                                                        value.id
                                                    }
                                                    getOptionLabel={(
                                                        option
                                                    ) => option.name || ''}
                                                    onChange={(_, value) =>
                                                        field.onChange(
                                                            value
                                                        )
                                                    }
                                                    renderInput={(
                                                        params
                                                    ) => (
                                                        <TextField
                                                            {...params}
                                                            label="Locations"
                                                            placeholder="Select locations"
                                                        />
                                                    )}
                                                />
                                            )}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Controller
                                            name="locationGroupIds"
                                            control={control}
                                            render={({ field }) => (
                                                <Autocomplete
                                                    {...field}
                                                    multiple
                                                    options={locationGroups}
                                                    isOptionEqualToValue={(
                                                        option,
                                                        value
                                                    ) =>
                                                        option.id ===
                                                        value.id
                                                    }
                                                    getOptionLabel={(
                                                        option
                                                    ) => option.name || ''}
                                                    onChange={(_, value) =>
                                                        field.onChange(
                                                            value
                                                        )
                                                    }
                                                    renderInput={(
                                                        params
                                                    ) => (
                                                        <TextField
                                                            {...params}
                                                            label="Location Groups"
                                                            placeholder="Select location groups"
                                                        />
                                                    )}
                                                />
                                            )}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>

                            {/* Date Range Group */}
                            <Grid size={{ xs: 12 }}>
                                <Typography
                                    variant="subtitle1"
                                    fontWeight="bold"
                                    gutterBottom
                                >
                                    Date Range
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Controller
                                            name="startDate"
                                            control={control}
                                            render={({ field }) => (
                                                <DatePicker
                                                    {...field}
                                                    value={
                                                        field.value
                                                            ? dayjs.utc(
                                                                  field.value
                                                              )
                                                            : null
                                                    }
                                                    onChange={(date) =>
                                                        field.onChange(
                                                            date?.toDate()
                                                        )
                                                    }
                                                    slotProps={{
                                                        field: {
                                                            clearable: true,
                                                        },
                                                        textField: {
                                                            fullWidth: true,
                                                        },
                                                    }}
                                                    label="Start Date"
                                                />
                                            )}
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Controller
                                            name="endDate"
                                            control={control}
                                            render={({ field }) => (
                                                <DatePicker
                                                    {...field}
                                                    value={
                                                        (field.value ||
                                                            null) as
                                                            | PickerValue
                                                            | undefined
                                                    }
                                                    onChange={(date) =>
                                                        field.onChange(date)
                                                    }
                                                    slotProps={{
                                                        field: {
                                                            clearable: true,
                                                        },
                                                        textField: {
                                                            fullWidth: true,
                                                        },
                                                    }}
                                                    label="End Date"
                                                />
                                            )}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>

                            {/* Assignment Group (Admin only) */}
                            {isAdmin && (
                                <Grid size={{ xs: 12 }}>
                                    <Typography
                                        variant="subtitle1"
                                        fontWeight="bold"
                                        gutterBottom
                                    >
                                        Assignment
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Controller
                                                name="assigned"
                                                control={control}
                                                render={({ field }) => (
                                                    <Autocomplete
                                                        {...field}
                                                        multiple
                                                        options={
                                                            teamMembers ||
                                                            []
                                                        }
                                                        isOptionEqualToValue={(
                                                            option,
                                                            value
                                                        ) =>
                                                            option.id ===
                                                            value.id
                                                        }
                                                        getOptionLabel={(
                                                            option
                                                        ) =>
                                                            option.name ||
                                                            ''
                                                        }
                                                        onChange={(
                                                            _,
                                                            value
                                                        ) =>
                                                            field.onChange(
                                                                value
                                                            )
                                                        }
                                                        renderInput={(
                                                            params
                                                        ) => (
                                                            <TextField
                                                                {...params}
                                                                label="Assigned To"
                                                                placeholder="Select users"
                                                                fullWidth
                                                            />
                                                        )}
                                                    />
                                                )}
                                            />
                                        </Grid>
                                    </Grid>
                                </Grid>
                            )}
                        </Grid>
                    </form>
                </DialogContent>
                <DialogActions>
                    {!isFormEmpty && !isFormDirty && (
                        <Button
                            variant="outlined"
                            color="secondary"
                            onClick={handleRemoveFilters}
                        >
                            Remove All Filters
                        </Button>
                    )}

                    {isFormDirty && (
                        <Button
                            variant="outlined"
                            color="secondary"
                            onClick={() =>
                                reset(filters, {
                                    keepDirty: false,
                                    keepSubmitCount: true,
                                })
                            }
                        >
                            Reset
                        </Button>
                    )}

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit(handleApplyFilters)}
                    >
                        Apply Filters
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

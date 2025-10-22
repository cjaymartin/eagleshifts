import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Grid,
    Typography,
    Chip,
    Box,
    Alert,
    CircularProgress,
    Divider,
    Autocomplete,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import {
    AllEntityMatchingResults,
    EntityMatch,
} from '@/utils/entityMatchingService';
import dayjs from 'dayjs';

interface AIShiftConfirmationDialogProps {
    open: boolean;
    onClose: () => void;
    parsedShift: {
        title: string;
        startTime: string | null;
        endTime: string | null;
        date: string;
        locationId?: string;
        departmentId?: string;
        notes?: string;
        slots?: number;
        department?: string;
        assignees?: string[];
    };
    entityMatches?: AllEntityMatchingResults;
}

/**
 * A confirmation dialog for reviewing and editing AI-parsed shift data
 * before creating the shift
 */
export default function AIShiftConfirmationDialog({
    open,
    onClose,
    parsedShift,
    entityMatches,
}: AIShiftConfirmationDialogProps) {
    const router = useRouter();

    // Form state
    const [title, setTitle] = useState(parsedShift.title);
    const [startTime, setStartTime] = useState(
        parsedShift.startTime ? dayjs(parsedShift.startTime) : null
    );
    const [endTime, setEndTime] = useState(
        parsedShift.endTime ? dayjs(parsedShift.endTime) : null
    );
    const [slots, setSlots] = useState<number>(parsedShift.slots || 1);
    const [notes, setNotes] = useState(parsedShift.notes || '');

    // Location state
    const [selectedLocation, setSelectedLocation] = useState<{
        id: string;
        name: string;
    } | null>(
        parsedShift.locationId && entityMatches?.location.bestMatch
            ? entityMatches.location.bestMatch.entity
            : null
    );
    const [newLocationName, setNewLocationName] = useState('');
    const [showNewLocationField, setShowNewLocationField] = useState(false);

    // Department state
    const [selectedDepartment, setSelectedDepartment] = useState<{
        id: string;
        name: string;
    } | null>(
        parsedShift.departmentId && entityMatches?.department.bestMatch
            ? entityMatches.department.bestMatch.entity
            : null
    );
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [showNewDepartmentField, setShowNewDepartmentField] = useState(false);

    // Validation state
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Error state
    const [error, setError] = useState<string | null>(null);

    // Get the create shift mutation
    const createShiftMutation = trpc.shifts.create.useMutation({
        onSuccess: (data) => {
            // Redirect to the shift edit page
            router.push(`/shifts/${data!.id}`);
            onClose();
        },
        onError: (err) => {
            setError(err.message || 'Failed to create shift');
        },
    });

    // Create location mutation
    const createLocationMutation = trpc.locations.createLocation.useMutation({
        onSuccess: (data) => {
            setSelectedLocation({ id: data.id, name: data.name });
            setShowNewLocationField(false);
            setNewLocationName('');
        },
        onError: (err) => {
            setError(`Failed to create location: ${err.message}`);
        },
    });

    // Create department mutation
    const createDepartmentMutation =
        trpc.departments.createDepartment.useMutation({
            onSuccess: (data) => {
                setSelectedDepartment({ id: data.id, name: data.name });
                setShowNewDepartmentField(false);
                setNewDepartmentName('');
            },
            onError: (err) => {
                setError(`Failed to create department: ${err.message}`);
            },
        });

    // Validate the form
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!title.trim()) {
            newErrors.title = 'Title is required';
        }

        if (!startTime) {
            newErrors.startTime = 'Start time is required';
        }

        if (!endTime) {
            newErrors.endTime = 'End time is required';
        } else if (
            (startTime && endTime && endTime.isSame(startTime)) ||
            endTime.isBefore(startTime)
        ) {
            newErrors.endTime = 'End time must be after start time';
        }

        if (slots < 1) {
            newErrors.slots = 'At least one slot is required';
        }

        if (showNewLocationField && !newLocationName.trim()) {
            newErrors.newLocationName = 'Location name is required';
        }

        if (showNewDepartmentField && !newDepartmentName.trim()) {
            newErrors.newDepartmentName = 'Department name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = () => {
        if (!validateForm()) {
            return;
        }

        // Create new location if needed
        if (showNewLocationField && newLocationName.trim()) {
            createLocationMutation.mutate({
                name: newLocationName,
                address: 'Created from AI Shift Entry',
            });
            return; // Will continue after location is created
        }

        // Create new department if needed
        if (showNewDepartmentField && newDepartmentName.trim()) {
            createDepartmentMutation.mutate({
                name: newDepartmentName,
            });
            return; // Will continue after department is created
        }

        // Create the shift
        createShiftMutation.mutate({
            title,
            startTime: startTime
                ? startTime.toISOString()
                : dayjs().toISOString(),
            endTime: endTime ? endTime.toISOString() : dayjs().toISOString(),
            slots,
            notes,
            locationId: selectedLocation?.id,
            departmentId: selectedDepartment?.id,
        });
    };

    // Render confidence badge for entity matches
    const renderConfidenceBadge = (confidence: number) => {
        let color = 'error';
        if (confidence >= 0.9) {
            color = 'success';
        } else if (confidence >= 0.7) {
            color = 'warning';
        }

        return (
            <Chip
                size="small"
                color={color as any}
                label={`${Math.round(confidence * 100)}%`}
                sx={{ ml: 1 }}
            />
        );
    };

    // Handle dialog close
    const handleClose = () => {
        // Reset form state
        setError(null);
        onClose();
    };

    // Check if any mutation is loading
    const isLoading =
        createShiftMutation.isPending ||
        createLocationMutation.isPending ||
        createDepartmentMutation.isPending;

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
            <DialogTitle>Confirm Shift Details</DialogTitle>

            <DialogContent>
                {/* Show error message if there is one */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={2} sx={{ mt: 1 }}>
                    {/* Title */}
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Shift Title"
                            fullWidth
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            error={!!errors.title}
                            helperText={errors.title}
                            disabled={isLoading}
                            required
                            inputProps={{ 'data-testid': 'shift-title-input' }}
                        />
                    </Grid>

                    {/* Start Time */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <DateTimePicker
                            label="Start Time"
                            value={startTime}
                            onChange={(date) => setStartTime(date as any)}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !!errors.startTime,
                                    helperText: errors.startTime,
                                    disabled: isLoading,
                                    required: true,
                                },
                            }}
                        />
                    </Grid>

                    {/* End Time */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <DateTimePicker
                            label="End Time"
                            value={endTime}
                            onChange={(date) => setEndTime(date as any)}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !!errors.endTime,
                                    helperText: errors.endTime,
                                    disabled: isLoading,
                                    required: true,
                                },
                            }}
                        />
                    </Grid>

                    {/* Slots */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Number of Slots"
                            type="number"
                            fullWidth
                            value={slots}
                            onChange={(e) =>
                                setSlots(parseInt(e.target.value) || 1)
                            }
                            error={!!errors.slots}
                            helperText={errors.slots}
                            disabled={isLoading}
                            required
                            InputProps={{
                                inputProps: {
                                    min: 1,
                                    'data-testid': 'slots-input',
                                },
                            }}
                        />
                    </Grid>

                    {/* Location */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                        {!showNewLocationField ? (
                            <>
                                <FormControl
                                    fullWidth
                                    error={!!errors.location}
                                >
                                    <Autocomplete
                                        options={
                                            entityMatches?.location
                                                .potentialMatches || []
                                        }
                                        getOptionLabel={(option) =>
                                            option.entity.name
                                        }
                                        renderOption={(props, option) => (
                                            <li {...props}>
                                                {option.entity.name}
                                                {renderConfidenceBadge(
                                                    option.confidence
                                                )}
                                            </li>
                                        )}
                                        value={
                                            selectedLocation
                                                ? entityMatches?.location.potentialMatches.find(
                                                      (m) =>
                                                          m.entity.id ===
                                                          selectedLocation.id
                                                  ) || null
                                                : null
                                        }
                                        onChange={(_, value) => {
                                            setSelectedLocation(
                                                value ? value.entity : null
                                            );
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Location"
                                                error={!!errors.location}
                                                helperText={errors.location}
                                                disabled={isLoading}
                                            />
                                        )}
                                    />
                                </FormControl>
                                <Button
                                    size="small"
                                    onClick={() =>
                                        setShowNewLocationField(true)
                                    }
                                    sx={{ mt: 1 }}
                                    disabled={isLoading}
                                >
                                    Create New Location
                                </Button>
                            </>
                        ) : (
                            <>
                                <TextField
                                    label="New Location Name"
                                    fullWidth
                                    value={newLocationName}
                                    onChange={(e) =>
                                        setNewLocationName(e.target.value)
                                    }
                                    error={!!errors.newLocationName}
                                    helperText={errors.newLocationName}
                                    disabled={isLoading}
                                    required
                                    inputProps={{
                                        'data-testid':
                                            'new-location-name-input',
                                    }}
                                />
                                <Button
                                    size="small"
                                    onClick={() =>
                                        setShowNewLocationField(false)
                                    }
                                    sx={{ mt: 1 }}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                    </Grid>

                    {/* Department */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                        {!showNewDepartmentField ? (
                            <>
                                <FormControl
                                    fullWidth
                                    error={!!errors.department}
                                >
                                    <Autocomplete
                                        options={
                                            entityMatches?.department
                                                .potentialMatches || []
                                        }
                                        getOptionLabel={(option) =>
                                            option.entity.name
                                        }
                                        renderOption={(props, option) => (
                                            <li {...props}>
                                                {option.entity.name}
                                                {renderConfidenceBadge(
                                                    option.confidence
                                                )}
                                            </li>
                                        )}
                                        value={
                                            selectedDepartment
                                                ? entityMatches?.department.potentialMatches.find(
                                                      (m) =>
                                                          m.entity.id ===
                                                          selectedDepartment.id
                                                  ) || null
                                                : null
                                        }
                                        onChange={(_, value) => {
                                            setSelectedDepartment(
                                                value ? value.entity : null
                                            );
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Department"
                                                error={!!errors.department}
                                                helperText={errors.department}
                                                disabled={isLoading}
                                            />
                                        )}
                                    />
                                </FormControl>
                                <Button
                                    size="small"
                                    onClick={() =>
                                        setShowNewDepartmentField(true)
                                    }
                                    sx={{ mt: 1 }}
                                    disabled={isLoading}
                                >
                                    Create New Department
                                </Button>
                            </>
                        ) : (
                            <>
                                <TextField
                                    label="New Department Name"
                                    fullWidth
                                    value={newDepartmentName}
                                    onChange={(e) =>
                                        setNewDepartmentName(e.target.value)
                                    }
                                    error={!!errors.newDepartmentName}
                                    helperText={errors.newDepartmentName}
                                    disabled={isLoading}
                                    required
                                />
                                <Button
                                    size="small"
                                    onClick={() =>
                                        setShowNewDepartmentField(false)
                                    }
                                    sx={{ mt: 1 }}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                    </Grid>

                    {/* Notes */}
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Notes"
                            multiline
                            rows={3}
                            fullWidth
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={isLoading}
                            inputProps={{ 'data-testid': 'notes-input' }}
                        />
                    </Grid>
                </Grid>

                {/* Show a loading indicator during processing */}
                {isLoading && (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            mt: 2,
                        }}
                    >
                        <CircularProgress
                            size={24}
                            data-testid="loading-indicator"
                        />
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={isLoading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    variant="contained"
                >
                    Create Shift
                </Button>
            </DialogActions>
        </Dialog>
    );
}

import React, { useEffect, useState, useMemo } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Grid,
    Autocomplete,
    Typography,
    Box,
    Alert,
    CircularProgress,
    createFilterOptions
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DateTime } from 'luxon';
import { trpc } from '@/lib/trpc/client';

interface ParsedShiftData {
    title: string;
    startTime: string | null;
    endTime: string | null;
    date: string;
    location: string | null;
    notes: string | null;
    slots: number | string | null;
    department: string | null;
    assignees: string[] | null;
    locationId?: string | null;
    locationConfidence?: number;
}

interface AIShiftReviewDialogProps {
    open: boolean;
    onClose: () => void;
    parsedData: ParsedShiftData | null;
    onSave: (data: any) => void;
}

interface LocationOption {
    id: string;
    name: string;
    address?: string | null;
    inputValue?: string;
    [key: string]: any;
}

const filter = createFilterOptions<LocationOption>();

export default function AIShiftReviewDialog({
    open,
    onClose,
    parsedData,
    onSave
}: AIShiftReviewDialogProps) {
    // Form state
    const [title, setTitle] = useState('');
    const [date, setDate] = useState<DateTime | null>(null);
    const [startTime, setStartTime] = useState<DateTime | null>(null);
    const [endTime, setEndTime] = useState<DateTime | null>(null);
    const [slots, setSlots] = useState<number>(1);
    const [notes, setNotes] = useState('');
    
    // Location state
    // We primarily track the input string value
    const [locationInputValue, setLocationInputValue] = useState('');
    // We derive the selected location object if it matches an existing one
    const [isCreatingLocation, setIsCreatingLocation] = useState(false);
    
    // Fetch locations for the picker
    const { data: locationsData } = trpc.locations.getLocations.useQuery();
    const locations = useMemo(() => {
        return (locationsData?.locations || []).map(l => ({
            ...l,
            inputValue: undefined
        })) as LocationOption[];
    }, [locationsData]);
    
    // Mutation for creating new locations
    const createLocationMutation = trpc.locations.createLocation.useMutation();

    useEffect(() => {
        if (parsedData && open) {
            setTitle(parsedData.title || '');
            
            // Parse date
            const parsedDate = parsedData.date ? DateTime.fromISO(parsedData.date) : DateTime.now();
            setDate(parsedDate);

            // Parse times
            if (parsedData.startTime) {
                const [hours, minutes] = parsedData.startTime.split(':').map(Number);
                setStartTime(parsedDate.set({ hour: hours, minute: minutes }));
            }
            
            if (parsedData.endTime) {
                const [hours, minutes] = parsedData.endTime.split(':').map(Number);
                setEndTime(parsedDate.set({ hour: hours, minute: minutes }));
            }

            setSlots(Number(parsedData.slots) || 1);
            setNotes(parsedData.notes || '');
            
            // Handle location pre-selection logic
            if (parsedData.locationId && parsedData.locationConfidence && parsedData.locationConfidence > 0.8) {
                // High confidence match - pre-select
                const matched = locations.find(l => l.id === parsedData.locationId);
                if (matched) {
                    setLocationInputValue(matched.name);
                } else {
                    setLocationInputValue('');
                }
            } else if (parsedData.location) {
                // Low confidence but we have a name - pre-fill text
                setLocationInputValue(parsedData.location);
            } else {
                // No location data at all
                setLocationInputValue('');
            }
        }
    }, [parsedData, open, locations]);

    const handleCreateLocation = async (name: string) => {
        setIsCreatingLocation(true);
        try {
            const newLocation = await createLocationMutation.mutateAsync({
                name,
                // Address is optional
            });
            return newLocation;
        } catch (error) {
            console.error('Failed to create location:', error);
            throw error;
        } finally {
            setIsCreatingLocation(false);
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!date || !startTime || !endTime) return;

        let finalLocationId: string | undefined = undefined;
        let legacyLocationName: string | undefined = undefined;

        // Check if current input matches an existing location
        const matchedLocation = locations.find(
            l => l.name.toLowerCase() === locationInputValue.trim().toLowerCase()
        );

        if (matchedLocation) {
            finalLocationId = matchedLocation.id;
        } else if (locationInputValue.trim()) {
            // No match, create new location
            try {
                const newLocation = await handleCreateLocation(locationInputValue.trim());
                finalLocationId = newLocation.id;
            } catch (error) {
                // Fallback if creation fails
                legacyLocationName = locationInputValue.trim();
            }
        }

        // Combine date and time
        const startDateTime = date.set({
            hour: startTime.hour,
            minute: startTime.minute
        });
        
        const endDateTime = date.set({
            hour: endTime.hour,
            minute: endTime.minute
        });

        // Handle overnight shifts
        let finalEndDateTime = endDateTime;
        if (endDateTime < startDateTime) {
            finalEndDateTime = endDateTime.plus({ days: 1 });
        }

        const shiftData = {
            title,
            startTime: startDateTime.toISO(),
            endTime: finalEndDateTime.toISO(),
            locationId: finalLocationId,
            legacyLocation: legacyLocationName,
            slots,
            notes
        };

        onSave(shiftData);
    };

    // Determine if we are in a "will create new" state
    const willCreateNewLocation = locationInputValue.trim() && !locations.some(
        l => l.name.toLowerCase() === locationInputValue.trim().toLowerCase()
    );

    // Focus management
    const titleInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            // Small timeout to ensure dialog transition is complete
            const timer = setTimeout(() => {
                titleInputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open]);

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="md" 
            fullWidth
            PaperProps={{
                component: 'form',
                onSubmit: handleSave,
            }}
        >
            <DialogTitle>Review AI Parsed Shift</DialogTitle>
            <DialogContent>
                <LocalizationProvider dateAdapter={AdapterLuxon}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                inputRef={titleInputRef}
                                label="Shift Title"
                                fullWidth
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </Grid>
                        
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Autocomplete
                                freeSolo
                                options={locations}
                                getOptionLabel={(option) => {
                                    if (typeof option === 'string') return option;
                                    return option.name;
                                }}
                                inputValue={locationInputValue}
                                onInputChange={(event, newInputValue) => {
                                    setLocationInputValue(newInputValue);
                                }}
                                renderOption={(props, option) => {
                                    const { key, ...otherProps } = props;
                                    return (
                                        <li key={key} {...otherProps}>
                                            <Box>
                                                <Typography>{option.name}</Typography>
                                                {option.address && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {option.address}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </li>
                                    );
                                }}
                                renderInput={(params) => (
                                    <TextField 
                                        {...params} 
                                        label="Location" 
                                        helperText={
                                            willCreateNewLocation 
                                                ? "New location will be created" 
                                                : "Select existing or type to create new"
                                        }
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {isCreatingLocation ? <CircularProgress size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                            />
                            {willCreateNewLocation && (
                                <Alert severity="info" sx={{ mt: 1, py: 0 }}>
                                    <Typography variant="caption">
                                        Location <strong>&quot;{locationInputValue}&quot;</strong> does not exist and will be created.
                                    </Typography>
                                </Alert>
                            )}
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <DatePicker
                                label="Date"
                                value={date}
                                onChange={(newValue: any) => setDate(newValue)}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                            <TimePicker
                                label="Start Time"
                                value={startTime}
                                onChange={(newValue: any) => setStartTime(newValue)}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        </Grid>

                        <Grid size={{ xs: 6 }}>
                            <TimePicker
                                label="End Time"
                                value={endTime}
                                onChange={(newValue: any) => setEndTime(newValue)}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                label="Slots"
                                type="number"
                                fullWidth
                                value={slots}
                                onChange={(e) => setSlots(parseInt(e.target.value) || 1)}
                                inputProps={{ min: 1 }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <TextField
                                label="Notes"
                                fullWidth
                                multiline
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </Grid>
                    </Grid>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isCreatingLocation}>Cancel</Button>
                <Button 
                    type="submit"
                    variant="contained" 
                    color="primary"
                    disabled={isCreatingLocation || !date || !startTime || !endTime}
                >
                    {isCreatingLocation ? 'Creating Location...' : 'Create Shift'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

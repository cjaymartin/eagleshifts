'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
    Box,
    Container,
    Grid,
    IconButton,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Paper,
    Typography,
    Autocomplete,
    TextField,
    Alert,
} from '@mui/material';
import dayjs from 'dayjs';
import {
    Calendar as BigCalendar,
    luxonLocalizer,
    Views,
} from 'react-big-calendar';
import { DateTime, Settings } from 'luxon';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
    useAuthQuery,
    useTeamUsersQuery,
    useMemberByIdQuery,
    useUpdateDefaultAvailabilityMutation,
} from '@/queries/users';
import { trpc } from '@/lib/trpc/client';
import { useDialogs } from '@toolpad/core';
import { useNotifications } from '@/components/providers/NotificationsProvider';
import AddIcon from '@mui/icons-material/Add';
import AvailabilityDialog from './_components/AvailabilityDialog';

// Create a localizer for the calendar
const localizer = luxonLocalizer(DateTime);
Settings.defaultZone = 'UTC'; // Set default timezone to UTC

// Colored wrapper for date cells
const ColoredDateCellWrapper: React.FC<{ children: React.ReactElement }> = ({
    children,
}) =>
    React.cloneElement(React.Children.only(children), {
        style: {
            backgroundColor: 'lightblue',
        },
    } as any);

export default function Availability() {
    // Get user session and role
    const { data: session } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';
    const isAdmin = ['admin', 'owner'].includes(role);
    const userId = session?.user?.id;

    // Dialog handling
    const dialogs = useDialogs();

    // State for selected user (for admins)
    const [selectedUserId, setSelectedUserId] = useState<string | null>(
        userId!
    );
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
        null
    );

    // Get team users for admin selection (only for admins)
    const { data: teamUsers = [] } = useTeamUsersQuery();
    // If not admin, we'll just ignore the data

    // For non-admin users, set selectedMemberId to their own memberId
    useEffect(() => {
        if (!isAdmin && session?.user?.memberId) {
            setSelectedMemberId(session.user.memberId);
        }
    }, [isAdmin, session]);

    // Get the selected member's data
    const { data: memberData } = useMemberByIdQuery(selectedMemberId || '');

    // Default availability state
    const [defaultAvailable, setDefaultAvailable] = useState(false);

    // Mutation for updating default availability
    const updateDefaultAvailability = useUpdateDefaultAvailabilityMutation();
    const notifications = useNotifications();

    // Update selected member ID when user changes
    useEffect(() => {
        if (selectedUserId && teamUsers.length > 0) {
            const user = teamUsers.find((user) => user.id === selectedUserId);
            if (user && user.members && user.members.length > 0) {
                setSelectedMemberId(user.members[0].id);
            }
        }
    }, [selectedUserId, teamUsers]);

    // Update default availability state when member data changes
    useEffect(() => {
        if (memberData) {
            setDefaultAvailable(memberData.isAvailableByDefault || false);
        }
    }, [memberData]);

    // Update default availability
    const handleDefaultAvailabilityChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const isAvailable = event.target.checked;

        if (!selectedMemberId) {
            notifications.show('No member selected', {
                severity: 'error',
                autoHideDuration: 3000,
            });
            return;
        }

        try {
            await updateDefaultAvailability.mutateAsync({
                memberId: selectedMemberId,
                isAvailableByDefault: isAvailable,
            });

            setDefaultAvailable(isAvailable);
            notifications.show('Default availability updated successfully', {
                severity: 'success',
                autoHideDuration: 3000,
            });
        } catch (error: any) {
            console.error('Failed to update default availability:', error);
            notifications.show('Failed to update default availability', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    };

    // Fetch availability data
    const { data: availabilities } = trpc.availability.list.useQuery({
        memberId: selectedMemberId!,
    });

    // Create a lookup object for availabilities by ID
    const availabilityLookup = React.useMemo(() => {
        return (
            availabilities?.reduce<Record<string, (typeof availabilities)[0]>>(
                (acc, availability) => ({
                    ...acc,
                    [availability.id]: availability,
                }),
                {}
            ) || {}
        );
    }, [availabilities]);

    // Handle double-clicking on an event (availability)
    const onDoubleClickEvent = useCallback(
        (calEvent: { id: string }) => {
            const availability = availabilityLookup[calEvent.id];
            if (availability) {
                dialogs.open(AvailabilityDialog, availability);
            }
        },
        [dialogs, availabilityLookup]
    );

    // Handle selecting a slot (for creating new availability)
    const onSelectSlot = useCallback(
        (slotInfo: {
            start: Date;
            end: Date;
            slots: Date[];
            action: string;
        }) => {
            const { start, end, slots, action } = slotInfo;

            if (action === 'doubleClick') {
                // Create a new availability entry starting on the selected date
                // Set endDate to be the same as startDate
                const newAvailability = {
                    startDate: start,
                    endDate: start, // Set to same day as startDate
                    memberId: selectedMemberId,
                    isAvailable: true,
                };
                dialogs.open(AvailabilityDialog, newAvailability as any);
            }
        },
        [dialogs, selectedMemberId]
    );

    // Get event style based on availability status
    const eventPropGetter = useCallback(
        (
            event: { id: string },
            start: Date,
            end: Date,
            isSelected: boolean
        ) => {
            const availability = availabilityLookup[event.id];
            const isAvailable = availability?.isAvailable;

            return {
                ...(!isSelected &&
                    !isAvailable && {
                        style: {
                            backgroundColor: '#994444',
                        },
                    }),
                ...(isSelected &&
                    !isAvailable && {
                        style: {
                            backgroundColor: '#772222',
                        },
                    }),
            };
        },
        [availabilityLookup]
    );

    // Transform availability data for the calendar
    const calendarEvents: Array<{
        id: string;
        title: string;
        allDay: boolean;
        start: Date;
        end: Date;
    }> =
        availabilities?.map((availability) => {
            // Parse dates in UTC to avoid timezone issues
            const startDate = dayjs.utc(availability.startDate, 'YYYY-MM-DD');
            // For the end date, we need to add 1 day to make it inclusive in the calendar
            // but we need to ensure we stay in UTC to avoid timezone issues
            const endDate = dayjs
                .utc(availability.endDate, 'YYYY-MM-DD')
                .add(1, 'day');

            return {
                id: availability.id,
                title:
                    availability.desc ||
                    (availability.isAvailable ? 'Available' : 'Unavailable'),
                allDay: true,
                // Use toDate() at the last moment to convert to JavaScript Date
                start: startDate.toDate(),
                end: endDate.toDate(),
            };
        }) || [];

    // Calendar components
    const components: {
        timeSlotWrapper: React.FC<{ children: React.ReactElement }>;
    } = {
        timeSlotWrapper: ColoredDateCellWrapper,
    };

    return (
        <Box>
            {/* Admin user selection */}
            {isAdmin && (
                <Paper sx={{ m: 2, p: 2, background: '#ffffee' }}>
                    <Typography>User</Typography>
                    <Autocomplete
                        value={
                            teamUsers.find(
                                (user) => user.id === selectedUserId
                            ) || null
                        }
                        onChange={(event, newValue) => {
                            setSelectedUserId(newValue?.id || userId!);
                        }}
                        options={teamUsers}
                        getOptionLabel={(option) =>
                            option.name || option.email || ''
                        }
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="User"
                                placeholder="Choose One"
                            />
                        )}
                    />
                </Paper>
            )}

            {/* Default availability setting */}
            {selectedUserId && (
                <Container>
                    <Paper sx={{ mb: 5, p: 2 }}>
                        <FormGroup>
                            <FormControlLabel
                                checked={defaultAvailable}
                                onChange={
                                    handleDefaultAvailabilityChange as any
                                } //todo this might work with the correct signature but it's a code change
                                control={<Checkbox />}
                                label="Available By Default"
                            />
                        </FormGroup>
                    </Paper>
                </Container>
            )}

            {selectedMemberId ? (
                <>
                    <Grid container direction="row" maxWidth="xl">
                        <Grid sx={{ width: '60vw', height: 700 }}>
                            <BigCalendar
                                components={components as any}
                                localizer={localizer}
                                events={calendarEvents}
                                startAccessor="start"
                                onDoubleClickEvent={onDoubleClickEvent}
                                onSelectSlot={onSelectSlot}
                                eventPropGetter={eventPropGetter}
                                selectable={true}
                                endAccessor="end"
                                step={15}
                                timeslots={4}
                                views={['month', 'week', 'day']}
                                defaultView="month"
                            />
                        </Grid>
                    </Grid>

                    {/* Add button for creating new availability */}
                    <Container sx={{ m: 5 }}>
                        <IconButton
                            onClick={() => {
                                const newAvailability = {
                                    startDate: new Date(),
                                    endDate: new Date(),
                                    memberId: selectedMemberId,
                                    isAvailable: true,
                                };
                                dialogs.open(
                                    AvailabilityDialog,
                                    newAvailability as any
                                );
                            }}
                        >
                            <AddIcon /> Add Availability
                        </IconButton>
                    </Container>
                </>
            ) : (
                <Container sx={{ mt: 4 }}>
                    <Alert severity="info">
                        Please choose a member of your team to access availability
                    </Alert>
                </Container>
            )}
        </Box>
    );
}

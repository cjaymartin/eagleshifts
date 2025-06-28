'use client';

import React, { useCallback, useState } from 'react';
import { Box, Container, Grid, IconButton } from '@mui/material';
import dayjs from 'dayjs';

import {
    Calendar as BigCalendar,
    luxonLocalizer,
    Views,
} from 'react-big-calendar';
import { DateTime, Settings } from 'luxon';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
    ShiftFilters,
    ShiftFilterSchema,
} from '../shifts/_components/ShiftFilters';
import { useAuthQuery } from '@/queries/users';
import { trpc } from '@/lib/trpc/client';
import { useDialogs } from '@toolpad/core';
import ShiftDialog from '@/app/(dashboard)/shifts/_components/ShiftDialog';
import AddIcon from '@mui/icons-material/Add';

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
    });

export default function Calendar() {
    // Get user session and role
    const { data: session } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';
    const isAdmin = ['admin', 'owner'].includes(role);

    // Dialog handling
    const dialogs = useDialogs();

    // Filters state
    const [filters, setFilters] = useState<ShiftFilterSchema>();

    // Fetch shifts data using the same query as the shifts page
    const { data: shifts } = trpc.shifts.list.useQuery(filters);

    // Create a lookup object for shifts by ID
    const shiftLookup = React.useMemo(() => {
        return (
            shifts?.reduce<Record<string, (typeof shifts)[0]>>(
                (acc, shift) => ({ ...acc, [shift.id]: shift }),
                {}
            ) || {}
        );
    }, [shifts]);

    // Handle double-clicking on an event (shift)
    const onDoubleClickEvent = useCallback(
        (calEvent: { id: string }) => {
            const shift = shiftLookup[calEvent.id];
            if (shift) {
                dialogs.open(ShiftDialog, shift);
            }
        },
        [dialogs, shiftLookup]
    );

    // Handle selecting a slot (for creating new shifts)
    const onSelectSlot = useCallback(
        (slotInfo: {
            start: Date;
            end: Date;
            slots: Date[];
            action: string;
        }) => {
            const { start, end, slots, action } = slotInfo;
            if (!isAdmin) return;

            if (action === 'doubleClick') {
                dialogs.open(ShiftDialog, null);
            }
        },
        [dialogs, isAdmin]
    );

    // Get event style based on shift status
    const eventPropGetter = useCallback(
        (
            event: { id: string },
            start: Date,
            end: Date,
            isSelected: boolean
        ) => {
            const shift = shiftLookup[event.id];
            const assignments = shift?.shiftAssignments?.length || 0;
            const slots = shift?.slots || 1;
            const isFull = assignments >= slots && assignments > 0;
            const isEmpty = assignments <= 0;
            const isPartial = !isFull && !isEmpty;

            return {
                ...(!isSelected &&
                    isFull && {
                        style: {
                            backgroundColor: '#007700',
                        },
                    }),
                ...(isSelected &&
                    isFull && {
                        style: {
                            backgroundColor: '#005500',
                        },
                    }),
                ...(!isSelected &&
                    isPartial && {
                        style: {
                            backgroundColor: '#007777',
                        },
                    }),
                ...(isSelected &&
                    isPartial && {
                        style: {
                            backgroundColor: '#006666',
                        },
                    }),
            };
        },
        [shiftLookup]
    );

    // Transform shifts data for the calendar
    const calendarEvents: Array<{
        id: string;
        title: string;
        allDay: boolean;
        start: Date;
        end: Date;
    }> =
        shifts?.map((shift) => {
            return {
                id: shift.id,
                title: shift.title,
                allDay: false,
                start: dayjs.utc(shift.startTime).toDate(),
                end: dayjs.utc(shift.endTime).toDate(),
            };
        }) || [];

    // Calendar components
    const components: {
        timeSlotWrapper: React.FC<{ children: React.ReactElement }>;
    } = {
        timeSlotWrapper: ColoredDateCellWrapper,
    };

    console.log({ calendarEvents });

    return (
        <Box>
            {/* Use the same ShiftFilters component as the shifts page */}
            <ShiftFilters filters={filters} setFilters={setFilters} />

            <Grid container direction="row" maxWidth="xl">
                <Grid item sx={{ width: '60vw', height: 700 }}>
                    <BigCalendar
                        components={components}
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
                    />
                </Grid>
            </Grid>

            {/* Add button for creating new shifts (only for admins) */}
            {isAdmin && (
                <Container>
                    <IconButton onClick={() => dialogs.open(ShiftDialog, null)}>
                        <AddIcon /> Add Shift
                    </IconButton>
                </Container>
            )}
        </Box>
    );
}

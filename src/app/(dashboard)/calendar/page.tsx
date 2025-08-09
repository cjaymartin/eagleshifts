'use client';

import React, { useCallback, useState, useRef } from 'react';
import { Box, Container, Grid, IconButton } from '@mui/material';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useBusinessProfileQuery } from '@/queries/team';

dayjs.extend(utc);
dayjs.extend(timezone);

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
import ShiftViewDialog from '@/components/calendar/ShiftViewDialog';
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
    } as any);

export default function Calendar() {
    // Get user session and role
    const { data: session } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';
    const isAdmin = ['admin', 'owner'].includes(role);

    // Get organization profile data for timezone
    const { data: businessProfile } = useBusinessProfileQuery();

    // Dialog handling
    const dialogs = useDialogs();

    // Ref to store the timeout ID for delayed single-click handling
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Filters state
    const [filters, setFilters] = useState<ShiftFilterSchema>();

    // Fetch shifts data using the same query as the shifts page, but include location and group data
    const { data: shifts } = trpc.shifts.list.useQuery({
        ...(filters as any),
        isCancelled: false,
        includeLocationGroup: true,
    });

    // Create a lookup object for shifts by ID
    const shiftLookup = React.useMemo(() => {
        return (
            shifts?.reduce<Record<string, (typeof shifts)[0]>>(
                (acc, shift) => ({ ...acc, [shift.id]: shift }),
                {}
            ) || {}
        );
    }, [shifts]);

    // Handle single-clicking on an event (shift) - opens view dialog for all users with a delay
    const onClickEvent = useCallback(
        (calEvent: { id: string }) => {
            const shift = shiftLookup[calEvent.id];
            if (shift) {
                // Clear any existing timeout
                if (clickTimeoutRef.current) {
                    clearTimeout(clickTimeoutRef.current);
                    clickTimeoutRef.current = null;
                }

                // Set a new timeout to open the view dialog after a short delay
                // This delay allows time for a potential double-click to be detected
                clickTimeoutRef.current = setTimeout(() => {
                    dialogs.open(ShiftViewDialog, shift as any);
                    clickTimeoutRef.current = null;
                }, 200); // 300ms delay, which is a common double-click threshold
            }
        },
        [dialogs, shiftLookup, clickTimeoutRef]
    );

    // Handle double-clicking on an event (shift) - opens edit dialog for admins, view dialog for non-admins
    const onDoubleClickEvent = useCallback(
        (calEvent: { id: string }) => {
            // Clear any pending single-click timeout to prevent the view dialog from opening
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
            }

            const shift = shiftLookup[calEvent.id];
            if (shift) {
                if (isAdmin) {
                    dialogs.open(ShiftDialog, shift as any);
                } else {
                    dialogs.open(ShiftViewDialog, shift as any);
                }
            }
        },
        [dialogs, shiftLookup, isAdmin, clickTimeoutRef]
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

    // Function to lighten or darken a color
    const lightenColor = (
        color: string,
        amount: number
    ): { color: string; originalColor: string } => {
        // Remove the # if it exists
        const originalColor = color.startsWith('#') ? color : `#${color}`;
        color = color.replace('#', '');

        // Parse the color components
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);

        // Lighten or darken each component
        let newR, newG, newB;

        if (amount >= 0) {
            // Lighten
            newR = Math.min(255, r + Math.round((255 - r) * amount));
            newG = Math.min(255, g + Math.round((255 - g) * amount));
            newB = Math.min(255, b + Math.round((255 - b) * amount));
        } else {
            // Darken
            amount = Math.abs(amount);
            newR = Math.max(0, r - Math.round(r * amount));
            newG = Math.max(0, g - Math.round(g * amount));
            newB = Math.max(0, b - Math.round(b * amount));
        }

        // Convert back to hex
        const newColor = `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;

        return { color: newColor, originalColor };
    };

    // Function to determine if text should be black or white based on background color
    const getTextColor = (backgroundColor: string): string => {
        // Remove the # if it exists
        const color = backgroundColor.replace('#', '');

        // Parse the color components
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);

        // Calculate relative luminance using the formula for perceived brightness
        // https://www.w3.org/TR/WCAG20-TECHS/G18.html
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Use black text if the background is light, white text if it's dark
        return luminance > 0.5 ? '#000000' : '#ffffff';
    };

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

            // Check if shift has a location with a group that has a color
            const hasGroupColor = (shift?.location as any)?.group?.color;

            // Default colors if no group color is available
            const defaultFullColor = '#007700';
            const defaultPartialColor = '#007777';

            // Use group color if available, otherwise use default colors
            const baseColor = hasGroupColor
                ? (shift?.location as any).group.color
                : isFull
                  ? defaultFullColor
                  : defaultPartialColor;

            // Lighten the color for open shifts
            const openShiftResult = hasGroupColor
                ? lightenColor(baseColor, 0.3) // Lighten by 30%
                : { color: baseColor, originalColor: baseColor };
            const openShiftColor = openShiftResult.color;
            const openShiftBorderColor = openShiftResult.originalColor;

            // Use a darker tone when selected
            const selectedResult = hasGroupColor
                ? lightenColor(baseColor, -0.2) // Darken by 20%
                : {
                      color: isFull ? '#005500' : '#006666',
                      originalColor: baseColor,
                  };
            const selectedColor = selectedResult.color;
            const selectedBorderColor = selectedResult.originalColor;

            // Determine text colors based on background colors
            const baseTextColor = getTextColor(baseColor);
            const openShiftTextColor = getTextColor(openShiftColor);
            const selectedTextColor = getTextColor(selectedColor);

            return {
                ...(!isSelected &&
                    isFull && {
                        style: {
                            backgroundColor: baseColor,
                            color: baseTextColor,
                            borderWidth: '2px',
                            borderStyle: 'solid',
                            borderColor: baseColor,
                        },
                    }),
                ...(isSelected &&
                    isFull && {
                        style: {
                            backgroundColor: selectedColor,
                            color: selectedTextColor,
                            borderWidth: '2px',
                            borderStyle: 'solid',
                            borderColor: selectedBorderColor,
                        },
                    }),
                ...(!isSelected &&
                    !isFull && {
                        style: {
                            backgroundColor: openShiftColor,
                            color: openShiftTextColor,
                            borderWidth: '2px',
                            borderStyle: 'solid',
                            borderColor: openShiftBorderColor,
                        },
                    }),
                ...(isSelected &&
                    !isFull && {
                        style: {
                            backgroundColor: selectedColor,
                            color: selectedTextColor,
                            borderWidth: '2px',
                            borderStyle: 'solid',
                            borderColor: selectedBorderColor,
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
    }> = React.useMemo(() => {
        return (
            shifts?.map((shift) => {
                // Use the shift's timezone, or organization's timezone, or default to UTC
                const shiftTimezone =
                    shift.timezone || businessProfile?.timezone || 'UTC';

                return {
                    id: shift.id,
                    title: shift.title,
                    allDay: false,
                    start: dayjs(shift.startTime).tz(shiftTimezone).toDate(),
                    end: dayjs(shift.endTime).tz(shiftTimezone).toDate(),
                };
            }) || []
        );
    }, [shifts]);

    const [currentView, setCurrentView] = useState('month');
    const [currentDate, setCurrentDate] = useState<Date | undefined>(undefined);

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
            <ShiftFilters filters={filters as any} setFilters={setFilters} />

            <Grid container direction="row" maxWidth="xl">
                <Grid sx={{ width: '60vw', height: 700 }}>
                    <BigCalendar
                        components={components as any}
                        localizer={localizer}
                        events={calendarEvents}
                        startAccessor="start"
                        onSelectEvent={onClickEvent}
                        onDoubleClickEvent={onDoubleClickEvent}
                        onSelectSlot={onSelectSlot}
                        eventPropGetter={eventPropGetter}
                        selectable={true}
                        endAccessor="end"
                        step={15}
                        timeslots={4}
                        onView={setCurrentView}
                        view={currentView as any}
                        date={currentDate as any}
                        onNavigate={(date) => {
                            setCurrentDate(date);
                        }}
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

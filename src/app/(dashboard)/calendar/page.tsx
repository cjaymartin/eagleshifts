'use client';

import React, { useCallback, useState, useRef } from 'react';
import {
    Box,
    Container,
    Grid,
    IconButton,
    Switch,
    FormControlLabel,
    Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useBusinessProfileQuery } from '@/queries/team';
import { DateTime } from 'luxon';

// Debug function to safely log date objects
const logDateInfo = (label: string, value: any) => {
    console.log(`[Calendar] ${label}:`, {
        value,
        type: value ? typeof value : 'null/undefined',
        isDate: value instanceof Date,
        isLuxon: value && typeof value === 'object' && 'toJSDate' in value,
        toISOString: value instanceof Date ? value.toISOString() : 'not a Date',
        valueJSON: JSON.stringify(value, (key, val) =>
            val instanceof Date ? val.toISOString() : val
        ),
    });
};

dayjs.extend(utc);
dayjs.extend(timezone);

import { Calendar as BigCalendar, luxonLocalizer } from 'react-big-calendar';
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
import CalendarAgenda from '@/app/(dashboard)/_components/CalendarAgenda';
import { useShiftDraftsListQuery } from '@/queries/shiftDrafts';
import AIShiftInputDialog from '@/components/ai/AIShiftInputDialog';
import AIShiftReviewDialog from '@/components/ai/AIShiftReviewDialog';
import { useParseShiftMutation } from '@/queries/ai';
import { useShiftCreateMutation } from '@/queries/shifts';

// Create a localizer for the calendar
//const localizer = dayjsLocalizer(dayjs);
const localizer = luxonLocalizer(DateTime);

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

    // View state
    const [currentView, setCurrentView] = useState('month');
    const [currentDate, setCurrentDate] = useState<Date | undefined>(undefined);

    // AI Shift Creation State
    const [isAIMode, setIsAIMode] = useState(false);
    const [isAIInputOpen, setIsAIInputOpen] = useState(false);
    const [isAIReviewOpen, setIsAIReviewOpen] = useState(false);
    const [aiSelectedDate, setAISelectedDate] = useState<Date | undefined>(
        undefined
    );
    const [aiParsedData, setAIParsedData] = useState<any>(null);

    // Mutations
    const parseShiftMutation = useParseShiftMutation();
    const createShiftMutation = useShiftCreateMutation();

    const handleAIParse = (text: string) => {
        parseShiftMutation.mutate(
            {
                input: text,
                defaultDate: aiSelectedDate
                    ? dayjs(aiSelectedDate).format('YYYY-MM-DD')
                    : undefined,
            },
            {
                onSuccess: (data) => {
                    setAIParsedData(data);
                    setIsAIInputOpen(false);
                    setIsAIReviewOpen(true);
                },
                onError: (error) => {
                    console.error('AI Parse Error:', error);
                    // Optionally show a toast or alert here
                },
            }
        );
    };

    const handleAISave = (shiftData: any) => {
        createShiftMutation.mutate(shiftData, {
            onSuccess: () => {
                setIsAIReviewOpen(false);
                setAIParsedData(null);
                // Refresh shifts? The query should auto-invalidate
            },
        });
    };

    // Fetch shifts data using the same query as the shifts page, but include location and group data
    const { data: shifts } = trpc.shifts.list.useQuery({
        ...(filters as any),
        isCancelled: false,
        includeLocationGroup: true,
    });

    // Fetch draft shifts data using the same query as the shifts page
    const { data: draftShifts = [] } = useShiftDraftsListQuery();

    // Create a lookup object for shifts by ID
    const shiftLookup = React.useMemo(() => {
        return (
            shifts?.reduce<Record<string, (typeof shifts)[0]>>(
                (acc, shift) => ({ ...acc, [shift.id]: shift }),
                {}
            ) || {}
        );
    }, [shifts]);

    // Create a lookup object for draft shifts by ID
    const draftShiftLookup = React.useMemo(() => {
        return (
            draftShifts.reduce<Record<string, (typeof draftShifts)[0]>>(
                (acc, draft) => ({ ...acc, [draft.id]: draft }),
                {}
            ) || {}
        );
    }, [draftShifts]);

    // Handle single-clicking on an event (shift) - opens view dialog for all users with a delay
    // For draft shifts, single-click does nothing
    const onClickEvent = useCallback(
        (calEvent: { id: string; isDraft?: boolean }) => {
            // Check if this is a draft shift
            if (calEvent.isDraft) {
                // Do nothing for draft shifts on single-click
                return;
            }

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
                }, 200); // 200ms delay, which is a common double-click threshold
            }
        },
        [dialogs, shiftLookup, clickTimeoutRef]
    );

    // Handle double-clicking on an event (shift) - opens edit dialog for admins, view dialog for non-admins
    // For draft shifts, double-click always opens the edit dialog
    const onDoubleClickEvent = useCallback(
        (calEvent: { id: string; isDraft?: boolean }) => {
            // Clear any pending single-click timeout to prevent the view dialog from opening
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
            }

            // Check if this is a draft shift
            if (calEvent.isDraft) {
                const draft = draftShiftLookup[calEvent.id];
                if (draft) {
                    // Convert draft to shift format for the ShiftDialog
                    const shiftFromDraft = {
                        ...draft,
                        id: undefined, // Remove ID to create a new shift
                        isNew: true, // Mark as a new shift
                        isDraft: true, // Mark as coming from a draft
                        draftId: draft.id, // Store the draft ID for later deletion
                        isCancelled: false,
                        shiftAssignments: [], // No assignments for drafts
                    };

                    dialogs.open(ShiftDialog, shiftFromDraft as any);
                }
                return;
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
        [dialogs, shiftLookup, draftShiftLookup, isAdmin, clickTimeoutRef]
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
                if (isAIMode) {
                    setAISelectedDate(start);
                    setIsAIInputOpen(true);
                } else {
                    // Create a new shift object with the selected date information
                    // Set startTime and endTime to null to avoid 12:00am-12:00am default
                    const newShift = {
                        startTime: null,
                        endTime: null,
                        date: start,
                        isNew: true,
                    };
                    dialogs.open(ShiftDialog, newShift as any);
                }
            }
        },
        [dialogs, isAdmin, isAIMode, setAISelectedDate, setIsAIInputOpen]
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
            event: { id: string; isDraft?: boolean },
            start: Date,
            end: Date,
            isSelected: boolean
        ) => {
            // Check if this is a draft shift
            if (event.isDraft) {
                const draft = draftShiftLookup[event.id];
                if (!draft) return {};

                // Check if draft has a location with a group that has a color
                const hasGroupColor = (draft?.location as any)?.group?.color;

                // Default color if no group color is available
                const baseColor = hasGroupColor
                    ? (draft?.location as any).group.color
                    : '#007777';

                // Lighten the color for draft shifts
                const draftResult = lightenColor(baseColor, 0.5);
                const draftColor = draftResult.color;
                const draftBorderColor = draftResult.originalColor;

                // Determine text color based on background color
                const draftTextColor = getTextColor(draftColor);

                // Create diagonal stripe pattern for draft shifts
                const stripeStyle = {
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.5) 5px, rgba(255,255,255,0.5) 10px)`,
                };

                return {
                    style: {
                        backgroundColor: draftColor,
                        color: draftTextColor,
                        borderWidth: '2px',
                        borderStyle: 'dashed',
                        borderColor: draftBorderColor,
                        ...stripeStyle,
                    },
                };
            }

            const shift = shiftLookup[event.id];
            if (!shift) return {};

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
            const openShiftResult = lightenColor(baseColor, 0.3);
            const openShiftColor = openShiftResult.color;
            const openShiftBorderColor = openShiftResult.originalColor;

            console.log({ openShiftColor, openShiftBorderColor });

            // Use a darker tone when selected
            const selectedResult = lightenColor(baseColor, -0.2);
            const selectedColor = selectedResult.color;
            const selectedBorderColor = selectedResult.originalColor;

            // For agenda view, create much more muted colors
            const agendaViewResult = hasGroupColor
                ? lightenColor(baseColor, 0.7) // Lighten by 70% for very muted background
                : {
                      color: isFull ? '#e0f0e0' : '#e0f0f0',
                      originalColor: baseColor,
                  };
            const agendaBackgroundColor = agendaViewResult.color;

            // Determine text colors based on background colors
            const baseTextColor = getTextColor(baseColor);
            const openShiftTextColor = getTextColor(openShiftColor);
            const selectedTextColor = getTextColor(selectedColor);
            const agendaTextColor = getTextColor(agendaBackgroundColor);

            // Apply different styles for agenda view
            if (currentView === 'agenda') {
                // Standard border color for table cells
                const standardBorderColor = '#e0e0e0'; // Light grey border for table cells

                return {
                    ...(!isSelected &&
                        isFull && {
                            style: {
                                backgroundColor: agendaBackgroundColor,
                                color: agendaTextColor,
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: standardBorderColor, // Standard border color for table cells
                                padding: '0px', // Remove padding to make room for the inner div
                            },
                            className: 'agenda-event-wrapper',
                            innerStyle: {
                                border: `2px solid ${baseColor}`,
                                padding: '3px 7px',
                                height: '100%',
                                display: 'block',
                                boxSizing: 'border-box',
                                backgroundColor: baseColor,
                                color: baseTextColor,
                            },
                        }),
                    ...(!isSelected &&
                        !isFull && {
                            style: {
                                backgroundColor: agendaBackgroundColor,
                                color: agendaTextColor,
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: standardBorderColor, // Standard border color for table cells
                                padding: '0px', // Remove padding to make room for the inner div
                            },
                            className: 'agenda-event-wrapper',
                            innerStyle: {
                                border: `1px solid ${openShiftBorderColor}`,
                                padding: '4px 8px',
                                height: '100%',
                                display: 'block',
                                boxSizing: 'border-box',
                                backgroundColor: agendaBackgroundColor,
                            },
                        }),
                    ...(isSelected &&
                        isFull && {
                            style: {
                                backgroundColor: agendaBackgroundColor,
                                color: agendaTextColor,
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: standardBorderColor, // Standard border color for table cells
                                padding: '0px', // Remove padding to make room for the inner div
                            },
                            className: 'agenda-event-wrapper',
                            innerStyle: {
                                border: `3px solid ${baseColor}`,
                                padding: '2px 6px',
                                height: '100%',
                                display: 'block',
                                boxSizing: 'border-box',
                                backgroundColor: baseColor,
                                color: selectedTextColor,
                            },
                        }),
                    ...(isSelected &&
                        !isFull && {
                            style: {
                                backgroundColor: agendaBackgroundColor,
                                color: agendaTextColor,
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: standardBorderColor, // Standard border color for table cells
                                padding: '0px', // Remove padding to make room for the inner div
                            },
                            className: 'agenda-event-wrapper',
                            innerStyle: {
                                border: `2px solid ${openShiftBorderColor}`,
                                padding: '3px 7px',
                                height: '100%',
                                display: 'block',
                                boxSizing: 'border-box',
                                backgroundColor: agendaBackgroundColor,
                            },
                        }),
                };
            }

            // Standard styles for other views
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
        [shiftLookup, currentView]
    );

    // Transform shifts data for the calendar
    console.log('[Calendar] Starting to transform shifts data for calendar');
    const calendarEvents: Array<{
        id: string;
        title: string;
        allDay: boolean;
        start: Date;
        end: Date;
        location: {
            id: string | undefined | null;
            name: string | undefined | null;
            address: string | undefined | null;
        };
        isDraft?: boolean;
    }> = React.useMemo(() => {
        console.log('[Calendar] Inside useMemo for calendarEvents');
        console.log(
            '[Calendar] Browser local timezone:',
            DateTime.local().zoneName
        );

        // Transform regular shifts
        console.log(
            '[Calendar] Processing regular shifts, count:',
            shifts?.length || 0
        );
        const regularShiftEvents =
            shifts?.map((shift) => {
                console.log('[Calendar] Processing shift:', {
                    id: shift.id,
                    title: shift.title,
                });

                // Use the shift's timezone, or organization's timezone, or default to UTC
                const shiftTimezone =
                    shift.timezone || businessProfile?.timezone || 'UTC';
                console.log(
                    '[Calendar] Using timezone for shift:',
                    shiftTimezone
                );

                // Log original shift times
                logDateInfo('Original shift.startTime', shift.startTime);
                logDateInfo('Original shift.endTime', shift.endTime);

                // 1. Parse start time in UTC
                console.log('[Calendar] Step 1: Parse start time in UTC');
                const startDateTime = DateTime.fromJSDate(shift.startTime, {
                    zone: 'utc',
                });
                logDateInfo(
                    'startDateTime after fromJSDate with UTC zone',
                    startDateTime
                );

                // 2. Convert to the appropriate timezone (organization's timezone)
                console.log(
                    '[Calendar] Step 2: Convert to organization timezone'
                );
                const startInOrgTz = startDateTime.setZone(shiftTimezone);
                logDateInfo(
                    'startInOrgTz after setZone to shiftTimezone',
                    startInOrgTz
                );

                // 3. Force to browser's local timezone for BigCalendar
                console.log(
                    '[Calendar] Step 3: Force to browser local timezone'
                );
                const startInLocalTz = startInOrgTz.setZone(
                    DateTime.local().zoneName
                );
                logDateInfo(
                    'startInLocalTz after setZone to local',
                    startInLocalTz
                );

                // Same process for end time
                console.log('[Calendar] Processing end time');
                const endDateTime = DateTime.fromJSDate(shift.endTime, {
                    zone: 'utc',
                });
                logDateInfo(
                    'endDateTime after fromJSDate with UTC zone',
                    endDateTime
                );

                const endInOrgTz = endDateTime.setZone(shiftTimezone);
                logDateInfo(
                    'endInOrgTz after setZone to shiftTimezone',
                    endInOrgTz
                );

                const endInLocalTz = endInOrgTz.setZone(
                    DateTime.local().zoneName
                );
                logDateInfo(
                    'endInLocalTz after setZone to local',
                    endInLocalTz
                );

                // Log final JS Date objects
                const finalStartDate = startInLocalTz.toJSDate();
                const finalEndDate = endInLocalTz.toJSDate();
                logDateInfo('Final start JS Date', finalStartDate);
                logDateInfo('Final end JS Date', finalEndDate);

                return {
                    id: shift.id,
                    title: shift.title,
                    allDay: false,
                    start: finalStartDate,
                    end: finalEndDate,
                    location: {
                        id: shift?.location?.id,
                        name: shift.location?.name,
                        address: shift.location?.address,
                    },
                    isDraft: false,
                };
            }) || [];

        // Transform draft shifts
        console.log(
            '[Calendar] Processing draft shifts, count:',
            draftShifts.length
        );
        const draftShiftEvents = draftShifts.map((draft) => {
            console.log('[Calendar] Processing draft:', {
                id: draft.id,
                title: draft.title,
            });

            // Use the draft's timezone, or organization's timezone, or default to UTC
            const draftTimezone =
                draft.timezone || businessProfile?.timezone || 'UTC';
            console.log('[Calendar] Using timezone for draft:', draftTimezone);

            // Log original draft times
            logDateInfo('Original draft.date', draft.date);
            logDateInfo('Original draft.startTime', draft.startTime);
            logDateInfo('Original draft.endTime', draft.endTime);

            // For drafts, use the date field to determine the start and end times
            // If startTime and endTime are available, use them; otherwise, use the date with default times

            // 1. Parse draft date in UTC
            console.log('[Calendar] Step 1: Parse draft date in UTC');
            const draftDateUTC = DateTime.fromJSDate(draft.date, {
                zone: 'utc',
            });
            logDateInfo(
                'draftDateUTC after fromJSDate with UTC zone',
                draftDateUTC
            );

            // 2. Convert to the appropriate timezone (organization's timezone)
            console.log('[Calendar] Step 2: Convert to organization timezone');
            const draftDateInOrgTz = draftDateUTC.setZone(draftTimezone);
            logDateInfo(
                'draftDateInOrgTz after setZone to draftTimezone',
                draftDateInOrgTz
            );

            // 3. Force to browser's local timezone for BigCalendar
            console.log('[Calendar] Step 3: Force to browser local timezone');
            const draftDateInLocalTz = draftDateInOrgTz.setZone(
                DateTime.local().zoneName
            );
            logDateInfo(
                'draftDateInLocalTz after setZone to local',
                draftDateInLocalTz
            );

            // Handle different cases for start and end times
            let startTime;
            let endTime;

            if (draft.startTime && draft.endTime) {
                console.log(
                    '[Calendar] Case 1: Both startTime and endTime exist'
                );
                // Case 1: Both times exist - use them as is

                // Process start time
                console.log('[Calendar] Processing draft startTime');
                const startTimeUTC = DateTime.fromJSDate(draft.startTime, {
                    zone: 'utc',
                });
                logDateInfo(
                    'startTimeUTC after fromJSDate with UTC zone',
                    startTimeUTC
                );

                const startTimeInOrgTz = startTimeUTC.setZone(draftTimezone);
                logDateInfo(
                    'startTimeInOrgTz after setZone to draftTimezone',
                    startTimeInOrgTz
                );

                const startTimeInLocalTz = startTimeInOrgTz.setZone(
                    DateTime.local().zoneName
                );
                logDateInfo(
                    'startTimeInLocalTz after setZone to local',
                    startTimeInLocalTz
                );

                startTime = startTimeInLocalTz.toJSDate();
                logDateInfo('Final startTime JS Date', startTime);

                // Process end time
                console.log('[Calendar] Processing draft endTime');
                const endTimeUTC = DateTime.fromJSDate(draft.endTime, {
                    zone: 'utc',
                });
                logDateInfo(
                    'endTimeUTC after fromJSDate with UTC zone',
                    endTimeUTC
                );

                const endTimeInOrgTz = endTimeUTC.setZone(draftTimezone);
                logDateInfo(
                    'endTimeInOrgTz after setZone to draftTimezone',
                    endTimeInOrgTz
                );

                const endTimeInLocalTz = endTimeInOrgTz.setZone(
                    DateTime.local().zoneName
                );
                logDateInfo(
                    'endTimeInLocalTz after setZone to local',
                    endTimeInLocalTz
                );

                endTime = endTimeInLocalTz.toJSDate();
                logDateInfo('Final endTime JS Date', endTime);
            } else if (draft.startTime && !draft.endTime) {
                console.log('[Calendar] Case 2: Only startTime exists');
                // Case 2: Only start time exists - set end time to start time + 1 hour

                // Process start time
                console.log('[Calendar] Processing draft startTime');
                const startTimeUTC = DateTime.fromJSDate(draft.startTime, {
                    zone: 'utc',
                });
                logDateInfo(
                    'startTimeUTC after fromJSDate with UTC zone',
                    startTimeUTC
                );

                const startTimeInOrgTz = startTimeUTC.setZone(draftTimezone);
                logDateInfo(
                    'startTimeInOrgTz after setZone to draftTimezone',
                    startTimeInOrgTz
                );

                const startTimeInLocalTz = startTimeInOrgTz.setZone(
                    DateTime.local().zoneName
                );
                logDateInfo(
                    'startTimeInLocalTz after setZone to local',
                    startTimeInLocalTz
                );

                startTime = startTimeInLocalTz.toJSDate();
                logDateInfo('Final startTime JS Date', startTime);

                // Set end time to start time + 1 hour
                console.log('[Calendar] Setting endTime to startTime + 1 hour');
                const endTimeInLocalTz = startTimeInLocalTz.plus({ hours: 1 });
                logDateInfo(
                    'endTimeInLocalTz after plus 1 hour',
                    endTimeInLocalTz
                );

                endTime = endTimeInLocalTz.toJSDate();
                logDateInfo('Final endTime JS Date', endTime);
            } else if (!draft.startTime && draft.endTime) {
                console.log('[Calendar] Case 3: Only endTime exists');
                // Case 3: Only end time exists - set start time to end time - 1 hour

                // Process end time
                console.log('[Calendar] Processing draft endTime');
                const endTimeUTC = DateTime.fromJSDate(draft.endTime, {
                    zone: 'utc',
                });
                logDateInfo(
                    'endTimeUTC after fromJSDate with UTC zone',
                    endTimeUTC
                );

                const endTimeInOrgTz = endTimeUTC.setZone(draftTimezone);
                logDateInfo(
                    'endTimeInOrgTz after setZone to draftTimezone',
                    endTimeInOrgTz
                );

                const endTimeInLocalTz = endTimeInOrgTz.setZone(
                    DateTime.local().zoneName
                );
                logDateInfo(
                    'endTimeInLocalTz after setZone to local',
                    endTimeInLocalTz
                );

                endTime = endTimeInLocalTz.toJSDate();
                logDateInfo('Final endTime JS Date', endTime);

                // Set start time to end time - 1 hour
                console.log('[Calendar] Setting startTime to endTime - 1 hour');
                const startTimeInLocalTz = endTimeInLocalTz.minus({ hours: 1 });
                logDateInfo(
                    'startTimeInLocalTz after minus 1 hour',
                    startTimeInLocalTz
                );

                startTime = startTimeInLocalTz.toJSDate();
                logDateInfo('Final startTime JS Date', startTime);
            } else {
                console.log(
                    '[Calendar] Case 4: Neither startTime nor endTime exists'
                );
                // Case 4: Neither time exists - set to 9am to 10am
                console.log('[Calendar] Setting default times (9am-10am)');

                const startTimeInLocalTz = draftDateInLocalTz.set({
                    hour: 9,
                    minute: 0,
                    second: 0,
                    millisecond: 0,
                });
                logDateInfo(
                    'startTimeInLocalTz after set to 9am',
                    startTimeInLocalTz
                );

                startTime = startTimeInLocalTz.toJSDate();
                logDateInfo('Final startTime JS Date', startTime);

                const endTimeInLocalTz = draftDateInLocalTz.set({
                    hour: 10,
                    minute: 0,
                    second: 0,
                    millisecond: 0,
                });
                logDateInfo(
                    'endTimeInLocalTz after set to 10am',
                    endTimeInLocalTz
                );

                endTime = endTimeInLocalTz.toJSDate();
                logDateInfo('Final endTime JS Date', endTime);
            }

            return {
                id: draft.id,
                title: `${draft.title} (Draft)`,
                allDay: false,
                start: startTime,
                end: endTime,
                location: {
                    id: draft?.location?.id,
                    name: draft.location?.name,
                    address: draft.location?.address,
                },
                isDraft: true,
            };
        });

        // Combine regular shifts and draft shifts
        console.log(
            '[Calendar] Combining regularShiftEvents and draftShiftEvents'
        );
        console.log(
            '[Calendar] regularShiftEvents count:',
            regularShiftEvents.length
        );
        console.log(
            '[Calendar] draftShiftEvents count:',
            draftShiftEvents.length
        );

        const combinedEvents = [...regularShiftEvents, ...draftShiftEvents];
        console.log('[Calendar] Combined events count:', combinedEvents.length);

        // Log a sample of the combined events (first 2 events if available)
        if (combinedEvents.length > 0) {
            console.log('[Calendar] Sample of combined events:');
            combinedEvents.slice(0, 2).forEach((event, index) => {
                console.log(`[Calendar] Sample event ${index}:`, {
                    id: event.id,
                    title: event.title,
                    isDraft: event.isDraft,
                });
                logDateInfo(`Sample event ${index} start`, event.start);
                logDateInfo(`Sample event ${index} end`, event.end);
            });
        }

        return combinedEvents;
    }, [shifts, draftShifts, businessProfile?.timezone]);

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
                <Box
                    sx={{
                        width: '100%',
                        mb: 2,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                    }}
                >
                    <Box>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isAIMode}
                                    onChange={(e) =>
                                        setIsAIMode(e.target.checked)
                                    }
                                    color="primary"
                                />
                            }
                            label={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <AutoAwesomeIcon
                                        color={isAIMode ? 'primary' : 'action'}
                                    />
                                    <Typography
                                        variant="body2"
                                        color={
                                            isAIMode
                                                ? 'primary'
                                                : 'text.secondary'
                                        }
                                    >
                                        AI Shift Mode
                                    </Typography>
                                </Box>
                            }
                        />
                    </Box>
                </Box>
                <Box
                    sx={{
                        height: 'calc(100vh - 200px)',
                        width: '100%',
                        mb: 2,
                        alignItems: 'center',
                    }}
                >
                    <BigCalendar
                        onShowMore={() => setCurrentView('agenda')}
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
                        views={{
                            month: true,
                            week: true,
                            day: true,
                            agenda: CalendarAgenda,
                        }}
                        onView={setCurrentView}
                        view={currentView as any}
                        date={currentDate as any}
                        onNavigate={(date) => {
                            setCurrentDate(date);
                        }}
                    />
                </Box>

                {/* Add buttons for creating new shifts (only for admins) */}
                {isAdmin && (
                    <Container sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <IconButton
                            onClick={() => dialogs.open(ShiftDialog, null)}
                        >
                            <AddIcon /> Add Shift
                        </IconButton>
                        <IconButton
                            onClick={() => setIsAIInputOpen(true)}
                            color="primary"
                        >
                            <AutoAwesomeIcon /> Add with AI
                        </IconButton>
                    </Container>
                )}

                {/* AI Dialogs */}
                <AIShiftInputDialog
                    open={isAIInputOpen}
                    onClose={() => setIsAIInputOpen(false)}
                    onParse={handleAIParse}
                    isParsing={parseShiftMutation.isPending}
                    defaultDate={aiSelectedDate}
                />

                <AIShiftReviewDialog
                    open={isAIReviewOpen}
                    onClose={() => setIsAIReviewOpen(false)}
                    parsedData={aiParsedData}
                    onSave={handleAISave}
                />
            </Grid>
        </Box>
    );
}

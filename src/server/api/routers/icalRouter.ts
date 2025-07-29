import { z } from 'zod';
import { publicProcedure, router } from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import ical, { ICalCalendarMethod, ICalEventStatus } from 'ical-generator';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to convert a UTC date to the specified timezone
function convertUtcToTimezone(
    utcDate: Date,
    timezone: string = 'America/New_York'
): Date {
    // Convert the UTC date to the specified timezone
    return dayjs(utcDate).tz(timezone).toDate();
}

export const icalRouter = router({
    getIcal: publicProcedure
        .input(
            z.object({
                tenantId: z.string(),
                icalSlug: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { tenantId, icalSlug } = input;

            if (!tenantId || !icalSlug) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'tenantId and icalSlug are required',
                });
            }

            try {
                // Find the member by icalSlug
                const member = await ctx.prisma.member.findFirst({
                    where: {
                        organizationId: tenantId,
                        icalSlug: icalSlug,
                    },
                    include: {
                        user: true,
                    },
                });

                if (!member) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'No user found matching the provided icalSlug',
                    });
                }

                // Get assigned shifts
                const assignedShifts = await ctx.prisma.shift.findMany({
                    where: {
                        organizationId: tenantId,
                        shiftAssignments: {
                            some: {
                                memberId: member.id,
                                outcome: 'assigned',
                            },
                        },
                    },
                    include: {
                        shiftAssignments: {
                            where: {
                                memberId: member.id,
                            },
                        },
                    },
                });

                // Get offered shifts (pending requests)
                const offeredShifts = await ctx.prisma.shift.findMany({
                    where: {
                        organizationId: tenantId,
                        shiftRequests: {
                            some: {
                                memberId: member.id,
                                status: 'pending',
                            },
                        },
                    },
                    include: {
                        shiftRequests: {
                            where: {
                                memberId: member.id,
                            },
                        },
                    },
                });

                // Combine shifts and add status
                const assignedShiftsWithStatus = assignedShifts.map(
                    (shift) => ({
                        ...shift,
                        status: 'assigned',
                    })
                );

                const offeredShiftsWithStatus = offeredShifts.map((shift) => ({
                    ...shift,
                    status: 'offered',
                }));

                // Create a map to deduplicate shifts
                const shiftMap = new Map();

                // Prioritize assigned shifts over offered shifts
                offeredShiftsWithStatus.forEach((shift) => {
                    shiftMap.set(shift.id, shift);
                });

                assignedShiftsWithStatus.forEach((shift) => {
                    shiftMap.set(shift.id, shift);
                });

                const shifts = Array.from(shiftMap.values());

                // Create iCal calendar
                const calendar = ical({
                    name: `${member.name || member.user.name || member.user.email} - Shifts`,
                });
                calendar.method(ICalCalendarMethod.REQUEST);

                // Add events to calendar
                for (const shift of shifts) {
                    // Convert startTime and endTime from UTC to the shift's timezone
                    const startTime = convertUtcToTimezone(
                        shift.startTime,
                        shift.timezone
                    );
                    const endTime = convertUtcToTimezone(
                        shift.endTime,
                        shift.timezone
                    );

                    calendar.createEvent({
                        id: shift.id,
                        start: startTime,
                        end: endTime,
                        summary: `${shift.title} - ${shift.status}`,
                        description: shift.notes || '',
                        location: shift.location || '',
                        status:
                            shift.status === 'assigned'
                                ? ICalEventStatus.CONFIRMED
                                : ICalEventStatus.TENTATIVE,
                        organizer: {
                            name:
                                member.name ||
                                member.user.name ||
                                member.user.email,
                            email: member.user.email,
                        },
                    });
                }

                // Return the iCal data
                return calendar.toString();
            } catch (err) {
                console.error('Error fetching user:', err);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Internal server error',
                    cause: err,
                });
            }
        }),

    getIcalHtml: publicProcedure
        .input(
            z.object({
                tenantId: z.string(),
                icalSlug: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { tenantId, icalSlug } = input;

            if (!tenantId || !icalSlug) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'tenantId and icalSlug are required',
                });
            }

            try {
                // Find the member by icalSlug
                const member = await ctx.prisma.member.findFirst({
                    where: {
                        organizationId: tenantId,
                        icalSlug: icalSlug,
                    },
                    include: {
                        user: true,
                    },
                });

                if (!member) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'No user found matching the provided icalSlug',
                    });
                }

                // Get assigned shifts
                const assignedShifts = await ctx.prisma.shift.findMany({
                    where: {
                        organizationId: tenantId,
                        shiftAssignments: {
                            some: {
                                memberId: member.id,
                                outcome: 'assigned',
                            },
                        },
                    },
                    include: {
                        shiftAssignments: {
                            where: {
                                memberId: member.id,
                            },
                        },
                    },
                });

                // Get offered shifts (pending requests)
                const offeredShifts = await ctx.prisma.shift.findMany({
                    where: {
                        organizationId: tenantId,
                        shiftRequests: {
                            some: {
                                memberId: member.id,
                                status: 'pending',
                            },
                        },
                    },
                    include: {
                        shiftRequests: {
                            where: {
                                memberId: member.id,
                            },
                        },
                    },
                });

                // Combine shifts and add status
                const assignedShiftsWithStatus = assignedShifts.map(
                    (shift) => ({
                        ...shift,
                        status: 'assigned',
                    })
                );

                const offeredShiftsWithStatus = offeredShifts.map((shift) => ({
                    ...shift,
                    status: 'offered',
                }));

                // Create a map to deduplicate shifts
                const shiftMap = new Map();

                // Prioritize assigned shifts over offered shifts
                offeredShiftsWithStatus.forEach((shift) => {
                    shiftMap.set(shift.id, shift);
                });

                assignedShiftsWithStatus.forEach((shift) => {
                    shiftMap.set(shift.id, shift);
                });

                const shifts = Array.from(shiftMap.values());

                // Sort shifts by date and time
                shifts.sort((a, b) => {
                    // Check if both dates exist
                    if (a.date && b.date) {
                        if (a.date.getTime() !== b.date.getTime()) {
                            return a.date.getTime() - b.date.getTime();
                        }
                    } else if (a.date) {
                        // If only a.date exists, prioritize it
                        return -1;
                    } else if (b.date) {
                        // If only b.date exists, prioritize it
                        return 1;
                    }
                    // If no dates or dates are equal, sort by startTime
                    return a.startTime.getTime() - b.startTime.getTime();
                });

                // Generate HTML
                const userName =
                    member.name || member.user.name || member.user.email;
                // Get the default timezone for the page
                const defaultTimezone = 'America/New_York'; // Default timezone used in convertUtcToTimezone
                let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${userName} - Shifts</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            .timezone-info { color: #666; margin-bottom: 20px; font-style: italic; }
            .shift { margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            .shift-title { font-weight: bold; font-size: 18px; }
            .shift-date { color: #666; }
            .shift-time { color: #666; }
            .shift-timezone { color: #666; }
            .shift-location { color: #666; }
            .shift-status { font-weight: bold; }
            .assigned { color: green; }
            .offered { color: orange; }
            .shift-notes { margin-top: 10px; font-style: italic; }
          </style>
        </head>
        <body>
          <h1>${userName} - Shifts</h1>
          <div class="timezone-info">Default Timezone: ${defaultTimezone}</div>
        `;

                if (shifts.length === 0) {
                    html += '<p>No shifts found.</p>';
                } else {
                    shifts.forEach((shift) => {
                        // Convert startTime and endTime from UTC to the shift's timezone
                        console.dir('LOLOLO');

                        const localStartTime = convertUtcToTimezone(
                            shift.startTime,
                            shift.timezone
                        );
                        console.dir({
                            localStartTime,
                            st: shift.startTime,
                            tz: shift.timezone,
                        });
                        const localEndTime = convertUtcToTimezone(
                            shift.endTime,
                            shift.timezone
                        );
                        console.dir({
                            localEndTime,
                            et: shift.endTime,
                            tz: shift.timezone,
                        });

                        // Use shift.date if available, otherwise use startTime for the date
                        const date = shift.date
                            ? dayjs(shift.date).format('MMMM D, YYYY')
                            : dayjs(localStartTime).format('MMMM D, YYYY');
                        const startTime =
                            dayjs(localStartTime).format('h:mm A');
                        const endTime = dayjs(localEndTime).format('h:mm A');
                        const statusClass =
                            shift.status === 'assigned'
                                ? 'assigned'
                                : 'offered';

                        html += `
            <div class="shift">
              <div class="shift-title">${shift.title}</div>
              <div class="shift-date">${date}</div>
              <div class="shift-time">${startTime} - ${endTime}</div>
              <div class="shift-timezone">Timezone: ${shift.timezone || defaultTimezone}</div>
              ${shift.location ? `<div class="shift-location">Location: ${shift.location}</div>` : ''}
              <div class="shift-status">Status: <span class="${statusClass}">${shift.status}</span></div>
              ${shift.notes ? `<div class="shift-notes">Notes: ${shift.notes}</div>` : ''}
            </div>
            `;
                    });
                }

                html += `
        </body>
        </html>
        `;

                return html;
            } catch (err) {
                console.error('Error fetching user:', err);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Internal server error',
                    cause: err,
                });
            }
        }),
});

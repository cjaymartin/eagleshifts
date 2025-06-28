import { z } from 'zod';
import { router, adminProcedure, memberProcedure } from '@/server/trpc';
import { Prisma } from '@/generated/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

// Extend dayjs with UTC plugin
dayjs.extend(utc);

// Helper function to convert date strings to YYYY-MM-DD format
function formatDateString(dateString: string): string {
    return dayjs.utc(dateString).format('YYYY-MM-DD');
}

// Helper function to parse date strings without timezone issues
function parseDateString(dateString: string): Date {
    // Parse the date string as YYYY-MM-DD and set the time to noon UTC
    // This ensures that the date will be the same regardless of timezone
    return dayjs.utc(`${formatDateString(dateString)}T12:00:00Z`).toDate();
}

// Helper function to adjust a time to match the date of a given date
function adjustTimeToDate(timeString: string, dateString: string): Date {
    // Extract the date part from the shift date
    const dateOnly = dayjs.utc(dateString).format('YYYY-MM-DD');
    // Extract the time part from the time
    const timeOnly = dayjs.utc(timeString).format('HH:mm:ss');
    // Combine them and create a new Date

    console.log({
        cmd: 'adjusttime',
        timeString,
        dateString,
        dateOnly,
        timeOnly,
        prev: `${dateOnly}T${timeOnly}Z`,
        rval: dayjs.utc(`${dateOnly}T${timeOnly}Z`).toDate(),
    });

    return dayjs.utc(`${dateOnly}T${timeOnly}Z`).toDate();
}

export const shiftsRouter = router({
    seed: adminProcedure.query(async ({ ctx }) => {
        // Check if the organization has any shifts
        const existingShiftsCount = await ctx.prisma.shift.count({
            where: { organizationId: ctx.user.organizationId },
        });

        if (existingShiftsCount > 0) {
            throw new Error('Shifts already exist for this organization');
        }

        // Generate a dozen random shifts
        const shifts = Array.from({ length: 12 }).map((_, index) => ({
            organizationId: ctx.user.organizationId,
            title: `Shift ${index + 1}`,
            location: `Location ${index + 1}`,
            date: new Date(new Date().setDate(new Date().getDate() + index)), // Shift dates in the future
            startTime: new Date(new Date().setHours(9, 0, 0, 0)), // 9:00 AM
            endTime: new Date(new Date().setHours(17, 0, 0, 0)), // 5:00 PM
            slots: Math.floor(Math.random() * 10) + 1, // Random number of slots between 1 and 10
            notes: `Notes for shift ${index + 1}`,
            adminNotes: `Admin notes for shift ${index + 1}`,
            timezone: 'America/New_York',
        }));

        // Insert shifts into the database
        const createdShifts = await ctx.prisma.shift.createMany({
            data: shifts,
        });

        return {
            success: true,
            message: `${createdShifts.count} shifts have been added for this organization.`,
            shifts,
        };
    }),

    list: memberProcedure
        .input(
            z
                .object({
                    title: z.string().optional(),
                    location: z.string().optional(),
                    startDate: z.string().optional(),
                    endDate: z.string().optional(),
                    assigned: z.string().optional(),
                    unfilled: z
                        .enum(['unfilled', 'filled', 'mine', 'any'])
                        .optional(),
                })
                .optional()
        )
        .query(async ({ ctx, input }) => {
            // Build filter conditions
            const where: Prisma.ShiftWhereInput = {
                organizationId: ctx.user.organizationId,
            };

            if (input) {
                if (input.title)
                    where.title = {
                        contains: input.title,
                        mode: 'insensitive',
                    };
                if (input.location)
                    where.location = {
                        contains: input.location,
                        mode: 'insensitive',
                    };

                if (input.startDate || input.endDate) {
                    where.date = {};
                    if (input.startDate)
                        where.date.gte = parseDateString(input.startDate);
                    if (input.endDate)
                        where.date.lte = parseDateString(input.endDate);
                }

                // Handle assigned filter
                if (input.assigned) {
                    // Find the member records for the given user ID in the current organization
                    const members = await ctx.prisma.member.findMany({
                        where: {
                            organizationId: ctx.user.organizationId,
                            userId: input.assigned,
                        },
                        select: {
                            id: true,
                        },
                    });

                    // Get the member IDs
                    const memberIds = members.map((member) => member.id);

                    // Filter shifts where any of the shift assignments have a member with one of the member IDs
                    where.shiftAssignments = {
                        some: {
                            memberId: {
                                in: memberIds,
                            },
                            outcome: 'assigned',
                        },
                    };
                }

                // Handle unfilled filter
                if (input.unfilled === 'unfilled') {
                    // Get shifts where the number of assigned members is less than the number of slots
                    // We can't directly compare counts in Prisma, so we'll fetch all shifts and filter them later
                    where.OR = [
                        // Either no assignments at all
                        { shiftAssignments: { none: {} } },
                        // Or some assignments but we'll filter further in memory
                        { shiftAssignments: { some: { outcome: 'assigned' } } },
                    ];
                } else if (input.unfilled === 'filled') {
                    // We'll fetch shifts with at least one assignment and filter them later
                    where.shiftAssignments = { some: { outcome: 'assigned' } };
                } else if (input.unfilled === 'mine') {
                    // Find the member records for the current user in the current organization
                    const members = await ctx.prisma.member.findMany({
                        where: {
                            organizationId: ctx.user.organizationId,
                            userId: ctx.user.id,
                        },
                        select: {
                            id: true,
                        },
                    });

                    // Get the member IDs
                    const memberIds = members.map((member) => member.id);

                    // Filter shifts where any of the shift assignments have a member with one of the member IDs
                    where.shiftAssignments = {
                        some: {
                            memberId: {
                                in: memberIds,
                            },
                            outcome: 'assigned',
                        },
                    };
                }
            }

            // Get filtered shifts
            const shifts = await ctx.prisma.shift.findMany({
                where,
                include: {
                    shiftAssignments: true,
                    shiftRequests: true,
                },
                orderBy: { date: 'asc' },
            });

            // Apply additional filtering for "filled" and "unfilled" that can't be done in Prisma
            if (
                input?.unfilled === 'filled' ||
                input?.unfilled === 'unfilled'
            ) {
                return shifts.filter((shift) => {
                    // Count assignments with outcome "assigned"
                    const assignedCount = shift.shiftAssignments.filter(
                        (assignment) => assignment.outcome === 'assigned'
                    ).length;

                    if (input.unfilled === 'filled') {
                        // For "filled", return shifts where assignedCount >= slots
                        return assignedCount >= shift.slots;
                    } else {
                        // For "unfilled", return shifts where assignedCount < slots
                        return assignedCount < shift.slots;
                    }
                });
            }

            // Format dates as YYYY-MM-DD strings for the response
            return shifts.map((shift) => ({
                ...shift,
                date: formatDateString(shift.date.toISOString()),
                startTime: shift.startTime,
                endTime: shift.endTime,
            }));
        }),

    byId: memberProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const shift = await ctx.prisma.shift.findFirst({
                where: {
                    id: input.id,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    shiftAssignments: true,
                    shiftRequests: true,
                },
            });

            if (!shift) {
                throw new Error('Shift not found');
            }

            // Format dates as YYYY-MM-DD strings for the response
            return {
                ...shift,
                date: formatDateString(shift.date.toISOString()),
                startTime: formatDateString(shift.startTime.toISOString()),
                endTime: formatDateString(shift.endTime.toISOString()),
            };
        }),

    create: adminProcedure
        .input(
            z.object({
                title: z.string(),
                location: z.string().optional(),
                date: z.string(),
                startTime: z.string(),
                endTime: z.string(),
                slots: z.number(),
                notes: z.string().optional(),
                adminNotes: z.string().optional(),
                timezone: z.string().optional().default('America/New_York'),
                assignments: z
                    .array(
                        z.object({
                            userId: z.string(),
                            outcome: z.enum(['assigned', 'waiting', 'refused']),
                            reason: z.string().optional(),
                        })
                    )
                    .optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const shift = await ctx.prisma.shift.create({
                data: {
                    organizationId: ctx.user.organizationId,
                    title: input.title,
                    location: input.location,
                    date: parseDateString(input.date),
                    startTime: adjustTimeToDate(input.startTime, input.date),
                    endTime: adjustTimeToDate(input.endTime, input.date),
                    slots: input.slots,
                    notes: input.notes,
                    adminNotes: input.adminNotes,
                    timezone: input.timezone,
                    // We'll handle assignments separately
                    shiftAssignments: undefined,
                },
                include: {
                    shiftAssignments: true,
                },
            });

            // If assignments are provided, create them
            if (input.assignments && input.assignments.length > 0) {
                // First, find the member IDs for the given user IDs in the current organization
                const members = await ctx.prisma.member.findMany({
                    where: {
                        organizationId: ctx.user.organizationId,
                        userId: {
                            in: input.assignments.map((a) => a.userId),
                        },
                    },
                    select: {
                        id: true,
                        userId: true,
                    },
                });

                // Create a mapping from userId to memberId
                const userToMemberMap = {};
                members.forEach((member) => {
                    userToMemberMap[member.userId] = member.id;
                });

                // Create assignments using the correct member IDs
                await ctx.prisma.shiftAssignment.createMany({
                    data: input.assignments
                        .filter(
                            (assignment) => userToMemberMap[assignment.userId]
                        ) // Only include users that have a valid member record
                        .map((assignment) => ({
                            shiftId: shift.id,
                            memberId: userToMemberMap[assignment.userId],
                            outcome: assignment.outcome,
                            reason: assignment.reason,
                        })),
                });

                // Fetch the updated shift with assignments
                const updatedShift = await ctx.prisma.shift.findUnique({
                    where: { id: shift.id },
                    include: { shiftAssignments: true },
                });

                return updatedShift;
            }

            // Format dates as YYYY-MM-DD strings for the response
            return {
                ...shift,
                date: formatDateString(shift.date.toISOString()),
                startTime: formatDateString(shift.startTime.toISOString()),
                endTime: formatDateString(shift.endTime.toISOString()),
            };
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.string(),
                title: z.string(),
                location: z.string().optional(),
                date: z.string(),
                startTime: z.string(),
                endTime: z.string(),
                slots: z.number(),
                notes: z.string().optional(),
                adminNotes: z.string().optional(),
                timezone: z.string(),
                assignments: z
                    .array(
                        z.object({
                            userId: z.string(),
                            outcome: z.enum(['assigned', 'waiting', 'refused']),
                            reason: z.string().optional(),
                        })
                    )
                    .optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                const { id, ...data } = input;

                // First update the shift
                const shift = await ctx.prisma.shift.update({
                    where: {
                        id: id,
                    },
                    data: {
                        title: data.title,
                        location: data.location,
                        date: parseDateString(data.date),
                        startTime: adjustTimeToDate(data.startTime, data.date),
                        endTime: adjustTimeToDate(data.endTime, data.date),
                        slots: data.slots,
                        notes: data.notes,
                        adminNotes: data.adminNotes,
                        timezone: data.timezone,
                    },
                    include: {
                        shiftAssignments: true,
                    },
                });

                // If assignments are provided, update them
                if (data.assignments) {
                    // First delete all existing assignments
                    await ctx.prisma.shiftAssignment.deleteMany({
                        where: {
                            shiftId: id,
                        },
                    });

                    // Then create new assignments
                    // First, find the member IDs for the given user IDs in the current organization
                    const members = await ctx.prisma.member.findMany({
                        where: {
                            organizationId: ctx.user.organizationId,
                            userId: {
                                in: data.assignments.map((a) => a.userId),
                            },
                        },
                        select: {
                            id: true,
                            userId: true,
                        },
                    });

                    // Create a mapping from userId to memberId
                    const userToMemberMap = {};
                    members.forEach((member) => {
                        userToMemberMap[member.userId] = member.id;
                    });

                    // Create assignments using the correct member IDs
                    await ctx.prisma.shiftAssignment.createMany({
                        data: data.assignments
                            .filter(
                                (assignment) =>
                                    userToMemberMap[assignment.userId]
                            ) // Only include users that have a valid member record
                            .map((assignment) => ({
                                shiftId: id,
                                memberId: userToMemberMap[assignment.userId],
                                outcome: assignment.outcome,
                                reason: assignment.reason,
                            })),
                    });
                }

                if (!shift) {
                    throw new Error('Shift not found');
                }

                // If assignments were updated, fetch the updated shift with the new assignments
                if (data.assignments) {
                    const updatedShift = await ctx.prisma.shift.findUnique({
                        where: { id },
                        include: { shiftAssignments: true },
                    });

                    // Format dates as YYYY-MM-DD strings for the response
                    return {
                        ...updatedShift,
                        date: formatDateString(updatedShift.date.toISOString()),
                        startTime: formatDateString(
                            updatedShift.startTime.toISOString()
                        ),
                        endTime: formatDateString(
                            updatedShift.endTime.toISOString()
                        ),
                    };
                }

                // Format dates as YYYY-MM-DD strings for the response
                return {
                    ...shift,
                    date: formatDateString(shift.date.toISOString()),
                    startTime: formatDateString(shift.startTime.toISOString()),
                    endTime: formatDateString(shift.endTime.toISOString()),
                };
            } catch (error) {
                throw new Error(`Failed to update shift: ${error.message}`);
            }
        }),

    delete: adminProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            try {
                const shift = await ctx.prisma.shift.deleteMany({
                    where: {
                        id: input.id,
                        organizationId: ctx.user.organizationId,
                    },
                });

                if (!shift) {
                    throw new Error('Shift not found');
                }

                return { success: true, message: 'Shift deleted successfully' };
            } catch (error) {
                throw new Error(`Failed to delete shift: ${error.message}`);
            }
        }),
});

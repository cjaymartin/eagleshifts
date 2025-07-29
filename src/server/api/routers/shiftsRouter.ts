import { z } from 'zod';
import { router, adminProcedure, memberProcedure } from '@/server/trpc';
import { Prisma } from '@/generated/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { TRPCError } from '@trpc/server';

// Extend dayjs with UTC and timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to parse ISO8601 date strings to UTC Date objects
function parseISOString(isoString: string): Date {
    return dayjs.utc(isoString).toDate();
}

// Helper function to convert a date to the specified timezone
function convertToTimezone(
    isoString: string,
    timezone: string = 'America/New_York'
): Date {
    // Check if the ISO string already includes timezone information
    const hasTimezoneInfo =
        /[+-]\d{2}:?\d{2}$/.test(isoString) || isoString.endsWith('Z');

    let adjustedUtcDateTime;

    if (hasTimezoneInfo) {
        // If the string already has timezone info, parse it directly and convert to UTC
        adjustedUtcDateTime = dayjs(isoString).utc();
    } else {
        // Parse the ISO string as UTC
        const utcDateTime = dayjs.utc(isoString);

        // Extract date and time components
        const dateStr = utcDateTime.format('YYYY-MM-DD');
        const timeStr = utcDateTime.format('HH:mm:ss');

        // Create a datetime in the specified timezone
        // This ensures that if the user enters 9:00 AM EST, it's stored as 9:00 AM EST (or 2:00 PM UTC)
        const localDateTime = dayjs.tz(`${dateStr}T${timeStr}`, timezone);

        // Convert back to UTC for storage
        adjustedUtcDateTime = localDateTime.utc();
    }

    console.log({
        cmd: 'convertToTimezone',
        isoString,
        timezone,
        hasTimezoneInfo,
        adjustedUtcDateTime: adjustedUtcDateTime.format(),
        rval: adjustedUtcDateTime.toDate(),
    });

    return adjustedUtcDateTime.toDate();
}

// Helper function to adjust a time to match the date of a given date and convert to UTC
function adjustTimeToDate(
    timeString: string,
    dateString: string,
    timezone: string = 'America/New_York'
): Date {
    // Extract the date part from the shift date
    const dateOnly = dayjs(dateString).format('YYYY-MM-DD');
    // Extract the time part from the time
    const timeOnly = dayjs(timeString).format('HH:mm:ss');
    // Combine them and create a date in the specified timezone
    const localDateTime = dayjs.tz(`${dateOnly}T${timeOnly}`, timezone);
    // Convert to UTC for storage
    const utcDateTime = localDateTime.utc();

    console.log({
        cmd: 'adjusttime',
        timeString,
        dateString,
        timezone,
        dateOnly,
        timeOnly,
        localDateTime: localDateTime.format(),
        utcDateTime: utcDateTime.format(),
        rval: utcDateTime.toDate(),
    });

    return utcDateTime.toDate();
}

// Helper function to convert a UTC date to the specified timezone
function convertUtcToTimezone(
    utcDate: Date,
    timezone: string = 'America/New_York'
): Date {
    // Convert the UTC date to the specified timezone
    return dayjs.utc(utcDate).tz(timezone).toDate();
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
        const shifts = Array.from({ length: 12 }).map((_, index) => {
            // Create base date for the shift (today + index days)
            const baseDate = dayjs().add(index, 'day');

            // Create start and end times for the shift
            const startTime = baseDate.hour(9).minute(0).second(0); // 9:00 AM
            const endTime = baseDate.hour(17).minute(0).second(0); // 5:00 PM

            return {
                organizationId: ctx.user.organizationId,
                title: `Shift ${index + 1}`,
                location: `Location ${index + 1}`,
                startTime: convertToTimezone(
                    startTime.toISOString(),
                    'America/New_York'
                ),
                endTime: convertToTimezone(
                    endTime.toISOString(),
                    'America/New_York'
                ),
                slots: Math.floor(Math.random() * 10) + 1, // Random number of slots between 1 and 10
                notes: `Notes for shift ${index + 1}`,
                adminNotes: `Admin notes for shift ${index + 1}`,
                timezone: 'America/New_York',
            };
        });

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
            // Check if user is admin or member
            const isAdmin =
                ctx.user.role === 'admin' || ctx.user.role === 'owner';

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
                    // Filter based on startTime instead of date
                    if (input.startDate) {
                        // Start of the day in the specified timezone
                        const startOfDay = dayjs
                            .tz(input.startDate, 'America/New_York')
                            .startOf('day')
                            .utc()
                            .toDate();
                        where.startTime =
                            where.startTime &&
                            typeof where.startTime === 'object'
                                ? { ...where.startTime, gte: startOfDay }
                                : { gte: startOfDay };
                    }
                    if (input.endDate) {
                        // End of the day in the specified timezone
                        const endOfDay = dayjs
                            .tz(input.endDate, 'America/New_York')
                            .endOf('day')
                            .utc()
                            .toDate();
                        where.endTime =
                            where.endTime && typeof where.endTime === 'object'
                                ? { ...where.endTime, lte: endOfDay }
                                : { lte: endOfDay };
                    }
                }

                // Handle assigned filter
                if (input.assigned) {
                    // Use the member ID directly
                    where.shiftAssignments = {
                        some: {
                            memberId: input.assigned,
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
                orderBy: { startTime: 'asc' },
            });

            // Apply filtering based on user role and query parameters
            let filteredShifts = shifts;

            // For non-admin users, apply access rules filtering
            if (!isAdmin && ctx.user.memberId) {
                console.log(
                    `Applying member access rules for user with memberId: ${ctx.user.memberId}`
                );
                const userMemberId = ctx.user.memberId;

                const originalCount = filteredShifts.length;
                filteredShifts = filteredShifts.filter((shift) => {
                    // Rule 1: User has an assigned or pending shiftAssignment for this shift
                    const userHasAssignment = shift.shiftAssignments.some(
                        (assignment) =>
                            assignment.memberId === userMemberId &&
                            (assignment.outcome === 'assigned' ||
                                assignment.outcome === 'waiting')
                    );

                    if (userHasAssignment) {
                        console.log(
                            `Shift ${shift.id} accessible: User has an assignment`
                        );
                        return true;
                    }

                    // Rule 2: Count of pending/assigned shiftAssignments is less than the number of open slots
                    const assignedCount = shift.shiftAssignments.filter(
                        (assignment) =>
                            assignment.outcome === 'assigned' ||
                            assignment.outcome === 'waiting'
                    ).length;

                    const hasAvailableSlots = assignedCount < shift.slots;
                    console.log(
                        `Shift ${shift.id} ${hasAvailableSlots ? 'accessible' : 'not accessible'}: ${assignedCount}/${shift.slots} slots filled`
                    );

                    return hasAvailableSlots;
                });
                console.log(
                    `Member access rules filtered shifts from ${originalCount} to ${filteredShifts.length}`
                );
            }

            // Apply additional filtering for "filled" and "unfilled" that can't be done in Prisma
            if (
                input?.unfilled === 'filled' ||
                input?.unfilled === 'unfilled'
            ) {
                filteredShifts = filteredShifts.filter((shift) => {
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

            // Convert startTime and endTime from UTC to the shift's timezone
            return filteredShifts.map((shift) => ({
                ...shift,
                startTime: convertUtcToTimezone(
                    shift.startTime,
                    shift.timezone
                ),
                endTime: convertUtcToTimezone(shift.endTime, shift.timezone),
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
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Shift not found',
                });
            }

            // Check if user is admin or member
            const isAdmin =
                ctx.user.role === 'admin' || ctx.user.role === 'owner';

            // For non-admin users, check if they should have access to this shift
            if (!isAdmin && ctx.user.memberId) {
                console.log(
                    `Checking member access for shift ${shift.id} for user with memberId: ${ctx.user.memberId}`
                );
                const userMemberId = ctx.user.memberId;

                // Rule 1: User has an assigned or pending shiftAssignment for this shift
                const userHasAssignment = shift.shiftAssignments.some(
                    (assignment) =>
                        assignment.memberId === userMemberId &&
                        (assignment.outcome === 'assigned' ||
                            assignment.outcome === 'waiting')
                );

                if (userHasAssignment) {
                    console.log(
                        `Access granted: User has an assignment for shift ${shift.id}`
                    );
                    // User has an assignment, allow access
                } else {
                    // Rule 2: Count of pending/assigned shiftAssignments is less than the number of open slots
                    const assignedCount = shift.shiftAssignments.filter(
                        (assignment) =>
                            assignment.outcome === 'assigned' ||
                            assignment.outcome === 'waiting'
                    ).length;

                    console.log(
                        `Shift ${shift.id} has ${assignedCount}/${shift.slots} slots filled`
                    );

                    if (assignedCount >= shift.slots) {
                        console.log(
                            `Access denied: Shift ${shift.id} is full and user doesn't have an assignment`
                        );
                        // Shift is full and user doesn't have an assignment, deny access
                        throw new TRPCError({
                            code: 'FORBIDDEN',
                            message: 'You do not have access to this shift',
                        });
                    } else {
                        console.log(
                            `Access granted: Shift ${shift.id} has available slots`
                        );
                    }
                }
            }

            // Convert startTime and endTime from UTC to the shift's timezone
            return {
                ...shift,
                startTime: convertUtcToTimezone(
                    shift.startTime,
                    shift.timezone
                ),
                endTime: convertUtcToTimezone(shift.endTime, shift.timezone),
            };
        }),

    create: adminProcedure
        .input(
            z.object({
                title: z.string(),
                location: z.string().optional(),
                startTime: z.string(), // ISO8601 date string
                endTime: z.string(), // ISO8601 date string
                slots: z.number(),
                notes: z.string().optional(),
                adminNotes: z.string().optional(),
                timezone: z.string().optional().default('America/New_York'),
                assignments: z
                    .array(
                        z.object({
                            memberId: z.string(),
                            outcome: z.enum(['assigned', 'waiting', 'refused']),
                            reason: z.string().optional(),
                        })
                    )
                    .optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            console.log('Shift create input:', JSON.stringify(input, null, 2));

            // Check for the problematic member ID
            if (
                input.assignments &&
                input.assignments.some(
                    (a) => a.memberId === 'GMFdgYXfRFixlN9V9PRW4g'
                )
            ) {
                console.log(
                    'Found problematic user ID: GMFdgYXfRFixlN9V9PRW4g'
                );
                try {
                    // Try to find the user directly
                    const problematicUser = await ctx.prisma.user.findUnique({
                        where: { id: 'GMFdgYXfRFixlN9V9PRW4g' },
                    });
                    console.log(
                        'Problematic user lookup result:',
                        problematicUser
                    );

                    // Try raw query
                    const rawResult = await ctx.prisma.$queryRaw`
                        SELECT id, name, email FROM "user" WHERE id = ${'GMFdgYXfRFixlN9V9PRW4g'}
                    `;
                    console.log(
                        'Raw query result for problematic user:',
                        rawResult
                    );

                    // Check if there are any users with similar IDs
                    const similarUsers = await ctx.prisma.user.findMany({
                        where: {
                            id: {
                                contains: 'GMFdgYXf',
                            },
                        },
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    });
                    console.log('Users with similar IDs:', similarUsers);
                } catch (error: any) {
                    console.error('Error checking problematic user:', error);
                }
            }
            const shift = await ctx.prisma.shift.create({
                data: {
                    organizationId: ctx.user.organizationId,
                    title: input.title,
                    location: input.location,
                    startTime: convertToTimezone(
                        input.startTime,
                        input.timezone
                    ),
                    endTime: convertToTimezone(input.endTime, input.timezone),
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
                console.log('Creating assignments:', input.assignments);

                // Log organization info
                console.log(`Organization ID: ${ctx.user.organizationId}`);
                try {
                    const organization =
                        await ctx.prisma.organization.findUnique({
                            where: { id: ctx.user.organizationId },
                        });
                    console.log(`Organization details:`, organization);
                } catch (orgError) {
                    console.error(`Error fetching organization:`, orgError);
                }

                // Use the member IDs directly from the input
                console.log(
                    `Using member IDs:`,
                    input.assignments.map((a) => a.memberId)
                );

                // Verify that the member IDs exist in the current organization
                const members = await ctx.prisma.member.findMany({
                    where: {
                        organizationId: ctx.user.organizationId,
                        id: {
                            in: input.assignments.map((a) => a.memberId),
                        },
                    },
                    select: {
                        id: true,
                        userId: true,
                        name: true,
                    },
                });
                console.log('Found members:', members);

                // Create a set of valid member IDs
                const validMemberIds = new Set(
                    members.map((member) => member.id)
                );
                console.log('Valid member IDs:', Array.from(validMemberIds));

                // Check if we have any assignments with missing member IDs
                const missingMembers = input.assignments.filter(
                    (assignment) => !validMemberIds.has(assignment.memberId)
                );
                if (missingMembers.length > 0) {
                    console.log(
                        'Missing member IDs:',
                        missingMembers.map((a) => a.memberId)
                    );
                    console.log(
                        'These member IDs will be skipped as they do not exist in the organization.'
                    );
                }

                // Prepare assignment data
                const assignmentData = input.assignments
                    .filter((assignment) =>
                        validMemberIds.has(assignment.memberId)
                    ) // Only include valid member IDs
                    .map((assignment) => ({
                        shiftId: shift.id,
                        memberId: assignment.memberId,
                        outcome: assignment.outcome,
                        reason: assignment.reason || '',
                    }));
                console.log('Assignment data to create:', assignmentData);

                // Create assignments using the correct member IDs
                if (assignmentData.length > 0) {
                    console.log(
                        `Attempting to create ${assignmentData.length} assignments`
                    );
                    try {
                        const createdAssignments =
                            await ctx.prisma.shiftAssignment.createMany({
                                data: assignmentData,
                            });
                        console.log('Created assignments:', createdAssignments);
                    } catch (error: any) {
                        console.error('Error creating assignments:', error);

                        // Try creating assignments one by one to identify which one is causing the issue
                        console.log(
                            'Attempting to create assignments one by one...'
                        );
                        for (const assignment of assignmentData) {
                            try {
                                console.log(
                                    `Creating assignment for memberId: ${assignment.memberId}, outcome: ${assignment.outcome}`
                                );
                                const createdAssignment =
                                    await ctx.prisma.shiftAssignment.create({
                                        data: assignment,
                                    });
                                console.log(
                                    'Created assignment:',
                                    createdAssignment
                                );
                            } catch (err) {
                                console.error(
                                    'Error creating assignment:',
                                    assignment,
                                    err
                                );

                                // Try to get more information about the member
                                try {
                                    const memberCheck =
                                        await ctx.prisma.member.findUnique({
                                            where: { id: assignment.memberId },
                                            include: { user: true },
                                        });
                                    console.log(
                                        `Member check result:`,
                                        memberCheck
                                    );
                                } catch (memberError) {
                                    console.error(
                                        `Error checking member:`,
                                        memberError
                                    );
                                }
                            }
                        }
                    }
                } else {
                    console.log('No valid assignments to create');
                }

                // Fetch the updated shift with assignments
                const updatedShift = await ctx.prisma.shift.findUnique({
                    where: { id: shift.id },
                    include: { shiftAssignments: true },
                });

                console.log(
                    'Updated shift with assignments:',
                    JSON.stringify(updatedShift, null, 2)
                );
                return updatedShift;
            }

            // Convert startTime and endTime from UTC to the shift's timezone
            return {
                ...shift,
                startTime: convertUtcToTimezone(
                    shift.startTime,
                    shift.timezone
                ),
                endTime: convertUtcToTimezone(shift.endTime, shift.timezone),
            };
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.string(),
                title: z.string(),
                location: z.string().optional(),
                startTime: z.string(), // ISO8601 date string
                endTime: z.string(), // ISO8601 date string
                slots: z.number(),
                notes: z.string().optional(),
                adminNotes: z.string().optional(),
                timezone: z.string(),
                assignments: z
                    .array(
                        z.object({
                            memberId: z.string(),
                            outcome: z.enum(['assigned', 'waiting', 'refused']),
                            reason: z.string().optional(),
                        })
                    )
                    .optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            console.log('Shift update input:', JSON.stringify(input, null, 2));

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
                        startTime: convertToTimezone(
                            data.startTime,
                            data.timezone
                        ),
                        endTime: convertToTimezone(data.endTime, data.timezone),
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
                    console.log('Updating assignments:', data.assignments);

                    // First delete all existing assignments
                    const deletedAssignments =
                        await ctx.prisma.shiftAssignment.deleteMany({
                            where: {
                                shiftId: id,
                            },
                        });
                    console.log('Deleted assignments:', deletedAssignments);

                    // Log organization info
                    console.log(`Organization ID: ${ctx.user.organizationId}`);
                    try {
                        const organization =
                            await ctx.prisma.organization.findUnique({
                                where: { id: ctx.user.organizationId },
                            });
                        console.log(`Organization details:`, organization);
                    } catch (orgError) {
                        console.error(`Error fetching organization:`, orgError);
                    }

                    // Then create new assignments
                    // Use the member IDs directly from the input
                    console.log(
                        `Using member IDs:`,
                        data.assignments.map((a) => a.memberId)
                    );

                    // Verify that the member IDs exist in the current organization
                    const members = await ctx.prisma.member.findMany({
                        where: {
                            organizationId: ctx.user.organizationId,
                            id: {
                                in: data.assignments.map((a) => a.memberId),
                            },
                        },
                        select: {
                            id: true,
                            userId: true,
                            name: true,
                        },
                    });
                    console.log('Found members:', members);

                    // Create a set of valid member IDs
                    const validMemberIds = new Set(
                        members.map((member) => member.id)
                    );
                    console.log(
                        'Valid member IDs:',
                        Array.from(validMemberIds)
                    );

                    // Check if we have any assignments with missing member IDs
                    const missingMembers = data.assignments.filter(
                        (assignment) => !validMemberIds.has(assignment.memberId)
                    );
                    if (missingMembers.length > 0) {
                        console.log(
                            'Missing member IDs:',
                            missingMembers.map((a) => a.memberId)
                        );
                        console.log(
                            'These member IDs will be skipped as they do not exist in the organization.'
                        );
                    }

                    // Prepare assignment data
                    const assignmentData = data.assignments
                        .filter((assignment) =>
                            validMemberIds.has(assignment.memberId)
                        ) // Only include valid member IDs
                        .map((assignment) => ({
                            shiftId: id,
                            memberId: assignment.memberId,
                            outcome: assignment.outcome,
                            reason: assignment.reason || '',
                        }));
                    console.log('Assignment data to create:', assignmentData);

                    // Create assignments using the correct member IDs
                    if (assignmentData.length > 0) {
                        console.log(
                            `Attempting to create ${assignmentData.length} assignments`
                        );
                        try {
                            const createdAssignments =
                                await ctx.prisma.shiftAssignment.createMany({
                                    data: assignmentData,
                                });
                            console.log(
                                'Created assignments:',
                                createdAssignments
                            );
                        } catch (error: any) {
                            console.error('Error creating assignments:', error);

                            // Try creating assignments one by one to identify which one is causing the issue
                            console.log(
                                'Attempting to create assignments one by one...'
                            );
                            for (const assignment of assignmentData) {
                                try {
                                    console.log(
                                        `Creating assignment for memberId: ${assignment.memberId}, outcome: ${assignment.outcome}`
                                    );
                                    const createdAssignment =
                                        await ctx.prisma.shiftAssignment.create(
                                            {
                                                data: assignment,
                                            }
                                        );
                                    console.log(
                                        'Created assignment:',
                                        createdAssignment
                                    );
                                } catch (err) {
                                    console.error(
                                        'Error creating assignment:',
                                        assignment,
                                        err
                                    );

                                    // Try to get more information about the member
                                    try {
                                        const memberCheck =
                                            await ctx.prisma.member.findUnique({
                                                where: {
                                                    id: assignment.memberId,
                                                },
                                                include: { user: true },
                                            });
                                        console.log(
                                            `Member check result:`,
                                            memberCheck
                                        );
                                    } catch (memberError) {
                                        console.error(
                                            `Error checking member:`,
                                            memberError
                                        );
                                    }
                                }
                            }
                        }
                    } else {
                        console.log('No valid assignments to create');
                    }
                }

                if (!shift) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Shift not found',
                    });
                }

                // If assignments were updated, fetch the updated shift with the new assignments
                if (data.assignments) {
                    const updatedShift = await ctx.prisma.shift.findUnique({
                        where: { id },
                        include: { shiftAssignments: true },
                    });

                    console.log(
                        'Updated shift with assignments:',
                        JSON.stringify(updatedShift, null, 2)
                    );

                    // Format dates for the response
                    const formattedShift = {
                        ...updatedShift,
                        startTime: convertUtcToTimezone(
                            updatedShift!.startTime,
                            updatedShift!.timezone
                        ),
                        endTime: convertUtcToTimezone(
                            updatedShift!.endTime,
                            updatedShift!.timezone
                        ),
                    };

                    console.log(
                        'Formatted shift to return:',
                        JSON.stringify(formattedShift, null, 2)
                    );
                    return formattedShift;
                }

                // Convert startTime and endTime from UTC to the shift's timezone
                return {
                    ...shift,
                    startTime: convertUtcToTimezone(
                        shift.startTime,
                        shift.timezone
                    ),
                    endTime: convertUtcToTimezone(
                        shift.endTime,
                        shift.timezone
                    ),
                };
            } catch (error: any) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to update shift: ${error.message}`,
                });
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
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Shift not found',
                    });
                }

                return { success: true, message: 'Shift deleted successfully' };
            } catch (error: any) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to delete shift: ${error.message}`,
                });
            }
        }),
});

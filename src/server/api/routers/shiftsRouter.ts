import { z } from 'zod';
import { router, adminProcedure, memberProcedure } from '@/server/trpc';
import { Prisma } from '@/generated/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { TRPCError } from '@trpc/server';

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
                    where.date = {};
                    if (input.startDate)
                        where.date.gte = parseDateString(input.startDate);
                    if (input.endDate)
                        where.date.lte = parseDateString(input.endDate);
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
                orderBy: { date: 'asc' },
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

            // Format dates as YYYY-MM-DD strings for the response
            return filteredShifts.map((shift) => ({
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

                    // Format dates as YYYY-MM-DD strings for the response
                    const formattedShift = {
                        ...updatedShift,
                        date: formatDateString(
                            updatedShift!.date.toISOString()
                        ),
                        startTime: formatDateString(
                            updatedShift!.startTime.toISOString()
                        ),
                        endTime: formatDateString(
                            updatedShift!.endTime.toISOString()
                        ),
                    };

                    console.log(
                        'Formatted shift to return:',
                        JSON.stringify(formattedShift, null, 2)
                    );
                    return formattedShift;
                }

                // Format dates as YYYY-MM-DD strings for the response
                return {
                    ...shift,
                    date: formatDateString(shift.date.toISOString()),
                    startTime: formatDateString(shift.startTime.toISOString()),
                    endTime: formatDateString(shift.endTime.toISOString()),
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

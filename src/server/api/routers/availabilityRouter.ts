import { z } from 'zod';
import {
    router,
    adminProcedure,
    memberProcedure,
    userProcedure,
} from '@/server/trpc';
import { Prisma, User } from '@/generated/prisma';
import { TRPCError } from '@trpc/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export const availabilityRouter = router({
    list: memberProcedure
        .input(
            z
                .object({
                    startDate: z.string().optional(),
                    endDate: z.string().optional(),
                    isAvailable: z.boolean().optional(),
                    memberId: z.string().optional(),
                })
                .optional()
        )
        .query(async ({ ctx, input }) => {
            // Build filter conditions
            const where: Prisma.AvailabilityWhereInput = {
                member: {
                    organizationId: ctx.user.organizationId,
                },
            };

            // For non-admin users, only show their own availability
            const isAdmin =
                ctx.user.role === 'admin' || ctx.user.role === 'owner';
            if (!isAdmin) {
                // Ensure we have the user's memberId
                if (!ctx.user.memberId) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'User memberId is required',
                    });
                }
                where.memberId = ctx.user.memberId;
            } else if (input?.memberId) {
                // For admins, filter by memberId if provided
                where.memberId = input.memberId;
            }

            if (input) {
                if (input.startDate || input.endDate) {
                    where.startDate = {};
                    where.endDate = {};

                    if (input.startDate)
                        where.startDate.gte = new Date(input.startDate);
                    if (input.endDate)
                        where.endDate.lte = new Date(input.endDate);
                }

                if (input.isAvailable !== undefined) {
                    where.isAvailable = input.isAvailable;
                }
            }

            const availabilities = await ctx.prisma.availability.findMany({
                where,
                include: {
                    member: {
                        include: {
                            settings: true,
                        },
                    },
                },
                orderBy: {
                    startDate: 'asc',
                },
            });

            // Return the availabilities with ISO string dates for date fields
            // startTime and endTime are already 4-digit integers
            return availabilities.map((availability) => ({
                ...availability,
                //startDate: availability.startDate.toISOString(),
                //endDate: availability.endDate.toISOString(),
            }));
        }),

    byDate: memberProcedure
        .input(
            z.object({
                date: z.date(), // Expected in YYYY-MM-DD format
            })
        )
        .query(async ({ ctx, input }) => {
            const targetDate = dayjs.utc(input.date);
            if (!targetDate.isValid()) {
                throw new Error('Invalid date format. Use YYYY-MM-DD.');
            }

            // Create start and end of day in UTC
            const startOfDay = targetDate.startOf('day').toDate();
            const endOfDay = targetDate.endOf('day').toDate();

            // Query starting from member and left-joining availability
            const members = await ctx.prisma.member.findMany({
                where: {
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    user: true,
                    availabilities: {
                        where: {
                            startDate: { lte: endOfDay },
                            endDate: { gte: startOfDay },
                        },
                    },
                },
            });

            // Map members to their availability status
            return members.map((member) => {
                const hasCoverage = member.availabilities.length > 0;

                return {
                    ...member.user, // Include user details
                    id: member.id,
                    role: member.role,
                    isAvailable: hasCoverage
                        ? member.availabilities.every(
                              (availability) => availability.isAvailable
                          )
                        : member.isAvailableByDefault, // Default availability if no coverage
                };
            });
        }),

    byId: memberProcedure
        .input(
            z.object({
                id: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const availability = await ctx.prisma.availability.findFirst({
                where: {
                    id: input.id,
                    member: {
                        organizationId: ctx.user.organizationId,
                    },
                },
                include: {
                    member: {
                        include: {
                            settings: true,
                        },
                    },
                },
            });

            if (!availability) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Availability not found',
                });
            }

            // Return the availability with ISO string dates for date fields
            // startTime and endTime are already 4-digit integers
            return {
                ...availability,
                startDate: availability.startDate.toISOString(),
                endDate: availability.endDate.toISOString(),
            };
        }),

    create: userProcedure
        .input(
            z.object({
                startDate: z.date(),
                endDate: z.date(),
                startTime: z.number().optional(),
                endTime: z.number().optional(),
                desc: z.string(),
                isAvailable: z.boolean(),
                memberId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if the user is creating availability for themselves
            if (
                !ctx.isMemberData(input.memberId) &&
                ctx.user.role !== 'admin' &&
                ctx.user.role !== 'owner'
            ) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You can only create availability for yourself',
                });
            }

            // Verify that the member belongs to the user's organization
            const member = await ctx.prisma.member.findFirst({
                where: {
                    id: input.memberId,
                    organizationId: ctx.user.organizationId,
                },
                include: {
                    settings: true,
                },
            });

            if (!member) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Member not found in your organization',
                });
            }

            // Use the provided startDate and endDate - ensure UTC with 00:00:00.000 time
            const startDate = dayjs
                .utc(input.startDate)
                .startOf('day')
                .toDate();
            const endDate = dayjs.utc(input.endDate).startOf('day').toDate();

            // Use the provided startTime and endTime or default values
            const startTime = input.startTime ?? 0; // Default to 00:00 (midnight)
            const endTime = input.endTime ?? 2359; // Default to 23:59

            const availability = await ctx.prisma.availability.create({
                data: {
                    startDate,
                    endDate,
                    startTime,
                    endTime,
                    desc: input.desc,
                    isAvailable: input.isAvailable,
                    memberId: input.memberId,
                },
            });

            // Return the availability with ISO string dates
            return {
                ...availability,
                startDate: availability.startDate.toISOString(),
                endDate: availability.endDate.toISOString(),
            };
        }),

    update: userProcedure
        .input(
            z.object({
                id: z.string(),
                startDate: z.date().optional(),
                endDate: z.date().optional(),
                startTime: z.number().optional(),
                endTime: z.number().optional(),
                desc: z.string().optional(),
                isAvailable: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input;

            // Check if the availability record belongs to the user and their organization
            const existingAvailability =
                await ctx.prisma.availability.findFirst({
                    where: {
                        id,
                        member: {
                            organizationId: ctx.user.organizationId,
                        },
                    },
                    select: {
                        memberId: true,
                        member: {
                            select: {
                                organizationId: true,
                                settings: true,
                            },
                        },
                    },
                });

            if (!existingAvailability) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Availability record not found',
                });
            }

            // Check if the user is updating their own availability
            if (
                !ctx.isMemberData(existingAvailability.memberId) &&
                ctx.user.role !== 'admin' &&
                ctx.user.role !== 'owner'
            ) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You can only update your own availability',
                });
            }

            // Prepare update data
            const updatePayload: any = { ...updateData };

            // Process startDate if provided - ensure UTC with 00:00:00.000 time
            if (updateData.startDate) {
                updatePayload.startDate = dayjs
                    .utc(updateData.startDate)
                    .startOf('day')
                    .toDate();
            }

            // Process endDate if provided - ensure UTC with 00:00:00.000 time
            if (updateData.endDate) {
                updatePayload.endDate = dayjs
                    .utc(updateData.endDate)
                    .startOf('day')
                    .toDate();
            }

            // Process startTime and endTime as is (they're already 4-digit integers)
            // No need for additional processing

            const availability = await ctx.prisma.availability.update({
                where: { id },
                data: updatePayload,
            });

            // Return the availability with ISO string dates
            return {
                ...availability,
                startDate: availability.startDate.toISOString(),
                endDate: availability.endDate.toISOString(),
            };
        }),

    delete: userProcedure
        .input(
            z.object({
                id: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if the availability record belongs to the user and their organization
            const existingAvailability =
                await ctx.prisma.availability.findFirst({
                    where: {
                        id: input.id,
                        member: {
                            organizationId: ctx.user.organizationId,
                        },
                    },
                    select: {
                        memberId: true,
                        member: {
                            select: {
                                organizationId: true,
                            },
                        },
                    },
                });

            if (!existingAvailability) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Availability record not found',
                });
            }

            // Check if the user is deleting their own availability
            if (
                !ctx.isMemberData(existingAvailability.memberId) &&
                ctx.user.role !== 'admin' &&
                ctx.user.role !== 'owner'
            ) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You can only delete your own availability',
                });
            }

            // Use the same id but ensure we're only deleting from the user's organization
            // This is redundant with our check above, but provides an extra layer of security
            await ctx.prisma.availability.delete({
                where: {
                    id: input.id,
                },
            });

            return {
                success: true,
                message: 'Availability deleted successfully',
            };
        }),
});

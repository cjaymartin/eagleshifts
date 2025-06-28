import { z } from 'zod';
import { router, adminProcedure } from '@/server/trpc';
import { Prisma, User } from '@/generated/prisma';
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
    return dayjs.utc(`${formatDateString(dateString)}T00:00:00Z`).toDate();
}

export const availabilityRouter = router({
    list: adminProcedure
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
            const where: Prisma.AvailabilityWhereInput = {};

            if (input) {
                if (input.startDate || input.endDate) {
                    where.startDate = {};
                    where.endDate = {};

                    if (input.startDate)
                        where.startDate.gte = parseDateString(input.startDate);
                    if (input.endDate)
                        where.endDate.lte = parseDateString(input.endDate);
                }

                if (input.isAvailable !== undefined) {
                    where.isAvailable = input.isAvailable;
                }

                if (input.memberId) {
                    where.memberId = input.memberId;
                }
            }

            const availabilities = await ctx.prisma.availability.findMany({
                where,
                include: {
                    member: true,
                },
                orderBy: {
                    startDate: 'asc',
                },
            });

            // Format dates as YYYY-MM-DD strings for the response
            return availabilities.map((availability) => ({
                ...availability,
                startDate: formatDateString(
                    availability.startDate.toISOString()
                ),
                endDate: formatDateString(availability.endDate.toISOString()),
            }));
        }),

    byDate: adminProcedure
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

            // Query starting from member and left-joining availability
            const members = await ctx.prisma.member.findMany({
                include: {
                    user: true,
                    availabilities: {
                        where: {
                            startDate: { lte: targetDate.toDate() },
                            endDate: { gte: targetDate.toDate() },
                        },
                    },
                },
            });

            // Map members to their availability status
            return members.map((member) => {
                const hasCoverage = member.availabilities.length > 0;

                return {
                    ...member.user, // Include user details
                    role: member.role,
                    isAvailable: hasCoverage
                        ? member.availabilities.every(
                              (availability) => availability.isAvailable
                          )
                        : member.isAvailableByDefault, // Default availability if no coverage
                };
            });
        }),

    byId: adminProcedure
        .input(
            z.object({
                id: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const availability = await ctx.prisma.availability.findUnique({
                where: { id: input.id },
                include: {
                    member: true,
                },
            });

            if (!availability) {
                throw new Error('Availability not found');
            }

            // Format dates as YYYY-MM-DD strings for the response
            return {
                ...availability,
                startDate: formatDateString(
                    availability.startDate.toISOString()
                ),
                endDate: formatDateString(availability.endDate.toISOString()),
            };
        }),

    create: adminProcedure
        .input(
            z.object({
                startDate: z.string(),
                endDate: z.string(),
                desc: z.string(),
                isAvailable: z.boolean(),
                memberId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const availability = await ctx.prisma.availability.create({
                data: {
                    startDate: parseDateString(input.startDate),
                    endDate: parseDateString(input.endDate),
                    desc: input.desc,
                    isAvailable: input.isAvailable,
                    memberId: input.memberId,
                },
            });

            // Format dates as YYYY-MM-DD strings for the response
            return {
                ...availability,
                startDate: formatDateString(
                    availability.startDate.toISOString()
                ),
                endDate: formatDateString(availability.endDate.toISOString()),
            };
        }),

    update: adminProcedure
        .input(
            z.object({
                id: z.string(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
                desc: z.string().optional(),
                isAvailable: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input;

            const availability = await ctx.prisma.availability.update({
                where: { id },
                data: {
                    ...updateData,
                    startDate: updateData.startDate
                        ? parseDateString(updateData.startDate)
                        : undefined,
                    endDate: updateData.endDate
                        ? parseDateString(updateData.endDate)
                        : undefined,
                },
            });

            // Format dates as YYYY-MM-DD strings for the response
            return {
                ...availability,
                startDate: formatDateString(
                    availability.startDate.toISOString()
                ),
                endDate: formatDateString(availability.endDate.toISOString()),
            };
        }),

    delete: adminProcedure
        .input(
            z.object({
                id: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            await ctx.prisma.availability.delete({
                where: { id: input.id },
            });

            return {
                success: true,
                message: 'Availability deleted successfully',
            };
        }),
});

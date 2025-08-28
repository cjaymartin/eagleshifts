import { z } from 'zod';
import { router, memberProcedure } from '@/server/trpc';
import { Prisma } from '@/generated/prisma';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { TRPCError } from '@trpc/server';

dayjs.extend(utc);
dayjs.extend(timezone);

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

    return adjustedUtcDateTime.toDate();
}

// Helper function to extract date from ISO string
function extractDateFromIso(
    isoString: string,
    timezone: string = 'America/New_York'
): Date {
    return dayjs.tz(isoString, timezone).startOf('day').toDate();
}

export const shiftDraftRouter = router({
    // Get all drafts for the current member
    list: memberProcedure.query(async ({ ctx }) => {
        const drafts = await ctx.prisma.shiftDraft.findMany({
            where: {
                organizationId: ctx.user.organizationId,
                memberId: ctx.user.memberId,
            },
            include: {
                location: true,
                department: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        return drafts.map((draft) => ({
            ...draft,
            // Keep the date as is
            // Only convert startTime and endTime if they exist
            startTime: draft.startTime ? draft.startTime : null,
            endTime: draft.endTime ? draft.endTime : null,
        }));
    }),

    // Get a specific draft by ID
    byId: memberProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const draft = await ctx.prisma.shiftDraft.findUnique({
                where: {
                    id: input.id,
                },
                include: {
                    location: true,
                    department: true,
                },
            });

            if (!draft) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Draft not found',
                });
            }

            // Check if the draft belongs to the current member
            if (draft.memberId !== ctx.user.memberId) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to view this draft',
                });
            }

            return {
                ...draft,
                // Keep the date as is
                // Only convert startTime and endTime if they exist
                startTime: draft.startTime ? draft.startTime : null,
                endTime: draft.endTime ? draft.endTime : null,
            };
        }),

    // Create a new draft
    create: memberProcedure
        .input(
            z.object({
                title: z.string(),
                locationId: z.string().optional(),
                legacyLocation: z.string().optional(),
                departmentId: z.string().optional(),
                date: z.string(), // ISO8601 date string
                startTime: z.string().nullable().optional(), // Optional time string
                endTime: z.string().nullable().optional(), // Optional time string
                slots: z.number(),
                notes: z.string().optional(),
                adminNotes: z.string().optional(),
                timezone: z.string().optional().default('America/New_York'),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const draft = await ctx.prisma.shiftDraft.create({
                data: {
                    organizationId: ctx.user.organizationId,
                    memberId: ctx.user.memberId,
                    title: input.title,
                    locationId: input.locationId,
                    legacyLocation: input.locationId
                        ? undefined
                        : input.legacyLocation,
                    departmentId: input.departmentId,
                    date: extractDateFromIso(input.date, input.timezone),
                    startTime: input.startTime 
                        ? convertToTimezone(input.startTime, input.timezone)
                        : null,
                    endTime: input.endTime
                        ? convertToTimezone(input.endTime, input.timezone)
                        : null,
                    slots: input.slots,
                    notes: input.notes,
                    adminNotes: input.adminNotes,
                    timezone: input.timezone,
                },
                include: {
                    location: true,
                    department: true,
                },
            });

            return {
                ...draft,
                // Keep the date as is
                // Only convert startTime and endTime if they exist
                startTime: draft.startTime ? draft.startTime : null,
                endTime: draft.endTime ? draft.endTime : null,
            };
        }),

    // Update an existing draft
    update: memberProcedure
        .input(
            z.object({
                id: z.string(),
                title: z.string(),
                locationId: z.string().optional(),
                legacyLocation: z.string().optional(),
                departmentId: z.string().optional(),
                date: z.string(), // ISO8601 date string
                startTime: z.string().nullable().optional(), // Optional time string
                endTime: z.string().nullable().optional(), // Optional time string
                slots: z.number(),
                notes: z.string().optional(),
                adminNotes: z.string().optional(),
                timezone: z.string().optional().default('America/New_York'),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if the draft exists and belongs to the current member
            const existingDraft = await ctx.prisma.shiftDraft.findUnique({
                where: {
                    id: input.id,
                },
            });

            if (!existingDraft) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Draft not found',
                });
            }

            if (existingDraft.memberId !== ctx.user.memberId) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to update this draft',
                });
            }

            const draft = await ctx.prisma.shiftDraft.update({
                where: {
                    id: input.id,
                },
                data: {
                    title: input.title,
                    locationId: input.locationId,
                    legacyLocation: input.locationId
                        ? undefined
                        : input.legacyLocation,
                    departmentId: input.departmentId,
                    date: extractDateFromIso(input.date, input.timezone),
                    startTime: input.startTime 
                        ? convertToTimezone(input.startTime, input.timezone)
                        : null,
                    endTime: input.endTime
                        ? convertToTimezone(input.endTime, input.timezone)
                        : null,
                    slots: input.slots,
                    notes: input.notes,
                    adminNotes: input.adminNotes,
                    timezone: input.timezone,
                },
                include: {
                    location: true,
                    department: true,
                },
            });

            return {
                ...draft,
                // Keep the date as is
                // Only convert startTime and endTime if they exist
                startTime: draft.startTime ? draft.startTime : null,
                endTime: draft.endTime ? draft.endTime : null,
            };
        }),

    // Delete a draft
    delete: memberProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Check if the draft exists and belongs to the current member
            const existingDraft = await ctx.prisma.shiftDraft.findUnique({
                where: {
                    id: input.id,
                },
            });

            if (!existingDraft) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Draft not found',
                });
            }

            if (existingDraft.memberId !== ctx.user.memberId) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to delete this draft',
                });
            }

            await ctx.prisma.shiftDraft.delete({
                where: {
                    id: input.id,
                },
            });

            return { success: true };
        }),
});

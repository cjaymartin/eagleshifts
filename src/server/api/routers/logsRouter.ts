import { z } from 'zod';
import { router, adminProcedure, memberProcedure } from '@/server/trpc';
import { Prisma } from '@/generated/prisma';
import { LogActionType, createLog } from '@/lib/logging';
import { TRPCError } from '@trpc/server';

export const logsRouter = router({
    // Get logs with filtering and pagination
    getLogs: adminProcedure
        .input(
            z
                .object({
                    actionType: z.string().optional(),
                    userId: z.string().optional(),
                    entityId: z.string().optional(),
                    startDate: z.string().optional(),
                    endDate: z.string().optional(),
                    page: z.number().default(1),
                    limit: z.number().default(25),
                    sortBy: z.string().default('timestamp'),
                    sortDirection: z.enum(['asc', 'desc']).default('desc'),
                })
                .optional()
        )
        .query(async ({ ctx, input }) => {
            // Default values if input is not provided
            const {
                actionType,
                userId,
                entityId,
                startDate,
                endDate,
                page = 1,
                limit = 25,
                sortBy = 'timestamp',
                sortDirection = 'desc',
            } = input || {};

            // Build filter conditions
            const where: any = {
                organizationId: ctx.user.organizationId,
            };

            // Apply filters if provided
            if (actionType) {
                where.actionType = actionType;
            }

            if (userId) {
                where.userId = userId;
            }

            if (entityId) {
                where.entityId = entityId;
            }

            if (startDate || endDate) {
                where.timestamp = {};

                if (startDate) {
                    where.timestamp.gte = new Date(startDate);
                }

                if (endDate) {
                    where.timestamp.lte = new Date(endDate);
                }
            }

            // Calculate pagination
            const skip = (page - 1) * limit;

            // Get total count for pagination
            const totalCount = await ctx.prisma.logEntry.count({ where });

            // Get logs with pagination and sorting
            const logs = await ctx.prisma.logEntry.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                        },
                    },
                },
                orderBy: {
                    [sortBy]: sortDirection,
                },
                skip,
                take: limit,
            });

            // Calculate pagination metadata
            const totalPages = Math.ceil(totalCount / limit);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1;

            return {
                logs,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages,
                    hasNextPage,
                    hasPreviousPage,
                },
            };
        }),

    // Create a new log entry (internal use only)
    createLog: memberProcedure
        .input(
            z.object({
                actionType: z.string(),
                entityId: z.string().optional(),
                entityType: z.string().optional(),
                description: z.string(),
                metadata: z.record(z.any(), z.any()).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { actionType, entityId, entityType, description, metadata } =
                input;

            try {
                const log = await createLog({
                    prisma: ctx.prisma,
                    organizationId: ctx.user.organizationId,
                    userId: ctx.user.id,
                    actionType: actionType as LogActionType,
                    entityId,
                    entityType: entityType as any,
                    description,
                    metadata,
                });

                return log;
            } catch (error: any) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to create log entry: ${error.message}`,
                });
            }
        }),

    // Get available log action types for filtering
    getLogTypes: adminProcedure.query(async () => {
        // Return all available log action types
        return Object.values(LogActionType);
    }),

    // Delete logs older than the specified retention period
    deleteOldLogs: adminProcedure
        .input(
            z.object({
                retentionDays: z.number().default(90),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { retentionDays } = input;

            // Calculate the cutoff date based on retention period
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            try {
                // Delete logs older than the cutoff date
                const result = await ctx.prisma.logEntry.deleteMany({
                    where: {
                        organizationId: ctx.user.organizationId,
                        timestamp: {
                            lt: cutoffDate,
                        },
                    },
                });

                return {
                    success: true,
                    message: `${result.count} old logs deleted successfully`,
                    count: result.count,
                };
            } catch (error: any) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to delete old logs: ${error.message}`,
                });
            }
        }),
});

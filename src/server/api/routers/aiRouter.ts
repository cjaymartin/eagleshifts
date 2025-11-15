import { z } from 'zod';
import { router, adminProcedure, memberProcedure, superadminProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import { isAIFeatureAvailable, isOpenAIConfigured, trackAIUsage, getAIUsageStats } from '@/utils/aiUtils';
import { parseShiftText } from '@/utils/aiShiftParser';
import { createShiftFromAI } from '@/utils/aiShiftCreationService';
import { logAIApiFailure } from '@/lib/logging';

export const aiRouter = router({
  // Get organization's daily AI usage statistics
  getOrganizationDailyUsage: superadminProcedure
    .input(
      z.object({
        organizationId: z.string(),
        days: z.number().min(1).max(30).default(7), // Number of days to look back
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { organizationId, days } = input;

        // Get the organization
        const organization = await ctx.prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true, aiDailyLimit: true },
        });

        if (!organization) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Organization not found',
          });
        }

        // Calculate the start date (n days ago)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        // Get usage logs grouped by day
        const dailyUsage = await ctx.prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('day', timestamp) as day,
            COUNT(*) as requests,
            SUM(CASE WHEN "responseStatus" = 'success' THEN 1 ELSE 0 END) as successful_requests,
            SUM("tokensUsed") as tokens_used
          FROM "ai_usage_log"
          WHERE "organizationId" = ${organizationId}
            AND timestamp >= ${startDate}
          GROUP BY DATE_TRUNC('day', timestamp)
          ORDER BY day DESC
        `;

        // Get feature breakdown
        const featureBreakdown = await ctx.prisma.aIUsageLog.groupBy({
          by: ['feature'],
          where: {
            organizationId,
            timestamp: {
              gte: startDate,
            },
          },
          _count: {
            id: true,
          },
          _sum: {
            tokensUsed: true,
          },
        });

        // Get user breakdown
        const userBreakdown = await ctx.prisma.aIUsageLog.groupBy({
          by: ['userId'],
          where: {
            organizationId,
            timestamp: {
              gte: startDate,
            },
          },
          _count: {
            id: true,
          },
          _sum: {
            tokensUsed: true,
          },
        });

        // Get user details
        const userIds = userBreakdown.map(item => item.userId);
        const users = await ctx.prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });

        // Map user names to the breakdown
        const userBreakdownWithNames = userBreakdown.map(item => {
          const user = users.find(u => u.id === item.userId);
          return {
            ...item,
            userName: user?.name || 'Unknown',
            userEmail: user?.email || 'Unknown',
          };
        });

        return {
          organization: {
            id: organizationId,
            name: organization.name,
            aiDailyLimit: organization.aiDailyLimit,
          },
          dailyUsage,
          featureBreakdown,
          userBreakdown: userBreakdownWithNames,
          totalRequests: dailyUsage.reduce((sum: number, day: any) => sum + Number(day.requests), 0),
          totalTokensUsed: dailyUsage.reduce((sum: number, day: any) => sum + Number(day.tokens_used), 0),
          averageDailyRequests: dailyUsage.length > 0 
            ? dailyUsage.reduce((sum: number, day: any) => sum + Number(day.requests), 0) / dailyUsage.length 
            : 0,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get organization daily usage: ${error.message}`,
        });
      }
    }),

  // Get AI usage reports for superadmins
  getUsageReports: superadminProcedure
    .input(
      z.object({
        startDate: z.string(), // ISO string date
        endDate: z.string(), // ISO string date
        organizationId: z.string().optional(), // If provided, filter by organization
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { startDate, endDate, organizationId } = input;

        // Parse dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid date format',
          });
        }

        // Set end date to end of day
        end.setHours(23, 59, 59, 999);

        // Build the query
        const whereClause: any = {
          timestamp: {
            gte: start,
            lte: end,
          },
        };

        // Add organization filter if provided
        if (organizationId) {
          whereClause.organizationId = organizationId;
        }

        // Get usage logs
        const usageLogs = await ctx.prisma.aIUsageLog.findMany({
          where: whereClause,
          include: {
            organization: {
              select: {
                name: true,
                aiDailyLimit: true,
              },
            },
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
        });

        // Get summary statistics
        const summary = await ctx.prisma.aIUsageLog.groupBy({
          by: ['organizationId', 'feature'],
          where: whereClause,
          _count: {
            id: true,
          },
          _sum: {
            tokensUsed: true,
          },
        });

        // Get organization details for the summary
        const organizationIds = [...new Set(summary.map(item => item.organizationId))];
        const organizations = await ctx.prisma.organization.findMany({
          where: {
            id: {
              in: organizationIds,
            },
          },
          select: {
            id: true,
            name: true,
            aiDailyLimit: true,
          },
        });

        // Map organization names to the summary
        const summaryWithNames = summary.map(item => {
          const org = organizations.find(o => o.id === item.organizationId);
          return {
            ...item,
            organizationName: org?.name || 'Unknown',
            aiDailyLimit: org?.aiDailyLimit || 0,
          };
        });

        return {
          logs: usageLogs,
          summary: summaryWithNames,
          totalRequests: usageLogs.length,
          totalTokensUsed: usageLogs.reduce((sum, log) => sum + log.tokensUsed, 0),
          successRate: usageLogs.length > 0 
            ? (usageLogs.filter(log => log.responseStatus === 'success').length / usageLogs.length) * 100 
            : 0,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get AI usage reports: ${error.message}`,
        });
      }
    }),
  // Create a shift from AI-parsed data
  createShiftFromAI: adminProcedure
    .input(
      z.object({
        title: z.string(),
        startTime: z.string().nullable(),
        endTime: z.string().nullable(),
        date: z.string(),
        locationId: z.string().optional(),
        departmentId: z.string().optional(),
        notes: z.string().optional(),
        slots: z.number().optional(),
        timezone: z.string().optional(),
        newLocation: z.object({
          name: z.string(),
          address: z.string().optional(),
        }).optional(),
        newDepartment: z.object({
          name: z.string(),
        }).optional(),
        assignees: z.array(z.string()).optional(),
        entityMatches: z.any().optional(), // AllEntityMatchingResults type
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if the AI feature is available
        const { available, reason } = await isAIFeatureAvailable(
          ctx.prisma,
          ctx.user.organizationId,
          ctx.user.role
        );

        if (!available) {
          // Log the failure
          await logAIApiFailure(
            ctx.prisma,
            ctx.user.organizationId,
            ctx.user.id,
            'shift_creation',
            `AI feature is not available: ${reason}`,
            JSON.stringify(input),
            { inputData: input }
          );

          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `AI feature is not available: ${reason}`,
          });
        }

        // Create the shift
        const shift = await createShiftFromAI(
          {
            ...input,
            organizationId: ctx.user.organizationId,
          },
          ctx.prisma,
          ctx.user.id
        );

        // Track AI usage - using a fixed token count for shift creation
        await trackAIUsage(
          ctx.prisma,
          ctx.user.organizationId,
          ctx.user.id,
          'shift_creation',
          10, // Fixed token count for tracking purposes
          { shiftId: shift.id }
        );

        return shift;
      } catch (error: any) {
        // Log the failure if it's not already logged (i.e., not a FORBIDDEN error)
        if (!(error instanceof TRPCError && error.code === 'FORBIDDEN')) {
          await logAIApiFailure(
            ctx.prisma,
            ctx.user.organizationId,
            ctx.user.id,
            'shift_creation',
            error.message,
            JSON.stringify(input),
            { inputData: input }
          );
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create shift from AI data: ${error.message}`,
        });
      }
    }),

  // Parse shift text using AI
  parseShiftText: adminProcedure
    .input(
      z.object({
        text: z.string().min(1),
        date: z.string().optional(), // ISO string date
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if the AI feature is available
        const { available, reason } = await isAIFeatureAvailable(
          ctx.prisma,
          ctx.user.organizationId,
          ctx.user.role
        );

        if (!available) {
          // Log the failure
          await logAIApiFailure(
            ctx.prisma,
            ctx.user.organizationId,
            ctx.user.id,
            'shift_text_parsing',
            `AI feature is not available: ${reason}`,
            input.text,
            { textLength: input.text.length }
          );

          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `AI feature is not available: ${reason}`,
          });
        }

        // Parse the shift text
        const result = await parseShiftText(
          input.text,
          input.date,
          ctx.user.organizationId,
          ctx.prisma
        );

        // Track AI usage
        await trackAIUsage(
          ctx.prisma,
          ctx.user.organizationId,
          ctx.user.id,
          'shift_text_parsing',
          result.tokensUsed || 0,
          { textLength: input.text.length }
        );

        return result.parsedShift;
      } catch (error: any) {
        // Log the failure if it's not already logged (i.e., not a FORBIDDEN error)
        if (!(error instanceof TRPCError && error.code === 'FORBIDDEN')) {
          await logAIApiFailure(
            ctx.prisma,
            ctx.user.organizationId,
            ctx.user.id,
            'shift_text_parsing',
            error.message,
            input.text,
            { textLength: input.text.length }
          );
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to parse shift text: ${error.message}`,
        });
      }
    }),

  // Check if the AI feature is available for the current user and organization
  isAvailable: memberProcedure.query(async ({ ctx }) => {
    try {
      const result = await isAIFeatureAvailable(
        ctx.prisma,
        ctx.user.organizationId,
        ctx.user.role
      );

      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to check AI feature availability: ${error.message}`,
      });
    }
  }),

  // Get the organization's AI configuration
  getConfig: adminProcedure.query(async ({ ctx }) => {
    try {
      const organization = await ctx.prisma.organization.findUnique({
        where: { id: ctx.user.organizationId },
        select: { aiEnabled: true, aiDailyLimit: true },
      });

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      // Get today's usage stats using the new function
      const { currentUsage, dailyLimit } = await getAIUsageStats(
        ctx.prisma,
        ctx.user.organizationId
      );

      return {
        aiEnabled: organization.aiEnabled,
        aiDailyLimit: dailyLimit,
        currentUsage,
        isOpenAIConfigured: isOpenAIConfigured(),
        remainingUsage: Math.max(0, dailyLimit - currentUsage),
      };
    } catch (error: any) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to get AI configuration: ${error.message}`,
      });
    }
  }),

  // Update the organization's AI configuration
  updateConfig: adminProcedure
    .input(
      z.object({
        aiEnabled: z.boolean().optional(),
        aiDailyLimit: z.number().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { aiEnabled, aiDailyLimit } = input;

        const updatedOrganization = await ctx.prisma.organization.update({
          where: { id: ctx.user.organizationId },
          data: { 
            ...(aiEnabled !== undefined && { aiEnabled }),
            aiDailyLimit 
          },
          select: { 
            aiEnabled: true,
            aiDailyLimit: true 
          },
        });

        return updatedOrganization;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update AI configuration: ${error.message}`,
        });
      }
    }),

  // Track AI API usage
  trackUsage: adminProcedure
    .input(
      z.object({
        feature: z.string(),
        tokensUsed: z.number().min(1),
        metadata: z.record(z.any(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { feature, tokensUsed, metadata } = input;

        // Check if the feature is available before tracking usage
        const { available, reason } = await isAIFeatureAvailable(
          ctx.prisma,
          ctx.user.organizationId,
          ctx.user.role
        );

        if (!available) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `AI feature is not available: ${reason}`,
          });
        }

        const result = await trackAIUsage(
          ctx.prisma,
          ctx.user.organizationId,
          ctx.user.id,
          feature,
          tokensUsed,
          metadata
        );

        return { success: !!result };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to track AI usage: ${error.message}`,
        });
      }
    }),
});

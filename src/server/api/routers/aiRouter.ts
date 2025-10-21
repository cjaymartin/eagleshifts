import { z } from 'zod';
import { router, adminProcedure, memberProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import { isAIFeatureAvailable, isOpenAIConfigured, trackAIUsage } from '@/utils/aiUtils';
import { parseShiftText } from '@/utils/aiShiftParser';

export const aiRouter = router({
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

      // Get today's usage count
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const usageCount = await ctx.prisma.logEntry.count({
        where: {
          organizationId: ctx.user.organizationId,
          actionType: 'AI_API_USAGE',
          timestamp: {
            gte: today,
          },
        },
      });

      return {
        aiEnabled: organization.aiEnabled,
        aiDailyLimit: organization.aiDailyLimit,
        currentUsage: usageCount,
        isOpenAIConfigured: isOpenAIConfigured(),
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

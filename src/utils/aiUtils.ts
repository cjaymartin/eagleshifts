import { PrismaClient } from '@/generated/prisma';
import { logAIApiUsage } from '@/lib/logging';

/**
 * Checks if the OpenAI API key is configured
 * @returns boolean indicating if the OpenAI API key is configured
 */
export function isOpenAIConfigured(): boolean {
    const apiKey = process.env.OPENAI_API_KEY;
    return !!apiKey && apiKey.length > 0 && apiKey !== 'your_openai_api_key';
}

/**
 * Checks if a user has admin privileges
 * @param role The user's role
 * @returns boolean indicating if the user has admin privileges
 */
export function isUserAdmin(role?: string): boolean {
    return ['admin', 'owner'].includes(role || '');
}

/**
 * Checks if an organization has reached its daily AI API usage limit
 * @param prisma Prisma client instance
 * @param organizationId The organization ID
 * @param organization Optional organization object with aiDailyLimit
 * @returns boolean indicating if the organization has reached its daily limit
 */
export async function hasReachedDailyLimit(
    prisma: PrismaClient,
    organizationId: string,
    organization?: { aiDailyLimit: number }
): Promise<boolean> {
    // Get the organization's daily limit if not provided
    if (!organization) {
        const org = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { aiDailyLimit: true },
        });

        if (!org) {
            return true; // If organization not found, consider limit reached
        }
        organization = org; // Now we know org is not null
    }

    // Count today's API usage from the dedicated AIUsageLog table
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usageCount = await prisma.aIUsageLog.count({
        where: {
            organizationId,
            timestamp: {
                gte: today,
            },
        },
    });

    // If no records in AIUsageLog, fall back to the legacy LogEntry table
    if (usageCount === 0) {
        const legacyUsageCount = await prisma.logEntry.count({
            where: {
                organizationId,
                actionType: 'AI_API_USAGE',
                timestamp: {
                    gte: today,
                },
            },
        });

        return legacyUsageCount >= organization.aiDailyLimit;
    }

    return usageCount >= organization.aiDailyLimit;
}

/**
 * Gets the current AI usage for an organization
 * @param prisma Prisma client instance
 * @param organizationId The organization ID
 * @returns Object with current usage count and daily limit
 */
export async function getAIUsageStats(
    prisma: PrismaClient,
    organizationId: string
): Promise<{ currentUsage: number; dailyLimit: number }> {
    // Get the organization's daily limit
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { aiDailyLimit: true },
    });

    if (!organization) {
        return { currentUsage: 0, dailyLimit: 0 };
    }

    // Count today's API usage from the dedicated AIUsageLog table
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usageCount = await prisma.aIUsageLog.count({
        where: {
            organizationId,
            timestamp: {
                gte: today,
            },
        },
    });

    // If no records in AIUsageLog, fall back to the legacy LogEntry table
    if (usageCount === 0) {
        const legacyUsageCount = await prisma.logEntry.count({
            where: {
                organizationId,
                actionType: 'AI_API_USAGE',
                timestamp: {
                    gte: today,
                },
            },
        });

        return { 
            currentUsage: legacyUsageCount, 
            dailyLimit: organization.aiDailyLimit 
        };
    }

    return { 
        currentUsage: usageCount, 
        dailyLimit: organization.aiDailyLimit 
    };
}

/**
 * Tracks AI API usage for an organization
 * @param prisma Prisma client instance
 * @param organizationId The organization ID
 * @param userId The user ID
 * @param feature The AI feature being used
 * @param tokensUsed The number of tokens used
 * @param metadata Additional metadata
 * @returns The created log entry or null if creation failed
 */
export async function trackAIUsage(
    prisma: PrismaClient,
    organizationId: string,
    userId: string,
    feature: string,
    tokensUsed: number,
    metadata?: Record<string, any>
) {
    return logAIApiUsage(
        prisma,
        organizationId,
        userId,
        feature,
        tokensUsed,
        metadata
    );
}

/**
 * Checks if the AI feature is available for a user and organization
 * @param prisma Prisma client instance
 * @param organizationId The organization ID
 * @param userRole The user's role
 * @returns An object with availability status and reason
 */
export async function isAIFeatureAvailable(
    prisma: PrismaClient,
    organizationId: string,
    userRole?: string
): Promise<{ available: boolean; reason?: string }> {
    // Check if OpenAI API key is configured
    if (!isOpenAIConfigured()) {
        return { available: false, reason: 'OpenAI API key not configured' };
    }

    // Check if user has admin privileges
    if (!isUserAdmin(userRole)) {
        return {
            available: false,
            reason: 'Feature restricted to administrators',
        };
    }

    // Get the organization to check if AI is enabled
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { aiEnabled: true, aiDailyLimit: true },
    });

    if (!organization) {
        return { available: false, reason: 'Organization not found' };
    }

    // Check if AI is enabled for the organization
    // Only check aiEnabled if it's explicitly set to false (not undefined or null)
    if (organization.aiEnabled === false) {
        return {
            available: false,
            reason: 'AI feature is not enabled for this organization',
        };
    }

    // Check if organization has reached its daily limit
    const limitReached = await hasReachedDailyLimit(
        prisma,
        organizationId,
        organization
    );
    if (limitReached) {
        return { available: false, reason: 'Daily usage limit reached' };
    }

    return { available: true };
}

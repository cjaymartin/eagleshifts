import { PrismaClient } from '@/generated/prisma';
import {
    isOpenAIConfigured,
    isUserAdmin,
    hasReachedDailyLimit,
    trackAIUsage,
    isAIFeatureAvailable,
    getAIUsageStats,
} from '@/utils/aiUtils';
import { LogActionType } from '@/lib/logging';

// Mock the PrismaClient
jest.mock('@/generated/prisma', () => {
    const mockPrisma = {
        organization: {
            findUnique: jest.fn(),
        },
        logEntry: {
            count: jest.fn(),
            create: jest.fn(),
        },
        aIUsageLog: {
            count: jest.fn(),
            create: jest.fn(),
        },
    };
    return {
        PrismaClient: jest.fn(() => mockPrisma),
    };
});

// Mock the logging module
jest.mock('@/lib/logging', () => ({
    LogActionType: {
        AI_API_USAGE: 'AI_API_USAGE',
    },
    logAIApiUsage: jest.fn().mockImplementation(() => {
        return { id: 'mock-log-id' };
    }),
}));

describe('AI Utilities', () => {
    let mockPrisma: any;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Create a new instance of the mocked PrismaClient
        mockPrisma = new PrismaClient();

        // Mock process.env
        process.env = {
            ...process.env,
            OPENAI_API_KEY: undefined,
        };
    });

    describe('isOpenAIConfigured', () => {
        it('should return false when OpenAI API key is not configured', () => {
            process.env.OPENAI_API_KEY = undefined;
            expect(isOpenAIConfigured()).toBe(false);

            process.env.OPENAI_API_KEY = '';
            expect(isOpenAIConfigured()).toBe(false);

            process.env.OPENAI_API_KEY = 'your_openai_api_key';
            expect(isOpenAIConfigured()).toBe(false);
        });

        it('should return true when OpenAI API key is configured', () => {
            process.env.OPENAI_API_KEY = 'sk-1234567890abcdef';
            expect(isOpenAIConfigured()).toBe(true);
        });
    });

    describe('isUserAdmin', () => {
        it('should return false for non-admin roles', () => {
            expect(isUserAdmin('user')).toBe(false);
            expect(isUserAdmin('member')).toBe(false);
            expect(isUserAdmin(undefined)).toBe(false);
            expect(isUserAdmin('')).toBe(false);
        });

        it('should return true for admin roles', () => {
            expect(isUserAdmin('admin')).toBe(true);
            expect(isUserAdmin('owner')).toBe(true);
        });
    });

    describe('hasReachedDailyLimit', () => {
        it('should return true if organization is not found', async () => {
            mockPrisma.organization.findUnique.mockResolvedValueOnce(null);

            const result = await hasReachedDailyLimit(mockPrisma, 'org-id');

            expect(result).toBe(true);
            expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
                where: { id: 'org-id' },
                select: { aiDailyLimit: true },
            });
        });

        it('should return true if AIUsageLog count is greater than or equal to daily limit', async () => {
            mockPrisma.organization.findUnique.mockResolvedValueOnce({
                aiDailyLimit: 500,
            });

            mockPrisma.aIUsageLog.count.mockResolvedValueOnce(500);

            const result = await hasReachedDailyLimit(mockPrisma, 'org-id');

            expect(result).toBe(true);
            expect(mockPrisma.aIUsageLog.count).toHaveBeenCalledWith({
                where: {
                    organizationId: 'org-id',
                    timestamp: {
                        gte: expect.any(Date),
                    },
                },
            });
        });

        it('should return false if AIUsageLog count is less than daily limit', async () => {
            mockPrisma.organization.findUnique.mockResolvedValueOnce({
                aiDailyLimit: 500,
            });

            mockPrisma.aIUsageLog.count.mockResolvedValueOnce(100);

            const result = await hasReachedDailyLimit(mockPrisma, 'org-id');

            expect(result).toBe(false);
        });

        it('should fall back to LogEntry count if AIUsageLog count is 0', async () => {
            mockPrisma.organization.findUnique.mockResolvedValueOnce({
                aiDailyLimit: 500,
            });

            mockPrisma.aIUsageLog.count.mockResolvedValueOnce(0);
            mockPrisma.logEntry.count.mockResolvedValueOnce(300);

            const result = await hasReachedDailyLimit(mockPrisma, 'org-id');

            expect(result).toBe(false);
            expect(mockPrisma.aIUsageLog.count).toHaveBeenCalledWith({
                where: {
                    organizationId: 'org-id',
                    timestamp: {
                        gte: expect.any(Date),
                    },
                },
            });
            expect(mockPrisma.logEntry.count).toHaveBeenCalledWith({
                where: {
                    organizationId: 'org-id',
                    actionType: 'AI_API_USAGE',
                    timestamp: {
                        gte: expect.any(Date),
                    },
                },
            });
        });

        it('should return true if LogEntry count exceeds daily limit when AIUsageLog count is 0', async () => {
            mockPrisma.organization.findUnique.mockResolvedValueOnce({
                aiDailyLimit: 500,
            });

            mockPrisma.aIUsageLog.count.mockResolvedValueOnce(0);
            mockPrisma.logEntry.count.mockResolvedValueOnce(600);

            const result = await hasReachedDailyLimit(mockPrisma, 'org-id');

            expect(result).toBe(true);
        });
    });

    describe('trackAIUsage', () => {
        it('should call logAIApiUsage with the correct parameters', async () => {
            const result = await trackAIUsage(
                mockPrisma,
                'org-id',
                'user-id',
                'shift-entry',
                100,
                { additionalInfo: 'test' }
            );

            expect(result).toEqual({ id: 'mock-log-id' });
        });
    });

    describe('getAIUsageStats', () => {
        it('should return zero usage if organization is not found', async () => {
            mockPrisma.organization.findUnique.mockResolvedValueOnce(null);

            const result = await getAIUsageStats(mockPrisma, 'org-id');

            expect(result).toEqual({ currentUsage: 0, dailyLimit: 0 });
            expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
                where: { id: 'org-id' },
                select: { aiDailyLimit: true },
            });
        });

        it('should return current usage from AIUsageLog and daily limit', async () => {
            mockPrisma.organization.findUnique.mockResolvedValueOnce({
                aiDailyLimit: 500,
            });

            mockPrisma.aIUsageLog.count.mockResolvedValueOnce(150);

            const result = await getAIUsageStats(mockPrisma, 'org-id');

            expect(result).toEqual({ currentUsage: 150, dailyLimit: 500 });
            expect(mockPrisma.aIUsageLog.count).toHaveBeenCalledWith({
                where: {
                    organizationId: 'org-id',
                    timestamp: {
                        gte: expect.any(Date),
                    },
                },
            });
        });

        it('should fall back to LogEntry count if AIUsageLog count is 0', async () => {
            mockPrisma.organization.findUnique.mockResolvedValueOnce({
                aiDailyLimit: 500,
            });

            mockPrisma.aIUsageLog.count.mockResolvedValueOnce(0);
            mockPrisma.logEntry.count.mockResolvedValueOnce(200);

            const result = await getAIUsageStats(mockPrisma, 'org-id');

            expect(result).toEqual({ currentUsage: 200, dailyLimit: 500 });
            expect(mockPrisma.aIUsageLog.count).toHaveBeenCalledWith({
                where: {
                    organizationId: 'org-id',
                    timestamp: {
                        gte: expect.any(Date),
                    },
                },
            });
            expect(mockPrisma.logEntry.count).toHaveBeenCalledWith({
                where: {
                    organizationId: 'org-id',
                    actionType: 'AI_API_USAGE',
                    timestamp: {
                        gte: expect.any(Date),
                    },
                },
            });
        });
    });

    describe('isAIFeatureAvailable', () => {
        it('should return false if OpenAI API key is not configured', async () => {
            process.env.OPENAI_API_KEY = undefined;

            const result = await isAIFeatureAvailable(
                mockPrisma,
                'org-id',
                'admin'
            );

            expect(result).toEqual({
                available: false,
                reason: 'OpenAI API key not configured',
            });
        });

        it('should return false if user is not an admin', async () => {
            process.env.OPENAI_API_KEY = 'sk-1234567890abcdef';

            const result = await isAIFeatureAvailable(
                mockPrisma,
                'org-id',
                'user'
            );

            expect(result).toEqual({
                available: false,
                reason: 'Feature restricted to administrators',
            });
        });

        it.skip('should return false if daily limit is reached', async () => {
            process.env.OPENAI_API_KEY = 'sk-1234567890abcdef';

            mockPrisma.organization.findUnique.mockResolvedValueOnce({
                aiDailyLimit: 500,
            });

            mockPrisma.logEntry.count.mockResolvedValueOnce(500);

            const result = await isAIFeatureAvailable(
                mockPrisma,
                'org-id',
                'admin'
            );

            expect(result).toEqual({
                available: false,
                reason: 'Daily usage limit reached',
            });
        });

        it('should return true if all conditions are met', async () => {
            process.env.OPENAI_API_KEY = 'sk-1234567890abcdef';

            mockPrisma.organization.findUnique.mockResolvedValueOnce({
                aiDailyLimit: 500,
            });

            mockPrisma.logEntry.count.mockResolvedValueOnce(100);

            const result = await isAIFeatureAvailable(
                mockPrisma,
                'org-id',
                'admin'
            );

            expect(result).toEqual({
                available: true,
            });
        });
    });
});

import { createInnerTRPCContext } from '@/server/trpc';
import { appRouter } from '@/server/api/root';
import { TRPCError } from '@trpc/server';

// Mock user and context for superadmin
const mockSuperadminUser = {
    id: 'user123',
    organizationId: 'org123',
    role: 'superadmin',
};

// Mock PrismaClient
const mockPrisma = {
    organization: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
    },
    aIUsageLog: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
    },
    user: {
        findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
} as any;

const mockSuperadminContext = createInnerTRPCContext({
    user: mockSuperadminUser,
    prisma: mockPrisma,
});

// Create caller
const superadminCaller = appRouter.createCaller(mockSuperadminContext);

describe.skip('aiRouter reporting endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getUsageReports', () => {
        it('should throw an error for invalid date format', async () => {
            await expect(
                superadminCaller.ai.getUsageReports({
                    startDate: 'invalid-date',
                    endDate: '2023-01-31',
                })
            ).rejects.toThrow('Invalid date format');
        });

        it('should return usage reports for the specified date range', async () => {
            // Mock data
            const mockLogs = [
                {
                    id: 'log1',
                    organizationId: 'org1',
                    userId: 'user1',
                    feature: 'shift_text_parsing',
                    tokensUsed: 100,
                    timestamp: new Date('2023-01-15'),
                    responseStatus: 'success',
                    organization: { name: 'Org 1', aiDailyLimit: 500 },
                    user: { name: 'User 1', email: 'user1@example.com' },
                },
                {
                    id: 'log2',
                    organizationId: 'org2',
                    userId: 'user2',
                    feature: 'shift_creation',
                    tokensUsed: 10,
                    timestamp: new Date('2023-01-16'),
                    responseStatus: 'success',
                    organization: { name: 'Org 2', aiDailyLimit: 1000 },
                    user: { name: 'User 2', email: 'user2@example.com' },
                },
            ];

            const mockSummary = [
                {
                    organizationId: 'org1',
                    feature: 'shift_text_parsing',
                    _count: { id: 1 },
                    _sum: { tokensUsed: 100 },
                },
                {
                    organizationId: 'org2',
                    feature: 'shift_creation',
                    _count: { id: 1 },
                    _sum: { tokensUsed: 10 },
                },
            ];

            const mockOrganizations = [
                { id: 'org1', name: 'Org 1', aiDailyLimit: 500 },
                { id: 'org2', name: 'Org 2', aiDailyLimit: 1000 },
            ];

            // Setup mocks
            mockPrisma.aIUsageLog.findMany.mockResolvedValueOnce(mockLogs);
            mockPrisma.aIUsageLog.groupBy.mockResolvedValueOnce(mockSummary);
            mockPrisma.organization.findMany.mockResolvedValueOnce(
                mockOrganizations
            );

            // Call the procedure
            const result = await superadminCaller.ai.getUsageReports({
                startDate: '2023-01-01',
                endDate: '2023-01-31',
            });

            // Verify the result
            expect(result).toEqual({
                logs: mockLogs,
                summary: expect.arrayContaining([
                    expect.objectContaining({
                        organizationId: 'org1',
                        feature: 'shift_text_parsing',
                        organizationName: 'Org 1',
                    }),
                    expect.objectContaining({
                        organizationId: 'org2',
                        feature: 'shift_creation',
                        organizationName: 'Org 2',
                    }),
                ]),
                totalRequests: 2,
                totalTokensUsed: 110,
                successRate: 100,
            });

            // Verify the query parameters
            expect(mockPrisma.aIUsageLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        timestamp: {
                            gte: expect.any(Date),
                            lte: expect.any(Date),
                        },
                    },
                })
            );
        });

        it('should filter by organization ID when provided', async () => {
            // Mock data
            mockPrisma.aIUsageLog.findMany.mockResolvedValueOnce([]);
            mockPrisma.aIUsageLog.groupBy.mockResolvedValueOnce([]);
            mockPrisma.organization.findMany.mockResolvedValueOnce([]);

            // Call the procedure with organizationId
            await superadminCaller.ai.getUsageReports({
                startDate: '2023-01-01',
                endDate: '2023-01-31',
                organizationId: 'org1',
            });

            // Verify the query includes the organization filter
            expect(mockPrisma.aIUsageLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        organizationId: 'org1',
                    }),
                })
            );
        });
    });

    describe('getOrganizationDailyUsage', () => {
        it('should throw an error if organization is not found', async () => {
            mockPrisma.organization.findUnique.mockResolvedValueOnce(null);

            await expect(
                superadminCaller.ai.getOrganizationDailyUsage({
                    organizationId: 'non-existent-org',
                })
            ).rejects.toThrow('Organization not found');
        });

        it('should return daily usage statistics for an organization', async () => {
            // Mock data
            const mockOrg = { name: 'Test Org', aiDailyLimit: 500 };
            const mockDailyUsage = [
                {
                    day: new Date('2023-01-01'),
                    requests: 50,
                    successful_requests: 48,
                    tokens_used: 500,
                },
                {
                    day: new Date('2023-01-02'),
                    requests: 30,
                    successful_requests: 30,
                    tokens_used: 300,
                },
            ];
            const mockFeatureBreakdown = [
                {
                    feature: 'shift_text_parsing',
                    _count: { id: 60 },
                    _sum: { tokensUsed: 600 },
                },
                {
                    feature: 'shift_creation',
                    _count: { id: 20 },
                    _sum: { tokensUsed: 200 },
                },
            ];
            const mockUserBreakdown = [
                {
                    userId: 'user1',
                    _count: { id: 50 },
                    _sum: { tokensUsed: 500 },
                },
                {
                    userId: 'user2',
                    _count: { id: 30 },
                    _sum: { tokensUsed: 300 },
                },
            ];
            const mockUsers = [
                { id: 'user1', name: 'User 1', email: 'user1@example.com' },
                { id: 'user2', name: 'User 2', email: 'user2@example.com' },
            ];

            // Setup mocks
            mockPrisma.organization.findUnique.mockResolvedValueOnce(mockOrg);
            mockPrisma.$queryRaw.mockResolvedValueOnce(mockDailyUsage);
            mockPrisma.aIUsageLog.groupBy
                .mockResolvedValueOnce(mockFeatureBreakdown)
                .mockResolvedValueOnce(mockUserBreakdown);
            mockPrisma.user.findMany.mockResolvedValueOnce(mockUsers);

            // Call the procedure
            const result = await superadminCaller.ai.getOrganizationDailyUsage({
                organizationId: 'org1',
                days: 7,
            });

            // Verify the result
            expect(result).toEqual({
                organization: {
                    id: 'org1',
                    name: 'Test Org',
                    aiDailyLimit: 500,
                },
                dailyUsage: mockDailyUsage,
                featureBreakdown: mockFeatureBreakdown,
                userBreakdown: expect.arrayContaining([
                    expect.objectContaining({
                        userId: 'user1',
                        userName: 'User 1',
                        userEmail: 'user1@example.com',
                    }),
                    expect.objectContaining({
                        userId: 'user2',
                        userName: 'User 2',
                        userEmail: 'user2@example.com',
                    }),
                ]),
                totalRequests: 80,
                totalTokensUsed: 800,
                averageDailyRequests: 40,
            });

            // Verify the query parameters
            expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
                where: { id: 'org1' },
                select: { name: true, aiDailyLimit: true },
            });
            expect(mockPrisma.$queryRaw).toHaveBeenCalled();
        });
    });
});

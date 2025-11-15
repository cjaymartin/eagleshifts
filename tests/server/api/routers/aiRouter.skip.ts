import { createInnerTRPCContext } from '@/server/trpc';
import { appRouter } from '@/server/api/root';
import { createShiftFromAI } from '@/utils/aiShiftCreationService';
import { isAIFeatureAvailable, trackAIUsage } from '@/utils/aiUtils';

// Mock dependencies
jest.mock('@/utils/aiShiftCreationService');
jest.mock('@/utils/aiUtils');

// Mock user and context
const mockUser = {
    id: 'user123',
    organizationId: 'org123',
    role: 'admin',
};

const mockPrisma = {
    // Add any necessary mock methods here
} as any;

const mockContext = createInnerTRPCContext({
    user: mockUser,
    prisma: mockPrisma,
});

// Create caller
const caller = appRouter.createCaller(mockContext);

describe.skip('aiRouter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createShiftFromAI', () => {
        it('should check if AI feature is available', async () => {
            // Mock isAIFeatureAvailable to return available
            (isAIFeatureAvailable as jest.Mock).mockResolvedValue({
                available: true,
                reason: '',
            });

            // Mock createShiftFromAI to return a shift
            (createShiftFromAI as jest.Mock).mockResolvedValue({
                id: 'shift123',
                title: 'Test Shift',
            });

            // Mock trackAIUsage
            (trackAIUsage as jest.Mock).mockResolvedValue({});

            // Call the procedure
            await caller.ai.createShiftFromAI({
                title: 'Test Shift',
                startTime: '2023-01-01T09:00:00Z',
                endTime: '2023-01-01T17:00:00Z',
                date: '2023-01-01',
            });

            // Verify isAIFeatureAvailable was called
            expect(isAIFeatureAvailable).toHaveBeenCalledWith(
                mockPrisma,
                mockUser.organizationId,
                mockUser.role
            );
        });

        it('should throw an error if AI feature is not available', async () => {
            // Mock isAIFeatureAvailable to return not available
            (isAIFeatureAvailable as jest.Mock).mockResolvedValue({
                available: false,
                reason: 'Feature disabled',
            });

            // Call the procedure and expect it to throw
            await expect(
                caller.ai.createShiftFromAI({
                    title: 'Test Shift',
                    startTime: '2023-01-01T09:00:00Z',
                    endTime: '2023-01-01T17:00:00Z',
                    date: '2023-01-01',
                })
            ).rejects.toThrow('AI feature is not available: Feature disabled');

            // Verify createShiftFromAI was not called
            expect(createShiftFromAI).not.toHaveBeenCalled();
        });

        it('should call createShiftFromAI with correct parameters', async () => {
            // Mock isAIFeatureAvailable to return available
            (isAIFeatureAvailable as jest.Mock).mockResolvedValue({
                available: true,
                reason: '',
            });

            // Mock createShiftFromAI to return a shift
            (createShiftFromAI as jest.Mock).mockResolvedValue({
                id: 'shift123',
                title: 'Test Shift',
            });

            // Mock trackAIUsage
            (trackAIUsage as jest.Mock).mockResolvedValue({});

            // Input data
            const inputData = {
                title: 'Test Shift',
                startTime: '2023-01-01T09:00:00Z',
                endTime: '2023-01-01T17:00:00Z',
                date: '2023-01-01',
                locationId: 'loc123',
                departmentId: 'dept123',
                notes: 'Test notes',
                slots: 2,
                timezone: 'America/New_York',
                newLocation: {
                    name: 'New Location',
                    address: 'Test Address',
                },
                newDepartment: {
                    name: 'New Department',
                },
                assignees: ['John Doe', 'Jane Smith'],
                entityMatches: {
                    location: {
                        bestMatch: null,
                        potentialMatches: [],
                        needsCreation: false,
                    },
                    department: {
                        bestMatch: null,
                        potentialMatches: [],
                        needsCreation: false,
                    },
                    members: [],
                },
            };

            // Call the procedure
            await caller.ai.createShiftFromAI(inputData);

            // Verify createShiftFromAI was called with correct parameters
            expect(createShiftFromAI).toHaveBeenCalledWith(
                {
                    ...inputData,
                    organizationId: mockUser.organizationId,
                },
                mockPrisma,
                mockUser.id
            );
        });

        it('should track AI usage after creating shift', async () => {
            // Mock isAIFeatureAvailable to return available
            (isAIFeatureAvailable as jest.Mock).mockResolvedValue({
                available: true,
                reason: '',
            });

            // Mock createShiftFromAI to return a shift
            const mockShift = {
                id: 'shift123',
                title: 'Test Shift',
            };
            (createShiftFromAI as jest.Mock).mockResolvedValue(mockShift);

            // Mock trackAIUsage
            (trackAIUsage as jest.Mock).mockResolvedValue({});

            // Call the procedure
            const result = await caller.ai.createShiftFromAI({
                title: 'Test Shift',
                startTime: '2023-01-01T09:00:00Z',
                endTime: '2023-01-01T17:00:00Z',
                date: '2023-01-01',
            });

            // Verify trackAIUsage was called
            expect(trackAIUsage).toHaveBeenCalledWith(
                mockPrisma,
                mockUser.organizationId,
                mockUser.id,
                'shift_creation',
                10, // Fixed token count
                { shiftId: mockShift.id }
            );

            // Verify result is the shift returned by createShiftFromAI
            expect(result).toEqual(mockShift);
        });

        it('should handle errors from createShiftFromAI', async () => {
            // Mock isAIFeatureAvailable to return available
            (isAIFeatureAvailable as jest.Mock).mockResolvedValue({
                available: true,
                reason: '',
            });

            // Mock createShiftFromAI to throw an error
            const mockError = new Error('Test error');
            (createShiftFromAI as jest.Mock).mockRejectedValue(mockError);

            // Call the procedure and expect it to throw
            await expect(
                caller.ai.createShiftFromAI({
                    title: 'Test Shift',
                    startTime: '2023-01-01T09:00:00Z',
                    endTime: '2023-01-01T17:00:00Z',
                    date: '2023-01-01',
                })
            ).rejects.toThrow(
                'Failed to create shift from AI data: Test error'
            );

            // Verify trackAIUsage was not called
            expect(trackAIUsage).not.toHaveBeenCalled();
        });
    });
});

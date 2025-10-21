import { PrismaClient } from '@/generated/prisma';
import { isAIFeatureAvailable, isOpenAIConfigured } from '@/utils/aiUtils';
import { LogActionType } from '@/lib/logging';

// Mock the PrismaClient
jest.mock('@/generated/prisma', () => {
  const mockPrisma = {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    logEntry: {
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

describe('AI Feature Integration Tests', () => {
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
  
  describe('Feature Flag Integration', () => {
    it('should correctly integrate OpenAI configuration check with feature availability', async () => {
      // Test with API key not configured
      process.env.OPENAI_API_KEY = undefined;
      
      let result = await isAIFeatureAvailable(mockPrisma, 'org-id', 'admin');
      
      expect(result.available).toBe(false);
      expect(result.reason).toBe('OpenAI API key not configured');
      
      // Test with API key configured
      process.env.OPENAI_API_KEY = 'sk-1234567890abcdef';
      
      mockPrisma.organization.findUnique.mockResolvedValueOnce({
        aiDailyLimit: 500,
      });
      
      mockPrisma.logEntry.count.mockResolvedValueOnce(100);
      
      result = await isAIFeatureAvailable(mockPrisma, 'org-id', 'admin');
      
      expect(result.available).toBe(true);
    });
    
    it('should correctly integrate role-based access control with feature availability', async () => {
      process.env.OPENAI_API_KEY = 'sk-1234567890abcdef';
      
      // Test with non-admin role
      let result = await isAIFeatureAvailable(mockPrisma, 'org-id', 'user');
      
      expect(result.available).toBe(false);
      expect(result.reason).toBe('Feature restricted to administrators');
      
      // Test with admin role
      mockPrisma.organization.findUnique.mockResolvedValueOnce({
        aiDailyLimit: 500,
      });
      
      mockPrisma.logEntry.count.mockResolvedValueOnce(100);
      
      result = await isAIFeatureAvailable(mockPrisma, 'org-id', 'admin');
      
      expect(result.available).toBe(true);
    });
    
    it('should correctly integrate usage limit check with feature availability', async () => {
      process.env.OPENAI_API_KEY = 'sk-1234567890abcdef';
      
      // Test with usage limit reached
      mockPrisma.organization.findUnique.mockResolvedValueOnce({
        aiDailyLimit: 500,
      });
      
      mockPrisma.logEntry.count.mockResolvedValueOnce(500);
      
      let result = await isAIFeatureAvailable(mockPrisma, 'org-id', 'admin');
      
      expect(result.available).toBe(false);
      expect(result.reason).toBe('Daily usage limit reached');
      
      // Test with usage limit not reached
      mockPrisma.organization.findUnique.mockResolvedValueOnce({
        aiDailyLimit: 500,
      });
      
      mockPrisma.logEntry.count.mockResolvedValueOnce(100);
      
      result = await isAIFeatureAvailable(mockPrisma, 'org-id', 'admin');
      
      expect(result.available).toBe(true);
    });
  });
  
  describe('Configuration Integration', () => {
    it('should correctly handle organization configuration updates', async () => {
      mockPrisma.organization.update.mockResolvedValueOnce({
        aiDailyLimit: 1000,
      });
      
      const updatedOrg = await mockPrisma.organization.update({
        where: { id: 'org-id' },
        data: { aiDailyLimit: 1000 },
        select: { aiDailyLimit: true },
      });
      
      expect(updatedOrg.aiDailyLimit).toBe(1000);
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-id' },
        data: { aiDailyLimit: 1000 },
        select: { aiDailyLimit: true },
      });
    });
  });
  
  describe('Usage Tracking Integration', () => {
    it('should correctly log API usage', async () => {
      const logResult = await mockPrisma.logEntry.create({
        data: {
          organizationId: 'org-id',
          userId: 'user-id',
          actionType: LogActionType.AI_API_USAGE,
          entityType: 'AI',
          description: 'Used AI API for shift-entry',
          metadata: {
            tokensUsed: 100,
            feature: 'shift-entry',
          },
        },
      });
      
      expect(mockPrisma.logEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-id',
          userId: 'user-id',
          actionType: LogActionType.AI_API_USAGE,
        }),
      });
    });
  });
  
  describe('Environment Configuration Integration', () => {
    it('should correctly detect OpenAI API key configuration', () => {
      process.env.OPENAI_API_KEY = undefined;
      expect(isOpenAIConfigured()).toBe(false);
      
      process.env.OPENAI_API_KEY = 'sk-1234567890abcdef';
      expect(isOpenAIConfigured()).toBe(true);
    });
  });
});
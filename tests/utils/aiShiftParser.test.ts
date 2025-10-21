import { parseShiftText } from '@/utils/aiShiftParser';
import { PrismaClient } from '@/generated/prisma';

// Mock the PrismaClient
jest.mock('@/generated/prisma', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      location: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'loc1', name: 'Downtown Store' },
          { id: 'loc2', name: 'Main Office' },
        ]),
      },
    })),
  };
});

describe('aiShiftParser', () => {
  const mockDate = '2023-01-01T12:00:00Z';
  const mockOrgId = 'org123';
  const mockPrisma = new PrismaClient();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('parses shift text with time range', async () => {
    const text = 'John works at Downtown Store from 9am to 5pm';
    
    const result = await parseShiftText(text, mockDate, mockOrgId, mockPrisma);
    
    // Check that the result has the expected structure
    expect(result).toHaveProperty('parsedShift');
    expect(result).toHaveProperty('tokensUsed');
    
    // Check that the parsed shift has the expected properties
    const { parsedShift } = result;
    expect(parsedShift).toHaveProperty('title');
    expect(parsedShift).toHaveProperty('startTime');
    expect(parsedShift).toHaveProperty('endTime');
    expect(parsedShift).toHaveProperty('date');
    
    // Check that the time range was parsed correctly
    expect(parsedShift.startTime).not.toBeNull();
    expect(parsedShift.endTime).not.toBeNull();
    
    // The title should include the location and time range
    expect(parsedShift.title).toContain('Downtown Store');
    expect(parsedShift.title).toContain('9am');
    expect(parsedShift.title).toContain('5pm');
  });
  
  it('parses shift text with location', async () => {
    const text = 'Meeting at Main Office';
    
    const result = await parseShiftText(text, mockDate, mockOrgId, mockPrisma);
    
    // Check that the location was parsed correctly
    expect(result.parsedShift.locationId).toBe('loc2');
    expect(result.parsedShift.title).toContain('Main Office');
    
    // Verify that the location was looked up from the database
    expect(mockPrisma.location.findMany).toHaveBeenCalledWith({
      where: { organizationId: mockOrgId },
      select: { id: true, name: true },
    });
  });
  
  it('parses shift text with number of slots', async () => {
    const text = 'Need 3 people at Downtown Store';
    
    const result = await parseShiftText(text, mockDate, mockOrgId, mockPrisma);
    
    // Check that the number of slots was parsed correctly
    expect(result.parsedShift.slots).toBe(3);
  });
  
  it('handles text without time range', async () => {
    const text = 'Meeting at Downtown Store';
    
    const result = await parseShiftText(text, mockDate, mockOrgId, mockPrisma);
    
    // Check that the result still has a title and date
    expect(result.parsedShift.title).toContain('Downtown Store');
    expect(result.parsedShift.date).toBe(mockDate);
    
    // Start and end times should be null
    expect(result.parsedShift.startTime).toBeNull();
    expect(result.parsedShift.endTime).toBeNull();
  });
  
  it('handles text without location', async () => {
    const text = 'Meeting from 9am to 5pm';
    
    const result = await parseShiftText(text, mockDate, mockOrgId, mockPrisma);
    
    // Check that the result still has a title and time range
    expect(result.parsedShift.title).toContain('New Shift');
    expect(result.parsedShift.startTime).not.toBeNull();
    expect(result.parsedShift.endTime).not.toBeNull();
    
    // Location ID should be undefined
    expect(result.parsedShift.locationId).toBeUndefined();
  });
  
  it('handles errors when fetching locations', async () => {
    // Mock the findMany method to throw an error
    (mockPrisma.location.findMany as jest.Mock).mockRejectedValueOnce(
      new Error('Database error')
    );
    
    const text = 'Meeting at Downtown Store';
    
    const result = await parseShiftText(text, mockDate, mockOrgId, mockPrisma);
    
    // The function should still return a result even if location lookup fails
    expect(result).toHaveProperty('parsedShift');
    expect(result.parsedShift.locationId).toBeUndefined();
  });
  
  it('includes notes with the original text', async () => {
    const text = 'John works at Downtown Store from 9am to 5pm';
    
    const result = await parseShiftText(text, mockDate, mockOrgId, mockPrisma);
    
    // Check that the notes include the original text
    expect(result.parsedShift.notes).toContain(text);
  });
  
  it('works without prisma and organizationId', async () => {
    const text = 'John works at Downtown Store from 9am to 5pm';
    
    // Call without prisma and organizationId
    const result = await parseShiftText(text, mockDate);
    
    // Should still parse the time range
    expect(result.parsedShift.startTime).not.toBeNull();
    expect(result.parsedShift.endTime).not.toBeNull();
    
    // But location ID should be undefined
    expect(result.parsedShift.locationId).toBeUndefined();
  });
});
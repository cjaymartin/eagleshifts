import { parseShiftText } from '@/utils/aiShiftParser';
import { PrismaClient } from '@/generated/prisma';
import OpenAI from 'openai';

// Mock the OpenAI client
jest.mock('openai', () => {
    const mockChatCompletions = {
        create: jest.fn().mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            title: 'Downtown Store Shift',
                            location: 'Downtown Store',
                            department: 'Sales',
                            startTime: '9am',
                            endTime: '5pm',
                            slots: 3,
                            assignees: ['John'],
                            notes: 'Break from 12-1pm',
                        }),
                    },
                },
            ],
            usage: {
                prompt_tokens: 100,
                completion_tokens: 50,
            },
        }),
    };

    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            chat: {
                completions: mockChatCompletions,
            },
        })),
    };
});

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

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.OPENAI_SHIFT_PARSER_MODEL = 'gpt-5-nano';
});

afterEach(() => {
    process.env = originalEnv;
});

describe.skip('aiShiftParser', () => {
    const mockDate = '2023-01-01T12:00:00Z';
    const mockOrgId = 'org123';
    const mockPrisma = new PrismaClient();
    const mockOpenAIClient = new OpenAI({ apiKey: 'test-api-key' });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Tests for AI parsing functionality
    describe('AI parsing', () => {
        it('calls OpenAI API with correct parameters', async () => {
            const text = 'John works at Downtown Store from 9am to 5pm';

            await parseShiftText(text, mockDate, mockOrgId, mockPrisma);

            // Check that the OpenAI client was initialized
            expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });

            // Check that the chat.completions.create method was called with correct parameters
            const createMethod = mockOpenAIClient.chat.completions.create;
            expect(createMethod).toHaveBeenCalledTimes(1);

            const callArgs = (createMethod as jest.Mock).mock.calls[0][0];
            expect(callArgs.model).toBe('gpt-5-nano');
            expect(callArgs.messages[0].role).toBe('system');
            expect(callArgs.messages[1].role).toBe('user');
            expect(callArgs.messages[1].content).toContain(text);
            expect(callArgs.response_format).toEqual({ type: 'json_object' });
        });

        it('parses the AI response correctly', async () => {
            const text = 'John works at Downtown Store from 9am to 5pm';

            const result = await parseShiftText(
                text,
                mockDate,
                mockOrgId,
                mockPrisma
            );

            // Check that the AI response was parsed correctly
            expect(result.parsedShift.title).toBe('Downtown Store Shift');
            expect(result.parsedShift.department).toBe('Sales');
            expect(result.parsedShift.slots).toBe(3);
            expect(result.parsedShift.assignees).toEqual(['John']);
            expect(result.parsedShift.notes).toBe('Break from 12-1pm');

            // Check that tokens were calculated correctly
            expect(result.tokensUsed).toBe(150); // 100 prompt + 50 completion
        });

        it('falls back to basic parsing when OpenAI is not configured', async () => {
            // Remove the API key to simulate OpenAI not being configured
            process.env.OPENAI_API_KEY = '';

            const text = 'John works at Downtown Store from 9am to 5pm';

            const result = await parseShiftText(
                text,
                mockDate,
                mockOrgId,
                mockPrisma
            );

            // Check that the result was generated using the fallback parser
            expect(result.tokensUsed).toBe(0); // Fallback parser uses 0 tokens

            // The OpenAI client should not have been called
            expect(
                mockOpenAIClient.chat.completions.create
            ).not.toHaveBeenCalled();
        });

        it('falls back to basic parsing when OpenAI API fails', async () => {
            // Mock the OpenAI API to throw an error
            (
                mockOpenAIClient.chat.completions.create as jest.Mock
            ).mockRejectedValueOnce(new Error('API error'));

            const text = 'John works at Downtown Store from 9am to 5pm';

            const result = await parseShiftText(
                text,
                mockDate,
                mockOrgId,
                mockPrisma
            );

            // Check that the result was generated using the fallback parser
            expect(result.tokensUsed).toBe(0); // Fallback parser uses 0 tokens

            // The OpenAI client should have been called
            expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalled();
        });

        it('handles invalid JSON response from OpenAI', async () => {
            // Mock the OpenAI API to return invalid JSON
            (
                mockOpenAIClient.chat.completions.create as jest.Mock
            ).mockResolvedValueOnce({
                choices: [{ message: { content: 'Not valid JSON' } }],
                usage: { prompt_tokens: 100, completion_tokens: 50 },
            });

            const text = 'John works at Downtown Store from 9am to 5pm';

            const result = await parseShiftText(
                text,
                mockDate,
                mockOrgId,
                mockPrisma
            );

            // Check that the result was generated using the fallback parser
            expect(result.tokensUsed).toBe(0); // Fallback parser uses 0 tokens
        });

        it('handles empty response from OpenAI', async () => {
            // Mock the OpenAI API to return an empty response
            (
                mockOpenAIClient.chat.completions.create as jest.Mock
            ).mockResolvedValueOnce({
                choices: [],
                usage: { prompt_tokens: 100, completion_tokens: 0 },
            });

            const text = 'John works at Downtown Store from 9am to 5pm';

            const result = await parseShiftText(
                text,
                mockDate,
                mockOrgId,
                mockPrisma
            );

            // Check that the result was generated using the fallback parser
            expect(result.tokensUsed).toBe(0); // Fallback parser uses 0 tokens
        });
    });

    it('parses shift text with time range', async () => {
        const text = 'John works at Downtown Store from 9am to 5pm';

        const result = await parseShiftText(
            text,
            mockDate,
            mockOrgId,
            mockPrisma
        );

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

        const result = await parseShiftText(
            text,
            mockDate,
            mockOrgId,
            mockPrisma
        );

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

        const result = await parseShiftText(
            text,
            mockDate,
            mockOrgId,
            mockPrisma
        );

        // Check that the number of slots was parsed correctly
        expect(result.parsedShift.slots).toBe(3);
    });

    it('handles text without time range', async () => {
        const text = 'Meeting at Downtown Store';

        const result = await parseShiftText(
            text,
            mockDate,
            mockOrgId,
            mockPrisma
        );

        // Check that the result still has a title and date
        expect(result.parsedShift.title).toContain('Downtown Store');
        expect(result.parsedShift.date).toBe(mockDate);

        // Start and end times should be null
        expect(result.parsedShift.startTime).toBeNull();
        expect(result.parsedShift.endTime).toBeNull();
    });

    it('handles text without location', async () => {
        const text = 'Meeting from 9am to 5pm';

        const result = await parseShiftText(
            text,
            mockDate,
            mockOrgId,
            mockPrisma
        );

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

        const result = await parseShiftText(
            text,
            mockDate,
            mockOrgId,
            mockPrisma
        );

        // The function should still return a result even if location lookup fails
        expect(result).toHaveProperty('parsedShift');
        expect(result.parsedShift.locationId).toBeUndefined();
    });

    it('includes notes with the original text', async () => {
        const text = 'John works at Downtown Store from 9am to 5pm';

        const result = await parseShiftText(
            text,
            mockDate,
            mockOrgId,
            mockPrisma
        );

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

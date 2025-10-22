import { PrismaClient } from '@/generated/prisma';
import OpenAI from 'openai';
import {
    matchAllEntities,
    AllEntityMatchingResults,
} from './entityMatchingService';

/**
 * Interface for the result of parsing shift text
 */
interface ParseShiftTextResult {
    parsedShift: {
        title: string;
        startTime: string | null;
        endTime: string | null;
        date: string;
        locationId?: string;
        departmentId?: string;
        notes?: string;
        slots?: number;
        department?: string;
        assignees?: string[];
    };
    entityMatches?: AllEntityMatchingResults;
    tokensUsed: number;
}

/**
 * Interface for the OpenAI response structure
 */
interface AIShiftParseResponse {
    title: string;
    location?: string;
    department?: string;
    startTime?: string;
    endTime?: string;
    slots?: number;
    assignees?: string[];
    notes?: string;
}

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

/**
 * Gets the OpenAI client instance, initializing it if necessary
 * @returns The OpenAI client instance or null if not configured
 */
function getOpenAIClient(): OpenAI | null {
    if (openaiClient) return openaiClient;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key') return null;

    openaiClient = new OpenAI({ apiKey });
    return openaiClient;
}

/**
 * Gets the OpenAI model to use for shift parsing
 * @returns The model name to use
 */
function getOpenAIModel(): string {
    return process.env.OPENAI_SHIFT_PARSER_MODEL || 'gpt-5-nano';
}

/**
 * Creates the system prompt for the AI model
 * @returns The system prompt
 */
function createSystemPrompt(): string {
    return `You are a shift scheduling assistant. Your task is to parse free-form text describing a shift and extract structured information.

Extract the following information if present:
1. Shift title - A descriptive name for the shift
2. Location - Where the shift takes place
3. Department - Which department the shift is for (if mentioned)
4. Start time - When the shift starts
5. End time - When the shift ends
6. Number of slots/positions - How many people are needed
7. Assignees - Names of people assigned to the shift

Guidelines:
- For times, handle various formats (9am, 9:00, 9PM, etc.)
- Make intelligent assumptions for ambiguous times (e.g., if only "9-5" is mentioned, assume 9:00 AM to 5:00 PM)
- If information is missing, leave the corresponding field empty
- Do not invent information that isn't in the text
- For the title, create a concise descriptive title based on the available information

Respond with a JSON object containing the extracted information in the following format:
{
  "title": "string",
  "location": "string or null",
  "department": "string or null",
  "startTime": "string or null",
  "endTime": "string or null",
  "slots": number or null,
  "assignees": ["string"] or null,
  "notes": "string or null"
}`;
}

/**
 * Parses shift text using AI to extract structured shift data
 *
 * @param text The free-form text describing the shift
 * @param date Optional ISO string date for the shift
 * @param organizationId The organization ID
 * @param prisma Prisma client instance
 * @returns The parsed shift data and tokens used
 */
export async function parseShiftText(
    text: string,
    date?: string,
    organizationId?: string,
    prisma?: PrismaClient
): Promise<ParseShiftTextResult> {
    // Get the OpenAI client
    const client = getOpenAIClient();

    // If OpenAI is not configured, fall back to the basic parsing logic
    if (!client) {
        return fallbackParseShiftText(text, date, organizationId, prisma);
    }

    try {
        // Prepare the date object for time parsing
        const dateObj = date ? new Date(date) : new Date();
        const dateString = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Call the OpenAI API
        const response = await client.chat.completions.create({
            model: getOpenAIModel(),
            messages: [
                { role: 'system', content: createSystemPrompt() },
                {
                    role: 'user',
                    content: `Parse the following shift description for ${dateString}:\n\n${text}`,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2, // Lower temperature for more deterministic results
        });

        // Get the response content
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from OpenAI API');
        }

        // Parse the JSON response
        let parsedResponse: AIShiftParseResponse;
        try {
            parsedResponse = JSON.parse(content) as AIShiftParseResponse;
        } catch (error) {
            throw new Error(
                `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`
            );
        }

        // Validate the response
        if (!parsedResponse.title) {
            throw new Error('Invalid response: missing title');
        }

        // Process times if provided
        let startTime: string | null = null;
        let endTime: string | null = null;

        if (parsedResponse.startTime) {
            try {
                startTime = parseTimeString(parsedResponse.startTime, dateObj);
            } catch (error) {
                console.warn(
                    `Failed to parse start time: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }

        if (parsedResponse.endTime) {
            try {
                endTime = parseTimeString(parsedResponse.endTime, dateObj);
            } catch (error) {
                console.warn(
                    `Failed to parse end time: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }

        // Match entities with existing database records
        let locationId: string | undefined = undefined;
        let departmentId: string | undefined = undefined;
        let entityMatches: AllEntityMatchingResults | undefined = undefined;

        const locationName = parsedResponse.location || undefined;
        const departmentName = parsedResponse.department || undefined;
        const assigneeNames = parsedResponse.assignees || undefined;

        if (prisma && organizationId) {
            try {
                // Use the Entity Matching Service to match all entities
                entityMatches = await matchAllEntities(
                    locationName,
                    departmentName,
                    assigneeNames,
                    organizationId,
                    prisma,
                    { threshold: 0.6, maxResults: 5 }
                );

                // Set locationId if there's a best match
                if (entityMatches.location.bestMatch) {
                    locationId = entityMatches.location.bestMatch.entity.id;
                }

                // Set departmentId if there's a best match
                if (entityMatches.department.bestMatch) {
                    departmentId = entityMatches.department.bestMatch.entity.id;
                }
            } catch (error) {
                console.warn(
                    `Failed to match entities: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }

        // Calculate tokens used
        const promptTokens = response.usage?.prompt_tokens || 0;
        const completionTokens = response.usage?.completion_tokens || 0;
        const tokensUsed = promptTokens + completionTokens;

        // Return the parsed shift with entity matches
        return {
            parsedShift: {
                title: parsedResponse.title,
                startTime,
                endTime,
                date: date || new Date().toISOString(),
                locationId,
                departmentId,
                notes: parsedResponse.notes || `Generated from text: "${text}"`,
                slots: parsedResponse.slots,
                department: parsedResponse.department,
                assignees: parsedResponse.assignees,
            },
            entityMatches,
            tokensUsed,
        };
    } catch (error) {
        console.error('Error parsing shift text with AI:', error);

        // Fall back to basic parsing if AI parsing fails
        return fallbackParseShiftText(text, date, organizationId, prisma);
    }
}

/**
 * Parses a time string into an ISO string
 *
 * @param timeString The time string to parse (e.g., "9am", "9:00 PM")
 * @param dateObj The date object to use for the time
 * @returns The parsed time as an ISO string
 */
function parseTimeString(timeString: string, dateObj: Date): string {
    // Handle various time formats
    const timePattern = /(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?/i;
    const match = timeString.match(timePattern);

    if (!match) {
        throw new Error(`Invalid time format: ${timeString}`);
    }

    let hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const ampm = match[3]?.toLowerCase();

    // Adjust hours for AM/PM
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    // Create a new date object to avoid modifying the original
    const timeDate = new Date(dateObj);
    timeDate.setHours(hours, minutes, 0, 0);

    return timeDate.toISOString();
}

/**
 * Fallback function for parsing shift text without AI
 * This is the original implementation that uses regex patterns
 */
function fallbackParseShiftText(
    text: string,
    date?: string,
    organizationId?: string,
    prisma?: PrismaClient
): Promise<ParseShiftTextResult> {
    // Extract time patterns like "9am to 5pm" or "9-5"
    const timePattern =
        /(\d{1,2}(?::\d{2})?(?:am|pm)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?(?:am|pm)?)/i;
    const timeMatch = text.match(timePattern);

    let startTime = null;
    let endTime = null;

    if (timeMatch && timeMatch.length >= 3) {
        // Very basic time parsing - in a real implementation, this would be more robust
        startTime = timeMatch[1];
        endTime = timeMatch[2];

        // Convert to ISO string if possible
        if (date) {
            try {
                const dateObj = new Date(date);

                // Parse start time
                const startParts = startTime.match(
                    /(\d{1,2})(?::(\d{2}))?(?:(am|pm))?/i
                );
                if (startParts) {
                    let hours = parseInt(startParts[1]);
                    const minutes = startParts[2] ? parseInt(startParts[2]) : 0;
                    const ampm = startParts[3]?.toLowerCase();

                    // Adjust hours for AM/PM
                    if (ampm === 'pm' && hours < 12) hours += 12;
                    if (ampm === 'am' && hours === 12) hours = 0;

                    const startDate = new Date(dateObj);
                    startDate.setHours(hours, minutes, 0, 0);
                    startTime = startDate.toISOString();
                }

                // Parse end time
                const endParts = endTime.match(
                    /(\d{1,2})(?::(\d{2}))?(?:(am|pm))?/i
                );
                if (endParts) {
                    let hours = parseInt(endParts[1]);
                    const minutes = endParts[2] ? parseInt(endParts[2]) : 0;
                    const ampm = endParts[3]?.toLowerCase();

                    // Adjust hours for AM/PM
                    if (ampm === 'pm' && hours < 12) hours += 12;
                    if (ampm === 'am' && hours === 12) hours = 0;

                    const endDate = new Date(dateObj);
                    endDate.setHours(hours, minutes, 0, 0);
                    endTime = endDate.toISOString();
                }
            } catch (error) {
                // Silently handle time parsing errors and continue with unparsed times
                startTime = null;
                endTime = null;
            }
        }
    }

    // Extract location if mentioned
    let locationId = undefined;
    let locationName = undefined;

    // If prisma and organizationId are provided, try to match location names
    if (prisma && organizationId) {
        return (async () => {
            try {
                // Get all locations for the organization
                const locations = await prisma.location.findMany({
                    where: { organizationId },
                    select: { id: true, name: true },
                });

                // Try to find a location mentioned in the text
                for (const location of locations) {
                    if (
                        text.toLowerCase().includes(location.name.toLowerCase())
                    ) {
                        locationId = location.id;
                        locationName = location.name;
                        break;
                    }
                }
            } catch (error) {
                // Silently handle database errors and continue without a location
                locationId = undefined;
                locationName = undefined;
            }

            // Extract number of slots/people needed
            const slotsPattern =
                /(\d+)\s*(?:people|person|staff|employee|slot|position)/i;
            const slotsMatch = text.match(slotsPattern);
            const slots = slotsMatch ? parseInt(slotsMatch[1]) : undefined;

            // Generate a title based on the extracted information
            let title = 'New Shift';
            if (locationName) {
                title = `Shift at ${locationName}`;
            }
            if (startTime && endTime) {
                // For display purposes only, not using the ISO strings
                const displayStart = timeMatch ? timeMatch[1] : 'TBD';
                const displayEnd = timeMatch ? timeMatch[2] : 'TBD';
                title += ` (${displayStart}-${displayEnd})`;
            }

            // Return the parsed shift
            return {
                parsedShift: {
                    title,
                    startTime,
                    endTime,
                    date: date || new Date().toISOString(),
                    locationId,
                    notes: `Generated from text: "${text}"`,
                    slots,
                },
                // No entity matches for fallback parsing
                tokensUsed: 0, // No tokens used for fallback parsing
            };
        })();
    }

    // Extract number of slots/people needed
    const slotsPattern =
        /(\d+)\s*(?:people|person|staff|employee|slot|position)/i;
    const slotsMatch = text.match(slotsPattern);
    const slots = slotsMatch ? parseInt(slotsMatch[1]) : undefined;

    // Generate a title based on the extracted information
    let title = 'New Shift';
    if (locationName) {
        title = `Shift at ${locationName}`;
    }
    if (startTime && endTime) {
        // For display purposes only, not using the ISO strings
        const displayStart = timeMatch ? timeMatch[1] : 'TBD';
        const displayEnd = timeMatch ? timeMatch[2] : 'TBD';
        title += ` (${displayStart}-${displayEnd})`;
    }

    // Return the parsed shift
    return Promise.resolve({
        parsedShift: {
            title,
            startTime,
            endTime,
            date: date || new Date().toISOString(),
            locationId,
            notes: `Generated from text: "${text}"`,
            slots,
        },
        // No entity matches for fallback parsing
        tokensUsed: 0, // No tokens used for fallback parsing
    });
}

import { PrismaClient } from '@/generated/prisma';
import OpenAI from 'openai';

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

/**
 * Gets the OpenAI client instance, initializing it if necessary
 * @returns The OpenAI client instance or null if not configured
 */
function getOpenAIClient(): OpenAI | null {
    if (openaiClient) return openaiClient;
    process.env.OPENAI_API_KEY =
        'OPENAI_API_KEY=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';
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key') return null;

    openaiClient = new OpenAI({ apiKey });
    return openaiClient;
}

/**
 * Gets the OpenAI model to use for entity matching
 * @returns The model name to use
 */
function getOpenAIModel(): string {
    return (
        process.env.OPENAI_ENTITY_MATCHING_MODEL ||
        process.env.OPENAI_SHIFT_PARSER_MODEL ||
        'gpt-3.5-turbo'
    );
}

/**
 * Interface for entity match result
 */
export interface EntityMatch<T> {
    entity: T;
    confidence: number;
    isExactMatch: boolean;
}

/**
 * Interface for entity matching options
 */
export interface EntityMatchingOptions {
    threshold?: number;
    maxResults?: number;
    caseSensitive?: boolean;
}

/**
 * Interface for entity matching result
 */
export interface EntityMatchingResult<T> {
    bestMatch: EntityMatch<T> | null;
    potentialMatches: EntityMatch<T>[];
    needsCreation: boolean;
}

/**
 * Interface for all entity matching results
 */
export interface AllEntityMatchingResults {
    location: EntityMatchingResult<{
        id: string;
        name: string;
    }>;
    department: EntityMatchingResult<{
        id: string;
        name: string;
    }>;
    members: EntityMatchingResult<{
        id: string;
        name: string;
    }>[];
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a value between 0 (no similarity) and 1 (exact match)
 */
export function calculateStringSimilarity(
    str1: string,
    str2: string,
    caseSensitive = false
): number {
    if (!caseSensitive) {
        str1 = str1.toLowerCase();
        str2 = str2.toLowerCase();
    }

    // If either string is empty, return 0
    if (!str1.length || !str2.length) return 0;

    // If strings are identical, return 1
    if (str1 === str2) return 1;

    // Calculate Levenshtein distance
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = Array(len1 + 1)
        .fill(null)
        .map(() => Array(len2 + 1).fill(null));

    for (let i = 0; i <= len1; i++) {
        matrix[i][0] = i;
    }

    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1, // deletion
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);

    // Convert distance to similarity score (0 to 1)
    return 1 - distance / maxLength;
}

/**
 * Creates the system prompt for the AI model for entity matching
 * @returns The system prompt
 */
function createEntityMatchingSystemPrompt(): string {
    return `You are an entity matching assistant. Your task is to match a name with a list of possible entities and determine the best match.

You will receive a JSON object with the following structure:
{
  "nameToMatch": "string",
  "entities": [
    {
      "id": "string",
      "name": "string"
    }
  ]
}

Given this input, you need to:
1. Calculate the similarity between nameToMatch and each entity name
2. Determine if there's an exact match (case-insensitive)
3. Assign a confidence score (0.0 to 1.0) to each potential match
4. Identify the best match (highest confidence)
5. Determine if a new entity needs to be created

Guidelines:
- Consider spelling variations, abbreviations, and word order
- Assign higher confidence to closer matches
- Assign 1.0 confidence ONLY to exact matches (case-insensitive)
- An exact match means the strings are identical when compared case-insensitively
- For example, "Downtown" is NOT an exact match for "Downtown Store" (it's a partial match)
- "Downtown Store" IS an exact match for "downtown store" (case-insensitive)
- Suggest creating a new entity if no good match is found (confidence < 0.7)

Respond with a JSON object containing the matches in the following format:
{
  "matches": [
    {
      "entityId": "string",
      "entityName": "string",
      "confidence": number,
      "isExactMatch": boolean
    }
  ],
  "needsCreation": boolean
}`;
}

/**
 * Match a name with a list of entities using LLM
 */
async function matchEntityNameWithLLM<T extends { id: string; name: string }>(
    name: string,
    entities: T[],
    options: EntityMatchingOptions = {}
): Promise<EntityMatchingResult<T>> {
    const { threshold = 0.7, maxResults = 5, caseSensitive = false } = options;

    const client = getOpenAIClient();
    if (!client) {
        // Fall back to traditional matching if OpenAI is not available
        return matchEntityNameWithSimilarity(name, entities, options);
    }

    try {
        // Create a structured input for the AI
        const structuredInput = {
            nameToMatch: name,
            entities: entities.map((e) => ({ id: e.id, name: e.name })),
        };

        // Call the OpenAI API with structured input
        const response = await client.chat.completions.create({
            model: getOpenAIModel(),
            messages: [
                { role: 'system', content: createEntityMatchingSystemPrompt() },
                {
                    role: 'user',
                    content: JSON.stringify(structuredInput),
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
        const parsedResponse = JSON.parse(content) as {
            matches: Array<{
                entityId: string;
                entityName: string;
                confidence: number;
                isExactMatch: boolean;
            }>;
            needsCreation: boolean;
        };

        // Convert the response to the expected format
        const matches: EntityMatch<T>[] = parsedResponse.matches
            .filter((match) => match.confidence >= threshold)
            .map((match) => {
                const entity = entities.find((e) => e.id === match.entityId);
                if (!entity) {
                    throw new Error(
                        `Entity with ID ${match.entityId} not found`
                    );
                }
                return {
                    entity,
                    confidence: match.confidence,
                    isExactMatch: match.isExactMatch,
                };
            })
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, maxResults);

        // Find the best match (highest confidence)
        const bestMatch = matches.length > 0 ? matches[0] : null;

        return {
            bestMatch,
            potentialMatches: matches,
            needsCreation: parsedResponse.needsCreation,
        };
    } catch (error) {
        console.error('Error matching entity name with LLM:', error);
        // Fall back to traditional matching if LLM fails
        return matchEntityNameWithSimilarity(name, entities, options);
    }
}

/**
 * Match a name with a list of entities using string similarity
 */
function matchEntityNameWithSimilarity<T extends { id: string; name: string }>(
    name: string,
    entities: T[],
    options: EntityMatchingOptions = {}
): EntityMatchingResult<T> {
    const { threshold = 0.7, maxResults = 5, caseSensitive = false } = options;

    // Calculate similarity for each entity
    const matches: EntityMatch<T>[] = entities
        .map((entity) => {
            const similarity = calculateStringSimilarity(
                name,
                entity.name,
                caseSensitive
            );
            const isExactMatch = !caseSensitive
                ? entity.name.toLowerCase() === name.toLowerCase()
                : entity.name === name;

            return {
                entity,
                confidence: similarity,
                isExactMatch,
            };
        })
        .filter((match) => match.confidence >= threshold)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxResults);

    // Find the best match (highest confidence)
    const bestMatch = matches.length > 0 ? matches[0] : null;

    // Determine if a new entity needs to be created
    const needsCreation = !bestMatch || bestMatch.confidence < 0.9;

    return {
        bestMatch,
        potentialMatches: matches,
        needsCreation,
    };
}

/**
 * Match a name with a list of entities
 * Uses LLM if available, otherwise falls back to string similarity
 */
async function matchEntityName<T extends { id: string; name: string }>(
    name: string,
    entities: T[],
    options: EntityMatchingOptions = {}
): Promise<EntityMatchingResult<T>> {
    // If OpenAI is configured, use LLM matching
    const client = getOpenAIClient();
    if (client) {
        return matchEntityNameWithLLM(name, entities, options);
    }

    // Otherwise, fall back to traditional matching
    return matchEntityNameWithSimilarity(name, entities, options);
}

/**
 * Match location name with existing locations
 */
export async function matchLocation(
    locationName: string | undefined,
    organizationId: string,
    prisma: PrismaClient,
    options: EntityMatchingOptions = {}
): Promise<EntityMatchingResult<{ id: string; name: string }>> {
    if (!locationName) {
        return {
            bestMatch: null,
            potentialMatches: [],
            needsCreation: false,
        };
    }

    try {
        // Get all locations for the organization
        const locations = await prisma.location.findMany({
            where: { organizationId },
            select: { id: true, name: true },
        });

        // Match the location name with existing locations
        return await matchEntityName(locationName, locations, options);
    } catch (error) {
        console.error('Error matching location:', error);
        return {
            bestMatch: null,
            potentialMatches: [],
            needsCreation: true,
        };
    }
}

/**
 * Match department name with existing departments
 */
export async function matchDepartment(
    departmentName: string | undefined,
    organizationId: string,
    prisma: PrismaClient,
    options: EntityMatchingOptions = {}
): Promise<EntityMatchingResult<{ id: string; name: string }>> {
    if (!departmentName) {
        return {
            bestMatch: null,
            potentialMatches: [],
            needsCreation: false,
        };
    }

    try {
        // Get all departments for the organization
        const departments = await prisma.department.findMany({
            where: { organizationId },
            select: { id: true, name: true },
        });

        // Match the department name with existing departments
        return await matchEntityName(departmentName, departments, options);
    } catch (error) {
        console.error('Error matching department:', error);
        return {
            bestMatch: null,
            potentialMatches: [],
            needsCreation: true,
        };
    }
}

/**
 * Match member names with existing members
 */
export async function matchMembers(
    memberNames: string[] | undefined,
    organizationId: string,
    prisma: PrismaClient,
    options: EntityMatchingOptions = {}
): Promise<EntityMatchingResult<{ id: string; name: string }>[]> {
    if (!memberNames || memberNames.length === 0) {
        return [];
    }

    try {
        // Get all members for the organization
        const members = await prisma.member.findMany({
            where: {
                organizationId,
                name: { not: null }, // Only get members with names
            },
            select: { id: true, name: true },
        });

        // Filter out members with null names and cast to the expected type
        const validMembers = members.filter(
            (member): member is { id: string; name: string } =>
                member.name !== null && member.name !== undefined
        );

        // Match each member name with existing members
        const results = [];
        for (const name of memberNames) {
            results.push(await matchEntityName(name, validMembers, options));
        }
        return results;
    } catch (error) {
        console.error('Error matching members:', error);
        return memberNames.map(() => ({
            bestMatch: null,
            potentialMatches: [],
            needsCreation: true,
        }));
    }
}

/**
 * Match all entities in the parsed shift data
 */
export async function matchAllEntities(
    locationName: string | undefined,
    departmentName: string | undefined,
    assigneeNames: string[] | undefined,
    organizationId: string,
    prisma: PrismaClient,
    options: EntityMatchingOptions = {}
): Promise<AllEntityMatchingResults> {
    // Match location
    const locationResult = await matchLocation(
        locationName,
        organizationId,
        prisma,
        options
    );

    // Match department
    const departmentResult = await matchDepartment(
        departmentName,
        organizationId,
        prisma,
        options
    );

    // Match members
    const membersResults = await matchMembers(
        assigneeNames,
        organizationId,
        prisma,
        options
    );

    return {
        location: locationResult,
        department: departmentResult,
        members: membersResults,
    };
}

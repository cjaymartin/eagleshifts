import { memberProcedure, router } from '@/server/trpc';
import { z } from 'zod';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { zodToJsonSchema } from "zod-to-json-schema";
import { calculateSimilarity } from '@/utils/stringUtils';

const LLMShiftSchema = z.object({
    title: z.string().describe("The main subject or name of the shift (e.g., 'First Aid', 'Bartender'). Almost always present."),
    startTime: z.string().nullable().describe("The start time of the shift in ISO 8601 format (HH:mm:ss), or null if not found."),
    endTime: z.string().nullable().describe("The end time of the shift in ISO 8601 format (HH:mm:ss), or null if not found."),
    date: z.string().describe("The date of the shift in ISO 8601 format (YYYY-MM-DD). Use today's date if no date is specified."),
    location: z.string().nullable().describe("The location or venue mentioned in the text."),
    notes: z.string().nullable().describe("Secondary details only. Rarely used."),
    slots: z.union([z.number(), z.string()])
        .nullable()
        .describe("The number of people/slots required for the shift."),
    department: z.string().nullable().describe("The department mentioned (e.g., 'Marketing', 'Warehouse')."),
    assignees: z.array(z.string()).nullable().describe("A list of names or roles assigned to the shift."),
});

const ParsedShiftSchema = LLMShiftSchema.extend({
    locationId: z.string().nullable().optional().describe("The ID of the matched location."),
    locationConfidence: z.number().optional().describe("The confidence score of the location match (0-1)."),
});

// Determine provider
const provider = process.env.AI_PROVIDER?.toLowerCase() || 'openai';

export const aiRouter = router({
    parseShift: memberProcedure
        .input(
            z.object({
                input: z.string(),
                defaultDate: z.string().optional().describe("The default date to use for relative dates (YYYY-MM-DD). Defaults to today."),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const referenceDate = input.defaultDate || new Date().toISOString().split('T')[0];
            const systemPrompt = `You are an expert shift parser. Your task is to extract all relevant shift details from the user's freeform text and strictly output them in the specified JSON format.
                - The input text almost always contains a Title. It is the main subject of the text.
                - Prioritize extracting a Title over Notes. Only use Notes for extra details that clearly do not belong in other fields.
                - Avoid generic terms like 'Shift' for the Title unless no other suitable subject is found.
                - Never use 'extract' as a Title.
                - If a date is relative (e.g., 'tomorrow', 'next Monday'), use the reference date (${referenceDate}) as the starting point to resolve it into YYYY-MM-DD.
                  - Use 24-hour time for startTime/endTime.`;

            let parsedShift: z.infer<typeof ParsedShiftSchema>;

            if (provider === 'llama') {
                const modelName = process.env.OLLAMA_MODEL || 'llama3';
                const supportsTools = modelName.includes('3.1') || modelName.includes('3.2') || modelName.includes('mistral') || modelName.includes('firefunction');

                if (supportsTools) {
                    // Use native tool calling for supported models
                    const model = new ChatOllama({
                        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
                        model: modelName,
                        temperature: 0,
                    });
                    // Use the flat schema directly
                    const structuredOutputModel = model.withStructuredOutput(LLMShiftSchema);
                    const messages = [
                        new HumanMessage({
                            content: systemPrompt + '\n\nText to parse:\n' + input.input,
                        }),
                    ];
                    // The result will be the parsed object directly
                    parsedShift = await structuredOutputModel.invoke(messages);
                } else {
                    // Fallback to JSON mode for Llama 3 and others
                    const model = new ChatOllama({
                        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
                        model: modelName,
                        temperature: 0,
                        format: "json",
                    });

                    // Use the flat schema directly
                    // Cast to any to avoid version mismatch lint errors with zod-to-json-schema
                    const jsonSchema = zodToJsonSchema(LLMShiftSchema as any);
                    const schemaString = JSON.stringify(jsonSchema, null, 2);

                    const messages = [
                        new SystemMessage({
                            content: `${systemPrompt}\n\nYou must respond with valid JSON strictly matching this schema:\n${schemaString}`,
                        }),
                        new HumanMessage({
                            content: input.input,
                        }),
                    ];

                    console.log("SENDING OLLAMA");
                    const response = await model.invoke(messages);
                    try {
                        const parsed = JSON.parse(response.content as string);
                        // Validate with Zod
                        parsedShift = LLMShiftSchema.parse(parsed);
                    } catch (e) {
                        console.error("Failed to parse Llama JSON output:", response.content);
                        throw new Error("Failed to parse AI response. Please try again.");
                    }
                }

            } else {
                // OpenAI supports native structured output (tool calling)
                const model = new ChatOpenAI({
                    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                });
                // Use the flat schema directly
                const structuredOutputModel = model.withStructuredOutput(LLMShiftSchema);

                console.log("SENDING OPENAI");
                const messages = [
                    new HumanMessage({
                        content: systemPrompt + '\n\nText to parse:\n' + input.input,
                    }),
                ];
                

                parsedShift = await structuredOutputModel.invoke(messages);
            }

            // Post-processing for location matching
            if (parsedShift.location) {
                const locations = await ctx.prisma.location.findMany({
                    where: {
                        organizationId: ctx.user.organizationId,
                    },
                    select: {
                        id: true,
                        name: true,
                    },
                });

                let bestMatch = null;
                let bestScore = 0;

                for (const loc of locations) {
                    const score = calculateSimilarity(parsedShift.location, loc.name);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = loc;
                    }
                }

                parsedShift.locationConfidence = bestScore;
                if (bestMatch && bestScore > 0.8) {
                    parsedShift.locationId = bestMatch.id;
                    parsedShift.location = bestMatch.name; // Normalize name
                } else {
                    parsedShift.locationId = null;
                }
            } else {
                parsedShift.locationId = null;
                parsedShift.locationConfidence = 0;
            }

            return parsedShift;
        })
});

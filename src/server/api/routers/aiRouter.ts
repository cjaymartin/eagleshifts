import { memberProcedure, router } from '@/server';
import { z } from 'zod';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { zodToJsonSchema } from "zod-to-json-schema";

const ParsedShiftSchema = z.object({
    title: z.string().describe("A concise title for the shift (e.g., 'Opening Shift', 'Client Meeting')."),
    startTime: z.string().nullable().describe("The start time of the shift in ISO 8601 format (HH:mm:ss), or null if not found."),
    endTime: z.string().nullable().describe("The end time of the shift in ISO 8601 format (HH:mm:ss), or null if not found."),
    date: z.string().describe("The date of the shift in ISO 8601 format (YYYY-MM-DD). Use today's date if no date is specified."),
    location: z.string().nullable().describe("The location or venue mentioned in the text."),
    notes: z.string().nullable().describe("Any remaining descriptive text or details."),
    slots: z.union([z.number(), z.string()])
        .nullable()
        .describe("The number of people/slots required for the shift."),
    department: z.string().nullable().describe("The department mentioned (e.g., 'Marketing', 'Warehouse')."),
    assignees: z.array(z.string()).nullable().describe("A list of names or roles assigned to the shift."),
});

// Determine provider
const provider = process.env.AI_PROVIDER?.toLowerCase() || 'openai';

export const aiRouter = router({
    parseShift: memberProcedure
        .input(
            z.object({
                input: z.string()
            })
        )
        .mutation(async ({ ctx, input }) => {
            const systemPrompt = `You are an expert shift parser. Your task is to extract all relevant shift details from the user's freeform text and strictly output them in the specified JSON format.
                - If a date is relative (e.g., 'tomorrow', 'next Monday'), use the current date (${new Date().toISOString().split('T')[0]}) as the reference point to resolve it into YYYY-MM-DD.
                  - Use 24-hour time for startTime/endTime.`;

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
                    const structuredOutputModel = model.withStructuredOutput(ParsedShiftSchema);
                    const messages = [
                        new HumanMessage({
                            content: systemPrompt + '\n\nText to parse:\n' + input.input,
                        }),
                    ];
                    // The result will be the parsed object directly
                    return await structuredOutputModel.invoke(messages);
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
                    const jsonSchema = zodToJsonSchema(ParsedShiftSchema as any);
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
                        return ParsedShiftSchema.parse(parsed);
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
                const structuredOutputModel = model.withStructuredOutput(ParsedShiftSchema);

                console.log("SENDING OPENAI");
                const messages = [
                    new HumanMessage({
                        content: systemPrompt + '\n\nText to parse:\n' + input.input,
                    }),
                ];
                

                return await structuredOutputModel.invoke(messages);
            }
        })
});

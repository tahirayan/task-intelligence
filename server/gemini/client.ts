import {
  type FunctionCall,
  type FunctionDeclarationSchema,
  type FunctionDeclarationsTool,
  type GenerativeModel,
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";
import type { AgentTool } from "../../shared/types";

let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
        // @ts-expect-error — thinkingConfig not yet typed in SDK but supported by the model
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
  }

  return model;
}

// Use streaming so the connection stays alive for large responses and there is
// no fixed hard timeout. Tokens arrive incrementally; we accumulate and parse
// at the end.
export async function callGemini(
  prompt: string
): Promise<{ json: unknown; rawText: string }> {
  const { stream } = await getModel().generateContentStream(prompt);

  let rawText = "";
  for await (const chunk of stream) {
    rawText += chunk.text();
  }

  try {
    return { json: JSON.parse(rawText), rawText };
  } catch {
    return { json: null, rawText };
  }
}

export async function callGeminiWithTools(
  prompt: string,
  tools: AgentTool[]
): Promise<{ json: unknown; rawText: string; functionCalls: FunctionCall[] }> {
  const geminiTools: FunctionDeclarationsTool[] = [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: {
          type: SchemaType.OBJECT,
          properties: t.parameters as FunctionDeclarationSchema["properties"],
          required: Object.keys(t.parameters),
        } satisfies FunctionDeclarationSchema,
      })),
    },
  ];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const toolModel = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: {
      temperature: 0.3,
      // @ts-expect-error — thinkingConfig not yet typed in SDK but supported by the model
      thinkingConfig: { thinkingBudget: 0 },
    },
    tools: geminiTools,
  });

  const result = await toolModel.generateContent(prompt);

  const response = result.response;
  const text = response.text();
  const functionCalls = response.functionCalls() ?? [];

  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // If parsing fails, json stays null and validation will handle it.
  }

  return { json, rawText: text, functionCalls };
}

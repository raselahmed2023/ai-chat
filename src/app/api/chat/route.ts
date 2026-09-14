import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { frontendTools } from "@/lib/tools/frontend-analysis";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `
You are a helpful frontend engineering assistant.

When the user asks you to:
- analyze a frontend skill
- give a frontend skill score
- assess their knowledge
- identify frontend strengths
- recommend what they should improve

you should use the analyzeFrontendSkill tool.

When using the tool:
- infer the topic from the user's request
- infer beginner, intermediate, or advanced when reasonable
- if the level is unclear, use intermediate

After the tool returns structured output, briefly explain the result.
`;

export async function POST(request: Request): Promise<Response> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error: "AI service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("messages" in body)
    ) {
      return Response.json(
        {
          error: "Invalid request.",
        },
        {
          status: 400,
        }
      );
    }

    const messages = (body as { messages: UIMessage[] }).messages;

    if (!Array.isArray(messages)) {
      return Response.json(
        {
          error: "Messages must be an array.",
        },
        {
          status: 400,
        }
      );
    }

    const google = createGoogleGenerativeAI({
      apiKey,
    });

    const modelName =
      process.env.GEMINI_MODEL || "gemini-3.6-flash";

    const result = streamText({
      model: google(modelName),

      system: SYSTEM_PROMPT,

      messages: await convertToModelMessages(messages, {
        tools: frontendTools,
      }),

      tools: frontendTools,

      // Lets the model return text after the tool result.
      stopWhen: stepCountIs(5),

      abortSignal: request.signal,
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error("AI stream error:", error);

        return "The AI request could not be completed.";
      },
    });
  } catch (error) {
    console.error("Chat route error:", error);

    return Response.json(
      {
        error: "Failed to process chat request.",
      },
      {
        status: 500,
      }
    );
  }
}
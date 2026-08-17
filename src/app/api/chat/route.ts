/**
 * POST /api/chat
 *
 * Streaming chat endpoint for the AI chat application.
 *
 * Request body:
 * {
 *   messages: Array<{
 *     role: "user" | "assistant";
 *     content: string;
 *   }>
 * }
 *
 * Response: Server-sent text/plain stream of assistant text chunks
 */

import { NextRequest, NextResponse } from "next/server";
import { Message } from "@/lib/ai-config";
import { streamGeminiResponse } from "@/lib/gemini";
import { streamOpenRouterResponse } from "@/lib/openrouter";

/**
 * Validates that the request body contains a valid messages array.
 */
function validateMessages(messages: unknown): messages is Message[] {
  if (!Array.isArray(messages)) {
    return false;
  }

  return messages.every(
    (msg) =>
      typeof msg === "object" &&
      msg !== null &&
      (msg as Record<string, unknown>).role === "user" ||
      (msg as Record<string, unknown>).role === "assistant" &&
      typeof (msg as Record<string, unknown>).content === "string"
  );
}

/**
 * Handles POST requests to the chat endpoint.
 * Streams AI responses in real-time using fallback provider logic.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Parse and validate the request body
    const body = await request.json() as unknown;

    if (
      !body ||
      typeof body !== "object" ||
      !("messages" in body)
    ) {
      return NextResponse.json(
        { error: "Missing messages field in request body" },
        { status: 400 }
      );
    }

    const messages = (body as Record<string, unknown>).messages;

    if (!validateMessages(messages)) {
      return NextResponse.json(
        {
          error:
            "Invalid messages format. Expected array of {role: 'user'|'assistant', content: string}",
        },
        { status: 400 }
      );
    }

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array cannot be empty" },
        { status: 400 }
      );
    }

    // Create a ReadableStream that handles the fallback logic
    const stream = new ReadableStream<string>({
      async start(controller) {
        let hasEmittedOutput = false;

        try {
          // Try Gemini first
          try {
            for await (const chunk of streamGeminiResponse(messages)) {
              // Check if request was cancelled
              if (request.signal.aborted) {
                controller.close();
                return;
              }

              hasEmittedOutput = true;
              controller.enqueue(chunk);
            }

            // Gemini succeeded, we're done
            controller.close();
            return;
          } catch (geminiError) {
            // If Gemini failed before emitting output, try OpenRouter
            if (!hasEmittedOutput) {
              try {
                for await (const chunk of streamOpenRouterResponse(messages)) {
                  // Check if request was cancelled
                  if (request.signal.aborted) {
                    controller.close();
                    return;
                  }

                  controller.enqueue(chunk);
                }

                // OpenRouter succeeded, we're done
                controller.close();
                return;
              } catch (openrouterError) {
                // Both providers failed
                const errorMsg =
                  openrouterError instanceof Error
                    ? openrouterError.message
                    : "Unknown error";
                controller.error(new Error(`All providers failed: ${errorMsg}`));
                return;
              }
            } else {
              // Gemini failed after emitting output, don't start OpenRouter
              // to avoid duplicating the partial response
              const errorMsg =
                geminiError instanceof Error
                  ? geminiError.message
                  : "Unknown error";
              controller.error(
                new Error(
                  `Gemini stream interrupted: ${errorMsg}. Response was partially streamed.`
                )
              );
              return;
            }
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          controller.error(new Error(`Stream error: ${errorMsg}`));
        }
      },
    });

    // Return the stream as text/plain with appropriate headers
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    // Handle JSON parsing errors and other unexpected issues
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      { error: "Failed to process request" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  }
}

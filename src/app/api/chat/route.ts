import { NextRequest, NextResponse } from "next/server";
import { Message } from "@/lib/ai-config";
import { streamGeminiResponse } from "@/lib/gemini";
import { streamOpenRouterResponse } from "@/lib/openrouter";

function validateMessages(messages: unknown): messages is Message[] {
  if (!Array.isArray(messages)) {
    return false;
  }

  return messages.every((msg) => {
    if (typeof msg !== "object" || msg === null) {
      return false;
    }

    const record = msg as Record<string, unknown>;

    return (
      (record.role === "user" || record.role === "assistant") &&
      typeof record.content === "string" &&
      record.content.trim().length > 0
    );
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
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
            "Invalid messages format. Expected { role: 'user' | 'assistant', content: string }",
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

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let hasEmittedOutput = false;

        try {
          try {
            // Primary provider: Gemini
            for await (const chunk of streamGeminiResponse(messages)) {
              if (request.signal.aborted) {
                controller.close();
                return;
              }

              if (!chunk) {
                continue;
              }

              hasEmittedOutput = true;

              // Response streams must emit bytes, not raw strings.
              controller.enqueue(encoder.encode(chunk));
            }

            controller.close();
            return;
          } catch (geminiError) {
            console.error("Gemini provider failed:", geminiError);

            // Only fallback when Gemini has not already streamed content.
            if (!hasEmittedOutput) {
              try {
                for await (const chunk of streamOpenRouterResponse(messages)) {
                  if (request.signal.aborted) {
                    controller.close();
                    return;
                  }

                  if (!chunk) {
                    continue;
                  }

                  controller.enqueue(encoder.encode(chunk));
                }

                controller.close();
                return;
              } catch (openrouterError) {
                console.error(
                  "OpenRouter fallback failed:",
                  openrouterError
                );

                controller.enqueue(
                  encoder.encode(
                    "\nSorry, the AI service is temporarily unavailable."
                  )
                );
                controller.close();
                return;
              }
            }

            // Gemini failed after partial content was already streamed.
            controller.close();
            return;
          }
        } catch (error) {
          console.error("Unexpected streaming error:", error);

          controller.enqueue(
            encoder.encode(
              "\nSorry, an unexpected streaming error occurred."
            )
          );

          controller.close();
        }
      },

      cancel() {
        // The request signal is checked while streaming.
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Failed to process chat request:", error);

    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
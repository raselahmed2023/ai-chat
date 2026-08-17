import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type LanguageModel,
  type ModelMessage,
  type UIMessage,
} from "ai";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

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

use the analyzeFrontendSkill tool.

When using the tool:
- infer the frontend topic
- infer beginner, intermediate, or advanced when reasonable
- if the level is unclear, use intermediate

After a successful tool result, keep the text explanation short because
the structured result is already rendered in the UI.
`;

function getLatestUserText(messages: UIMessage[]): string {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  if (!latestUserMessage) {
    return "";
  }

  return latestUserMessage.parts
    .filter(
      (
        part
      ): part is Extract<
        (typeof latestUserMessage.parts)[number],
        { type: "text" }
      > => part.type === "text"
    )
    .map((part) => part.text)
    .join(" ")
    .trim()
    .toLowerCase();
}

export async function POST(
  request: Request
): Promise<Response> {
  try {
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

    const messages = (
      body as {
        messages: UIMessage[];
      }
    ).messages;

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

    if (messages.length === 0) {
      return Response.json(
        {
          error: "Messages cannot be empty.",
        },
        {
          status: 400,
        }
      );
    }

    const latestText = getLatestUserText(messages);

    /*
     * =========================================
     * FE-08 SABOTAGE CASE 1
     * Simulated rate-limit error
     * =========================================
     */
    if (latestText.includes("test rate limit")) {
      return Response.json(
        {
          error:
            "Rate limit exceeded. Please wait a moment and retry.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "5",
          },
        }
      );
    }

    /*
     * =========================================
     * FE-08 SABOTAGE CASE 2
     * Simulated slow response
     * =========================================
     */
    if (latestText.includes("test slow response")) {
      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          // Keep request pending so ChatSkeleton is visible.
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 4000);
          });

          const textId = "fe08-slow-response";

          writer.write({
            type: "text-start",
            id: textId,
          });

          writer.write({
            type: "text-delta",
            id: textId,
            delta:
              "The response was intentionally delayed to demonstrate the slow-response loading state.",
          });

          writer.write({
            type: "text-end",
            id: textId,
          });
        },

        onError: (error) => {
          console.error(
            "Slow-response test error:",
            error
          );

          return "The delayed response could not be completed.";
        },
      });

      return createUIMessageStreamResponse({
        stream,
      });
    }

    /*
     * =========================================
     * FE-08 SABOTAGE CASE 3
     * Simulated mid-stream failure
     * =========================================
     */
    if (latestText.includes("test stream failure")) {
      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          const textId = "fe08-stream-failure";

          writer.write({
            type: "text-start",
            id: textId,
          });

          writer.write({
            type: "text-delta",
            id: textId,
            delta:
              "I started generating this response successfully. ",
          });

          await new Promise<void>((resolve) => {
            setTimeout(resolve, 900);
          });

          writer.write({
            type: "text-delta",
            id: textId,
            delta:
              "This partial response should remain visible after the stream fails.",
          });

          await new Promise<void>((resolve) => {
            setTimeout(resolve, 900);
          });

          throw new Error(
            "Intentional FE-08 mid-stream failure"
          );
        },

        onError: (error) => {
          console.error(
            "Intentional stream failure:",
            error
          );

          return "The AI response was interrupted during streaming.";
        },
      });

      return createUIMessageStreamResponse({
        stream,
      });
    }

    /*
     * =========================================
     * REAL AI PROVIDERS
     *
     * Primary  : Gemini
     * Fallback : Groq
     * =========================================
     */

    const geminiApiKey =
      process.env.GEMINI_API_KEY;

    const groqApiKey =
      process.env.GROQ_API_KEY;

    if (!geminiApiKey && !groqApiKey) {
      return Response.json(
        {
          error:
            "No AI provider is configured.",
        },
        {
          status: 500,
        }
      );
    }

    const modelMessages: ModelMessage[] =
      await convertToModelMessages(messages, {
        tools: frontendTools,
      });

    const geminiModelName =
      process.env.GEMINI_MODEL ||
      "gemini-3.6-flash";

    const groqModelName =
      process.env.GROQ_MODEL ||
     "openai/gpt-oss-20b";

    const google = geminiApiKey
      ? createGoogleGenerativeAI({
          apiKey: geminiApiKey,
        })
      : null;

    const groq = groqApiKey
      ? createGroq({
          apiKey: groqApiKey,
        })
      : null;

    /*
     * We wrap both providers inside one UI message stream.
     *
     * Gemini is attempted first.
     *
     * If Gemini fails BEFORE meaningful output reaches
     * the user, the buffered Gemini chunks are discarded
     * and Groq starts instead.
     *
     * If Gemini already streamed meaningful content,
     * Groq is NOT started because doing so could duplicate
     * or corrupt the assistant response.
     */
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const runProvider = async (
          model: LanguageModel,
          providerName: "Gemini" | "Groq"
        ): Promise<boolean> => {
          const result = streamText({
            model,

            system: SYSTEM_PROMPT,

            messages: modelMessages,

            tools: frontendTools,

            stopWhen: stepCountIs(5),

            abortSignal: request.signal,

            // Avoid consuming extra quota with automatic
            // retries before switching providers.
            maxRetries: 0,

            onError: (error) => {
              console.error(
                `${providerName} generation error:`,
                error
              );
            },
          });

          const providerStream =
            result.toUIMessageStream({
              onError: (error) => {
                console.error(
                  `${providerName} UI stream error:`,
                  error
                );

                return `${providerName} provider failed.`;
              },
            });

          /*
           * Buffer initial control chunks.
           *
           * This prevents a failed Gemini stream from
           * partially opening a response before Groq
           * takes over.
           */
          const bufferedChunks: Parameters<
            typeof writer.write
          >[0][] = [];

          let hasMeaningfulOutput = false;

          const controlChunkTypes = new Set<string>([
            "start",
            "finish",
            "start-step",
            "finish-step",
          ]);

          try {
            for await (const chunk of providerStream) {
              /*
               * Provider failed before any useful output.
               * Do not forward this error to the browser;
               * allow the caller to try the fallback.
               */
              if (
                !hasMeaningfulOutput &&
                chunk.type === "error"
              ) {
                console.warn(
                  `${providerName} failed before output.`
                );

                return false;
              }

              if (!hasMeaningfulOutput) {
                bufferedChunks.push(chunk);

                /*
                 * text-start/text-delta/tool input/etc.
                 * mean the provider has committed to
                 * producing a real response.
                 */
                if (
                  !controlChunkTypes.has(
                    chunk.type
                  )
                ) {
                  hasMeaningfulOutput = true;

                  for (const bufferedChunk of bufferedChunks) {
                    writer.write(bufferedChunk);
                  }

                  bufferedChunks.length = 0;
                }

                continue;
              }

              /*
               * Once content has started, forward every
               * later chunk—including tool states/errors.
               */
              writer.write(chunk);
            }

            /*
             * No meaningful output at all.
             * Treat this as a provider failure so fallback
             * may run.
             */
            if (!hasMeaningfulOutput) {
              console.warn(
                `${providerName} completed without usable output.`
              );

              return false;
            }

            return true;
          } catch (error) {
            console.error(
              `${providerName} stream crashed:`,
              error
            );

            /*
             * Fallback is only safe before output has
             * reached the client.
             */
            if (!hasMeaningfulOutput) {
              return false;
            }

            throw error;
          }
        };

        /*
         * =========================
         * PRIMARY: GEMINI
         * =========================
         */

        if (google) {
          const geminiSucceeded =
            await runProvider(
              google(geminiModelName),
              "Gemini"
            );

          if (geminiSucceeded) {
            return;
          }

          console.warn(
            "Gemini unavailable. Switching to Groq fallback."
          );
        }

        /*
         * =========================
         * FALLBACK: GROQ
         * =========================
         */

        if (groq) {
          const groqSucceeded =
            await runProvider(
              groq(groqModelName),
              "Groq"
            );

          if (groqSucceeded) {
            return;
          }
        }

        /*
         * Both providers failed before producing output.
         */
        throw new Error(
          "All configured AI providers are currently unavailable."
        );
      },

      onError: (error) => {
        console.error(
          "Final AI provider error:",
          error
        );

        return "Both AI providers are currently unavailable. Please try again shortly.";
      },
    });

    return createUIMessageStreamResponse({
      stream,

      headers: {
        "Cache-Control":
          "no-cache, no-store, must-revalidate",

        // Helps preserve streaming through some proxies.
        "Content-Encoding": "none",
      },
    });
  } catch (error) {
    console.error(
      "Chat route error:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to process chat request.",
      },
      {
        status: 500,
      }
    );
  }
}
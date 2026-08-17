/**
 * OpenRouter AI Provider
 *
 * This module handles streaming responses from OpenRouter.
 * It is the fallback provider, used only if Gemini fails before any output is streamed.
 */

import { OPENROUTER_CONFIG, SYSTEM_PROMPT, Message } from "./ai-config";

/**
 * Stream a response from OpenRouter.
 *
 * @param messages - The conversation history including the user's latest input
 * @yields Text deltas from the AI response as they arrive
 * @throws Error if the API key is missing or the request fails
 */
export async function* streamOpenRouterResponse(
  messages: Message[]
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is not set. " +
        "Please configure your OpenRouter API key in .env.local"
    );
  }

  if (!OPENROUTER_CONFIG.model) {
    throw new Error(
      "OPENROUTER_MODEL environment variable is not set. " +
        "Please configure your OpenRouter model in .env.local"
    );
  }

  // Prepare the request payload
  const requestBody = {
    model: OPENROUTER_CONFIG.model,
    messages: [
      {
        role: "system" as const,
        content: SYSTEM_PROMPT,
      },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ],
    stream: true,
  };

  try {
    const response = await fetch(OPENROUTER_CONFIG.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401) {
        throw new Error("OpenRouter authentication failed. Invalid API key.");
      }
      if (response.status === 429) {
        throw new Error("OpenRouter rate limit exceeded. Please try again later.");
      }
      if (response.status === 500 || response.status === 503) {
        throw new Error("OpenRouter service temporarily unavailable.");
      }
      throw new Error(
        `OpenRouter returned status ${response.status}. Please try again later.`
      );
    }

    if (!response.body) {
      throw new Error("OpenRouter response has no body");
    }

    // Parse the SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines[lines.length - 1]; // Keep incomplete line in buffer

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();

          // Skip empty lines and comments
          if (!line || line.startsWith(":")) {
            continue;
          }

          // Check for [DONE] marker
          if (line === "data: [DONE]") {
            return;
          }

          // Parse SSE data line
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6); // Remove "data: " prefix

            try {
              // Handle malformed JSON safely
              const parsed = JSON.parse(jsonStr);

              if (
                parsed.choices &&
                parsed.choices[0] &&
                parsed.choices[0].delta &&
                parsed.choices[0].delta.content
              ) {
                yield parsed.choices[0].delta.content;
              }
            } catch {
              // Silently ignore malformed chunks
              // This can happen with incomplete JSON at stream boundaries
              continue;
            }
          }
        }
      }

      // Process any remaining content in the buffer
      if (buffer.trim() && buffer.trim().startsWith("data: ")) {
        const jsonStr = buffer.trim().slice(6);
        try {
          const parsed = JSON.parse(jsonStr);
          if (
            parsed.choices &&
            parsed.choices[0] &&
            parsed.choices[0].delta &&
            parsed.choices[0].delta.content
          ) {
            yield parsed.choices[0].delta.content;
          }
        } catch {
          // Silently ignore malformed chunks
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    // Re-throw error handling errors, wrap unknown errors
    if (error instanceof Error) {
      if (
        error.message.includes("OPENROUTER") ||
        error.message.includes("authentication") ||
        error.message.includes("rate limit") ||
        error.message.includes("service")
      ) {
        throw error; // Re-throw expected errors
      }
      throw new Error(`OpenRouter request failed: ${error.message}`);
    }
    throw new Error("OpenRouter request failed with an unknown error");
  }
}

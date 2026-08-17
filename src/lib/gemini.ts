/**
 * Google Gemini AI Provider
 *
 * This module handles streaming responses from Google Gemini.
 * It is the primary provider for the chat application.
 */

import { GoogleGenAI } from "@google/genai";
import { GEMINI_CONFIG, SYSTEM_PROMPT, Message } from "./ai-config";

/**
 * Initialize the Gemini client with the API key from environment variables.
 * This is only called on the server-side.
 */
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. " +
        "Please configure your Gemini API key in .env.local"
    );
  }

  return new GoogleGenAI({ apiKey });
}

/**
 * Convert a message array into Gemini's format.
 * Gemini expects messages with role "user" or "model" (not "assistant").
 */
function convertMessagesToGeminiFormat(
  messages: Message[]
): Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> {
  return messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
}

/**
 * Stream a response from Google Gemini.
 *
 * @param messages - The conversation history (latest message is the user's new input)
 * @yields Text chunks from the AI response as they arrive
 * @throws Error if the API key is missing or the request fails
 */
export async function* streamGeminiResponse(
  messages: Message[]
): AsyncGenerator<string, void, unknown> {
  const client = getGeminiClient();

  // Convert messages to Gemini format
  const geminiMessages = convertMessagesToGeminiFormat(messages);

  if (geminiMessages.length === 0) {
    throw new Error("No messages provided to Gemini");
  }

  try {
    // Construct request parameters with native systemInstruction
    const requestParams = {
      model: GEMINI_CONFIG.model,
      contents: geminiMessages,
      systemInstruction: SYSTEM_PROMPT,
    };

    // Call generateContentStream with systemInstruction
    // Cast through unknown to handle SDK's expanding feature set
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.models.generateContentStream as (
      params: unknown
    ) => Promise<AsyncIterable<{ candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }>>)(
      requestParams as unknown
    );

    // Yield each chunk of text as it arrives
    for await (const chunk of response) {
      if (chunk.candidates && chunk.candidates.length > 0) {
        const candidate = chunk.candidates[0];
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.text) {
              yield part.text;
            }
          }
        }
      }
    }
  } catch (error) {
    // Clean error handling - don't expose raw API errors
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        throw new Error(
          "Gemini authentication failed. Please verify your API key."
        );
      }
      if (error.message.includes("rate limit")) {
        throw new Error("Gemini rate limit exceeded. Please try again later.");
      }
      if (error.message.includes("quota")) {
        throw new Error("Gemini quota exceeded. Please check your account.");
      }
      throw new Error(`Gemini request failed: ${error.message}`);
    }
    throw new Error("Gemini request failed with an unknown error");
  }
}

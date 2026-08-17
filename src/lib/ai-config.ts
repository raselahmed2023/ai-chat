/**
 * AI Configuration Module
 *
 * This module contains the shared configuration for AI providers:
 * - Primary provider: Google Gemini (always attempted first)
 * - Fallback provider: OpenRouter (used automatically only if Gemini fails before any output is streamed)
 *
 * API keys are NOT stored here; they are read from environment variables at runtime.
 */

/**
 * System prompt for the AI assistant.
 * This is applied to all conversations regardless of the provider used.
 */
export const SYSTEM_PROMPT =
  "You are a helpful, accurate, and friendly AI assistant. Provide clear and concise responses. " +
  "When asked questions, provide factual information. If you don't know something, say so honestly.";

/**
 * Gemini model configuration.
 * Primary AI provider for streaming conversations.
 */
export const GEMINI_CONFIG = {
  /**
   * Model name for Gemini.
   * Read from GEMINI_MODEL environment variable, defaults to "gemini-2.5-flash".
   */
  model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
};

/**
 * OpenRouter model configuration.
 * Fallback AI provider if Gemini fails before any output is streamed.
 */
export const OPENROUTER_CONFIG = {
  /**
   * Model name for OpenRouter.
   * Must be read from OPENROUTER_MODEL environment variable.
   * Examples: "google/gemini-2.5-flash", "openai/gpt-4-turbo"
   */
  model: process.env.OPENROUTER_MODEL || "",

  /**
   * API endpoint for OpenRouter.
   */
  apiUrl: "https://openrouter.ai/api/v1/chat/completions",

  /**
   * Request timeout in milliseconds.
   */
  timeout: 30000,
};

/**
 * Streaming configuration.
 */
export const STREAM_CONFIG = {
  /**
   * Timeout for individual stream chunks in milliseconds.
   */
  chunkTimeout: 10000,

  /**
   * Indicates that we should not attempt fallback if Gemini has already emitted any output.
   */
  noFallbackAfterOutput: true,
};

/**
 * Message type definition for conversations.
 */
export interface Message {
  role: "user" | "assistant";
  content: string;
}

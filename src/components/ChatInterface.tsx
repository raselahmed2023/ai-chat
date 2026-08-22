"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  type UIMessage,
} from "ai";

import ChatSkeleton from "@/components/ChatSkeleton";
import ChatErrorState from "@/components/ChatErrorState";

import type {
  FrontendAnalysisInput,
  FrontendAnalysisOutput,
} from "@/lib/tools/frontend-analysis";

// Lazy-load the structured tool UI.
// This component is not needed during the initial page render,
// so keeping it out of the initial bundle helps performance.
const FrontendAnalysisCard = dynamic(
  () => import("@/components/FrontendAnalysisCard"),
  {
    loading: () => (
      <div
        className="tool-card"
        role="status"
        aria-live="polite"
      >
        Loading analysis...
      </div>
    ),
  }
);

export default function ChatInterface() {
  const [input, setInput] = useState("");

  // Create the transport only once instead of recreating
  // it on every React render.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    []
  );

  const {
    messages,
    sendMessage,
    stop,
    status,
    error,
    regenerate,
    clearError,
  } = useChat({
    transport,
  });

  const isGenerating =
    status === "submitted" ||
    status === "streaming";

  const submitMessage = async () => {
    const text = input.trim();

    if (!text || isGenerating) {
      return;
    }

    clearError();
    setInput("");

    await sendMessage({
      text,
    });
  };

  const retryLastMessage = async () => {
    if (isGenerating) {
      return;
    }

    clearError();

    await regenerate();
  };

  return (
    <>
      <div
        className="messages-container"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-atomic="false"
        aria-busy={isGenerating}
      >
        {messages.length === 0 ? (
          <div className="empty-state">
            <div
              className="empty-icon"
              aria-hidden="true"
            >
              ✦
            </div>

            <h2>No conversation yet</h2>

            <p>
              Start with a suggested prompt or ask the AI
              anything.
            </p>

            <div
              className="example-prompts"
              aria-label="Suggested prompts"
            >
              <button
                type="button"
                onClick={() =>
                  setInput(
                    "Analyze my React skill as an intermediate developer."
                  )
                }
              >
                Analyze my React skill
              </button>

              <button
                type="button"
                onClick={() =>
                  setInput(
                    "Assess my TypeScript knowledge as an advanced developer."
                  )
                }
              >
                Assess TypeScript
              </button>

              <button
                type="button"
                onClick={() =>
                  setInput(
                    "Analyze force error as an intermediate developer."
                  )
                }
              >
                Test tool error
              </button>

              <button
                type="button"
                onClick={() =>
                  setInput("test slow response")
                }
              >
                Test slow response
              </button>

              <button
                type="button"
                onClick={() =>
                  setInput("test rate limit")
                }
              >
                Test rate limit
              </button>

              <button
                type="button"
                onClick={() =>
                  setInput("test stream failure")
                }
              >
                Test stream failure
              </button>
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => (
              <MessageRenderer
                key={message.id}
                message={message}
              />
            ))}
          </div>
        )}

        {status === "submitted" && (
          <ChatSkeleton />
        )}
      </div>

      <div className="composer-section">
        {error && (
          <ChatErrorState
            message={
              error.message ||
              "The AI response was interrupted. Please retry the failed message."
            }
            onRetry={() => {
              void retryLastMessage();
            }}
            disabled={isGenerating}
          />
        )}

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            void submitMessage();
          }}
        >
          <label
            htmlFor="chat-message"
            className="sr-only"
          >
            Message AI
          </label>

          <textarea
            id="chat-message"
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();
                void submitMessage();
              }
            }}
            aria-describedby="composer-hint"
            rows={2}
          />

          <div className="composer-footer">
            <span
              id="composer-hint"
              className="composer-hint"
            >
              Enter to send · Shift + Enter for new line
            </span>

            {isGenerating ? (
              <button
                type="button"
                className="stop-button"
                aria-label="Stop AI response"
                onClick={() => {
                  void stop();
                }}
              >
                <span aria-hidden="true">■</span>
                {" "}Stop
              </button>
            ) : (
              <button
                type="submit"
                className="send-button"
                disabled={!input.trim()}
                aria-disabled={!input.trim()}
              >
                Send{" "}
                <span aria-hidden="true">↑</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}

function MessageRenderer({
  message,
}: {
  message: UIMessage;
}) {
  const isUser = message.role === "user";

  return (
    <article
      className={
        isUser
          ? "message-block user-message-block"
          : "message-block assistant-message-block"
      }
      aria-label={
        isUser
          ? "Your message"
          : "AI Assistant response"
      }
    >
      <div className="message-author">
        {isUser ? "You" : "AI Assistant"}
      </div>

      <div className="message-parts">
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            return (
              <div
                key={`${message.id}-text-${index}`}
                className={
                  isUser
                    ? "message-bubble user-bubble"
                    : "message-bubble assistant-bubble"
                }
              >
                {part.text}
              </div>
            );
          }

          if (
            part.type ===
            "tool-analyzeFrontendSkill"
          ) {
            switch (part.state) {
              case "input-streaming":
                return (
                  <FrontendAnalysisCard
                    key={`${message.id}-tool-${index}`}
                    state="input-streaming"
                    input={
                      part.input as Partial<FrontendAnalysisInput>
                    }
                  />
                );

              case "input-available":
                return (
                  <FrontendAnalysisCard
                    key={`${message.id}-tool-${index}`}
                    state="input-available"
                    input={
                      part.input as FrontendAnalysisInput
                    }
                  />
                );

              case "output-available":
                return (
                  <FrontendAnalysisCard
                    key={`${message.id}-tool-${index}`}
                    state="output-available"
                    input={
                      part.input as FrontendAnalysisInput
                    }
                    output={
                      part.output as FrontendAnalysisOutput
                    }
                  />
                );

              case "output-error":
                return (
                  <FrontendAnalysisCard
                    key={`${message.id}-tool-${index}`}
                    state="output-error"
                    input={
                      part.input as Partial<FrontendAnalysisInput>
                    }
                    errorText={part.errorText}
                  />
                );

              default:
                return null;
            }
          }

          return null;
        })}
      </div>
    </article>
  );
}
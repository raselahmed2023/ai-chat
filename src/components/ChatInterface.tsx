"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  type UIMessage,
} from "ai";

import FrontendAnalysisCard from "@/components/FrontendAnalysisCard";

import type {
  FrontendAnalysisInput,
  FrontendAnalysisOutput,
} from "@/lib/tools/frontend-analysis";

export default function ChatInterface() {
  const [input, setInput] = useState("");

  const {
    messages,
    sendMessage,
    stop,
    status,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isGenerating =
    status === "submitted" ||
    status === "streaming";

  const submitMessage = async () => {
    const text = input.trim();

    if (!text || isGenerating) {
      return;
    }

    setInput("");

    await sendMessage({
      text,
    });
  };

  return (
    <main className="chat-page">
      <section className="chat-shell">
        <header className="chat-header">
          <div>
            <p className="chat-eyebrow">
              FE-07 · Generative UI
            </p>

            <h1>Frontend AI Assistant</h1>

            <p className="chat-subtitle">
              Chat normally or ask the AI to analyze a
              frontend skill.
            </p>
          </div>

          <span className="status-badge">
            <span className="status-dot" />
            AI Online
          </span>
        </header>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✦</div>

              <h2>Try a tool call</h2>

              <p>
                Ask for a frontend skill assessment to see
                structured AI tool output.
              </p>

              <div className="example-prompts">
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
            <div className="thinking-row">
              <span className="tool-spinner" />
              AI is thinking…
            </div>
          )}
        </div>

        <div className="composer-section">
          {error && (
            <div className="chat-error" role="alert">
              Something went wrong. Please try again.
            </div>
          )}

          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              void submitMessage();
            }}
          >
            <textarea
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
              placeholder="Ask something or request a frontend skill analysis..."
              aria-label="Message AI"
              rows={2}
            />

            <div className="composer-footer">
              <span className="composer-hint">
                Try: “Analyze my React skill as intermediate”
              </span>

              {isGenerating ? (
                <button
                  type="button"
                  className="stop-button"
                  onClick={() => {
                    void stop();
                  }}
                >
                  ■ Stop
                </button>
              ) : (
                <button
                  type="submit"
                  className="send-button"
                  disabled={!input.trim()}
                >
                  Send ↑
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function MessageRenderer({
  message,
}: {
  message: UIMessage;
}) {
  return (
    <div
      className={
        message.role === "user"
          ? "message-block user-message-block"
          : "message-block assistant-message-block"
      }
    >
      <div className="message-author">
        {message.role === "user"
          ? "You"
          : "AI Assistant"}
      </div>

      <div className="message-parts">
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            return (
              <div
                key={`${message.id}-text-${index}`}
                className={
                  message.role === "user"
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
    </div>
  );
}
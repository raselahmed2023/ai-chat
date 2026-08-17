"use client";

import {
  FormEvent,
  KeyboardEvent,
  UIEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SCROLL_THRESHOLD = 90;

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [showJumpButton, setShowJumpButton] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const container = messagesRef.current;

    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });

    shouldAutoScrollRef.current = true;
    setShowJumpButton(false);
  };

  const resizeTextarea = () => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    const maxHeight = 144;

    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;

    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  useEffect(() => {
    resizeTextarea();
  }, [input]);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom("smooth");
    } else if (isStreaming) {
      setShowJumpButton(true);
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    const nearBottom = distanceFromBottom < SCROLL_THRESHOLD;

    shouldAutoScrollRef.current = nearBottom;

    if (nearBottom) {
      setShowJumpButton(false);
    } else if (isStreaming) {
      setShowJumpButton(true);
    }
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    setIsStreaming(false);
    setIsThinking(false);
  };

  const sendMessage = async () => {
    const trimmedInput = input.trim();

    if (!trimmedInput || isStreaming) return;

    setError("");

    const userMessage: Message = {
      role: "user",
      content: trimmedInput,
    };

    const conversation = [...messages, userMessage];

    setMessages(conversation);
    setInput("");
    setIsStreaming(true);
    setIsThinking(true);

    shouldAutoScrollRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let assistantStarted = false;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversation,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Unable to connect to the AI service.");
      }

      if (!response.body) {
        throw new Error("Streaming response is unavailable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, {
          stream: true,
        });

        if (!chunk) continue;

        if (!assistantStarted) {
          assistantStarted = true;
          setIsThinking(false);

          setMessages([
            ...conversation,
            {
              role: "assistant",
              content: chunk,
            },
          ]);
        } else {
          setMessages((currentMessages) => {
            const updated = [...currentMessages];
            const lastIndex = updated.length - 1;
            const lastMessage = updated[lastIndex];

            if (lastMessage?.role === "assistant") {
              updated[lastIndex] = {
                ...lastMessage,
                content: lastMessage.content + chunk,
              };
            }

            return updated;
          });
        }
      }

      if (!assistantStarted) {
        setIsThinking(false);
      }
    } catch (caughtError) {
      if (
        caughtError instanceof DOMException &&
        caughtError.name === "AbortError"
      ) {
        return;
      }

      console.error(caughtError);

      setIsThinking(false);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsStreaming(false);
      setIsThinking(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage();
  };

  const handleKeyDown = async (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (input.trim() && !isStreaming) {
        await sendMessage();
      }
    }
  };

  return (
    <main className="chat-page">
      <section className="chat-shell">
        <header className="chat-header">
          <div>
            <p className="chat-eyebrow">AI Assistant</p>
            <h1>Streaming AI Chat</h1>
            <p className="chat-subtitle">
              Ask anything and receive responses in real time.
            </p>
          </div>

          <span className="status-badge">
            <span className="status-dot" />
            Online
          </span>
        </header>

        <div
          ref={messagesRef}
          className="messages-container"
          onScroll={handleScroll}
          aria-live="polite"
        >
          {messages.length === 0 && !isThinking ? (
            <div className="empty-state">
              <div className="empty-icon">✦</div>

              <h2>How can I help you today?</h2>

              <p>
                Start a conversation with the AI assistant.
              </p>

              <div className="suggestion-grid">
                <button
                  type="button"
                  onClick={() =>
                    setInput("Explain React Server Components simply.")
                  }
                >
                  Explain React Server Components
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setInput("Give me 5 frontend interview tips.")
                  }
                >
                  Frontend interview tips
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setInput("What is streaming in AI chat?")
                  }
                >
                  Explain AI streaming
                </button>
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`message-row ${
                    message.role === "user"
                      ? "message-row-user"
                      : "message-row-assistant"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div
                      className="assistant-avatar"
                      aria-hidden="true"
                    >
                      AI
                    </div>
                  )}

                  <div
                    className={`message-bubble ${
                      message.role === "user"
                        ? "user-bubble"
                        : "assistant-bubble"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="message-row message-row-assistant">
                  <div
                    className="assistant-avatar"
                    aria-hidden="true"
                  >
                    AI
                  </div>

                  <div
                    className="thinking-bubble"
                    aria-label="AI is thinking"
                  >
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {showJumpButton && (
          <button
            type="button"
            className="jump-button"
            onClick={() => scrollToBottom()}
          >
            ↓ Jump to latest
          </button>
        )}

        <div className="composer-section">
          {error && (
            <div className="chat-error" role="alert">
              {error}
            </div>
          )}

          <form
            className="composer"
            onSubmit={handleSubmit}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Message AI..."
              aria-label="Message AI"
              rows={1}
              disabled={false}
            />

            <div className="composer-footer">
              <span className="composer-hint">
                Enter to send · Shift + Enter for new line
              </span>

              {isStreaming ? (
                <button
                  type="button"
                  className="stop-button"
                  onClick={stopGeneration}
                  aria-label="Stop generating response"
                >
                  <span className="stop-icon" />
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  className="send-button"
                  disabled={!input.trim()}
                  aria-label="Send message"
                >
                  Send
                  <span aria-hidden="true">↑</span>
                </button>
              )}
            </div>
          </form>

          <p className="composer-note">
            AI responses may contain mistakes. Verify important information.
          </p>
        </div>
      </section>
    </main>
  );
}
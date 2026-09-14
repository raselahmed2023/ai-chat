"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ChatInterface = dynamic(
  () => import("@/components/ChatInterface"),
  {
    ssr: false,
    loading: () => <ChatLoadingFallback />,
  }
);

export default function ChatClientLoader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const windowWithIdle = window as Window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number;

      cancelIdleCallback?: (id: number) => void;
    };

    if (windowWithIdle.requestIdleCallback) {
      const idleId =
        windowWithIdle.requestIdleCallback(
          () => {
            setReady(true);
          },
          {
            timeout: 800,
          }
        );

      return () => {
        windowWithIdle.cancelIdleCallback?.(idleId);
      };
    }

    timeoutId = setTimeout(() => {
      setReady(true);
    }, 300);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  if (!ready) {
    return <ChatLoadingFallback />;
  }

  return <ChatInterface />;
}

function ChatLoadingFallback() {
  return (
    <>
      <div
        className="messages-container"
        aria-hidden="true"
      >
        <div className="empty-state">
          <div
            className="empty-icon"
            aria-hidden="true"
          >
            ✦
          </div>

          <h2>AI chat ready</h2>

          <p>
            Preparing the interactive assistant...
          </p>
        </div>
      </div>

      <div className="composer-section">
        <div
          className="composer"
          aria-hidden="true"
        >
          <div
            className="chat-input-placeholder"
          />

          <div className="composer-footer">
            <span className="composer-hint">
              Loading chat controls...
            </span>

            <span className="send-button">
              Send ↑
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
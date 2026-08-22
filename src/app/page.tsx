import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="chat-page">
      <section className="chat-shell">
        <header className="chat-header">
          <div>

            <h1>Frontend AI Assistant</h1>

            <p className="chat-subtitle">
              Streaming chat with structured tools, retry,
              loading and designed failure states.
            </p>
          </div>

          <span className="status-badge">
            <span
              className="status-dot"
              aria-hidden="true"
            />
            AI Online
          </span>
        </header>

        <ChatInterface />
      </section>
    </main>
  );
}
export default function ChatSkeleton() {
  return (
    <div
      className="chat-skeleton"
      role="status"
      aria-label="AI response is loading"
    >
      <div className="skeleton-avatar" />

      <div className="skeleton-content">
        <div className="skeleton-line skeleton-line-long" />
        <div className="skeleton-line skeleton-line-medium" />
        <div className="skeleton-line skeleton-line-short" />
      </div>
    </div>
  );
}
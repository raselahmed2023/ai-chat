type ChatErrorStateProps = {
  message: string;
  onRetry: () => void;
  disabled?: boolean;
};

export default function ChatErrorState({
  message,
  onRetry,
  disabled = false,
}: ChatErrorStateProps) {
  return (
    <div className="chat-failure-card" role="alert">
      <div className="chat-failure-icon" aria-hidden="true">
        !
      </div>

      <div className="chat-failure-content">
        <p className="chat-failure-label">
          Response interrupted
        </p>

        <h3>We couldn&apos;t finish this response.</h3>

        <p>{message}</p>

        <button
          type="button"
          onClick={onRetry}
          disabled={disabled}
        >
          {disabled ? "Retrying..." : "Retry failed message"}
        </button>
      </div>
    </div>
  );
}
"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="route-error-page">
      <section className="route-error-card">
        <div className="route-error-icon" aria-hidden="true">
          !
        </div>

        <p className="route-error-label">Unexpected error</p>

        <h1>Something went wrong</h1>

        <p>
          We could not load this experience. Try again without refreshing
          the whole application.
        </p>

        <button type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
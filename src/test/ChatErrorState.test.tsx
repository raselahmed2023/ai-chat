import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ChatErrorState from "@/components/ChatErrorState";

describe("ChatErrorState", () => {
  it("shows the error message to the user", () => {
    render(
      <ChatErrorState
        message="The AI response was interrupted."
        onRetry={() => {}}
      />
    );

    expect(
      screen.getByRole("alert")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "The AI response was interrupted."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /retry failed message/i,
      })
    ).toBeInTheDocument();
  });

  it("calls onRetry when the retry button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <ChatErrorState
        message="Request failed."
        onRetry={onRetry}
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: /retry failed message/i,
      })
    );

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("disables retry while another retry is running", () => {
    render(
      <ChatErrorState
        message="Request failed."
        onRetry={() => {}}
        disabled
      />
    );

    expect(
      screen.getByRole("button", {
        name: /retrying/i,
      })
    ).toBeDisabled();
  });
});
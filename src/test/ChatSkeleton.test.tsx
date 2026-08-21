import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ChatSkeleton from "@/components/ChatSkeleton";

describe("ChatSkeleton", () => {
  it("announces the loading state accessibly", () => {
    render(<ChatSkeleton />);

    expect(
      screen.getByRole("status", {
        name: /ai response is loading/i,
      })
    ).toBeInTheDocument();
  });
});
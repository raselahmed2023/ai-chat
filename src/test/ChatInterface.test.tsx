import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import ChatInterface from "@/components/ChatInterface";

const sendMessage = vi.fn();
const stop = vi.fn();
const regenerate = vi.fn();
const clearError = vi.fn();
const setMessages = vi.fn();

vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn(),
}));

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");

  class MockDefaultChatTransport {
    constructor(_options?: unknown) {}
  }

  return {
    ...actual,
    DefaultChatTransport: MockDefaultChatTransport,
  };
});

import { useChat } from "@ai-sdk/react";

const mockedUseChat = vi.mocked(useChat);

type MockChatOptions = {
  messages?: Array<{
    id: string;
    role: "user" | "assistant";
    parts: Array<{
      type: "text";
      text: string;
    }>;
  }>;
  status?: "ready" | "submitted" | "streaming" | "error";
  error?: Error;
};

function createChatMock({
  messages = [],
  status = "ready",
  error,
}: MockChatOptions = {}) {
  return {
    id: "test-chat",
    messages,
    setMessages,
    sendMessage,
    stop,
    regenerate,
    clearError,
    status,
    error,
  } as unknown as ReturnType<typeof useChat>;
}

describe("ChatInterface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a useful first-run empty state", () => {
    mockedUseChat.mockReturnValue(
      createChatMock()
    );

    render(<ChatInterface />);

    expect(
      screen.getByRole("heading", {
        name: /no conversation yet/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /start with a suggested prompt or ask the ai anything/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /analyze my react skill/i,
      })
    ).toBeInTheDocument();
  });

  it("shows the pending loading state", () => {
    mockedUseChat.mockReturnValue(
      createChatMock({
        status: "submitted",
      })
    );

    render(<ChatInterface />);

    expect(
      screen.getByRole("status", {
        name: /ai response is loading/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /stop/i,
      })
    ).toBeInTheDocument();
  });

  it("renders a streaming assistant response", () => {
    mockedUseChat.mockReturnValue(
      createChatMock({
        status: "streaming",
        messages: [
          {
            id: "user-1",
            role: "user",
            parts: [
              {
                type: "text",
                text: "Explain React hooks.",
              },
            ],
          },
          {
            id: "assistant-1",
            role: "assistant",
            parts: [
              {
                type: "text",
                text:
                  "React hooks let function components use state.",
              },
            ],
          },
        ],
      })
    );

    render(<ChatInterface />);

    expect(
      screen.getByText("Explain React hooks.")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "React hooks let function components use state."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /stop/i,
      })
    ).toBeInTheDocument();
  });

  it("renders a designed error state with retry", () => {
    mockedUseChat.mockReturnValue(
      createChatMock({
        status: "error",
        error: new Error(
          "The AI request could not be completed."
        ),
        messages: [
          {
            id: "user-error",
            role: "user",
            parts: [
              {
                type: "text",
                text: "test stream failure",
              },
            ],
          },
        ],
      })
    );

    render(<ChatInterface />);

    expect(
      screen.getByRole("alert")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "The AI request could not be completed."
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /retry failed message/i,
      })
    ).toBeInTheDocument();
  });

  it("prevents submitting an empty message", () => {
    mockedUseChat.mockReturnValue(
      createChatMock()
    );

    render(<ChatInterface />);

    const messageBox = screen.getByRole("textbox", {
      name: /message ai/i,
    });

    const sendButton = screen.getByRole("button", {
      name: /send/i,
    });

    expect(messageBox).toHaveValue("");
    expect(sendButton).toBeDisabled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("submits a valid message", async () => {
    const user = userEvent.setup();

    sendMessage.mockResolvedValue(undefined);

    mockedUseChat.mockReturnValue(
      createChatMock()
    );

    render(<ChatInterface />);

    const messageBox = screen.getByRole("textbox", {
      name: /message ai/i,
    });

    await user.type(
      messageBox,
      "Explain JavaScript closures"
    );

    const sendButton = screen.getByRole("button", {
      name: /send/i,
    });

    expect(sendButton).toBeEnabled();

    await user.click(sendButton);

    expect(sendMessage).toHaveBeenCalledTimes(1);

    expect(sendMessage).toHaveBeenCalledWith({
      text: "Explain JavaScript closures",
    });
  });
});
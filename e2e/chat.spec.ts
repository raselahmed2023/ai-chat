import { expect, test } from "@playwright/test";

test("user can send a message and receive a mocked AI response", async ({
  page,
}) => {
  await page.route("**/api/chat", async (route) => {
    const body = [
      `data: ${JSON.stringify({
        type: "start",
        messageId: "mock-assistant-message",
      })}`,
      "",
      `data: ${JSON.stringify({
        type: "text-start",
        id: "mock-text",
      })}`,
      "",
      `data: ${JSON.stringify({
        type: "text-delta",
        id: "mock-text",
        delta:
          "Mocked AI response: React hooks let function components use state and other React features.",
      })}`,
      "",
      `data: ${JSON.stringify({
        type: "text-end",
        id: "mock-text",
      })}`,
      "",
      `data: ${JSON.stringify({
        type: "finish",
      })}`,
      "",
      "data: [DONE]",
      "",
    ].join("\n");

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: {
        "x-vercel-ai-ui-message-stream": "v1",
        "cache-control": "no-cache",
      },
      body,
    });
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /frontend ai assistant/i,
    })
  ).toBeVisible();

  const messageBox = page.getByRole("textbox", {
    name: /message ai/i,
  });

  await messageBox.fill("Explain React hooks");

  await page
    .getByRole("button", {
      name: /send/i,
    })
    .click();

  await expect(
    page.getByText("Explain React hooks", {
      exact: true,
    })
  ).toBeVisible();

  await expect(
    page.getByText(/mocked ai response: react hooks/i)
  ).toBeVisible();
});
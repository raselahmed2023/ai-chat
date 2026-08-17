# Streaming AI Chat

A modern full-stack AI chat application built with **Next.js, React, TypeScript, and streaming AI APIs**.

The application provides real-time AI responses, multi-turn conversation support, stop-generation controls, smart auto-scroll behavior, and a responsive chat interface designed for both desktop and mobile devices.

## Live Demo

`(https://ai-chat-lake-sigma.vercel.app/)`

## GitHub Repository

`https://github.com/raselahmed2023/ai-chat`

## Features

* Real-time streamed AI responses
* Gemini as the primary AI provider
* Fallback AI provider architecture
* Multi-turn conversation context
* Thinking indicator before the first streamed token
* Stop generation during an active response
* Partial AI response remains visible after stopping
* Send another message immediately after stopping
* Smart auto-scroll behavior
* “Jump to latest” control when the user scrolls away from the bottom
* Responsive chat interface
* Mobile-friendly composer
* Enter to send
* Shift + Enter for a new line
* Accessible buttons, labels, and focus states
* Server-side API key protection
* Friendly error handling

## Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* CSS
* App Router

### Backend

* Next.js Route Handler
* Google Gemini API
* Streaming Web APIs
* `ReadableStream`
* `AbortController`

### AI Provider

Primary provider:

```text
Google Gemini
```

The project also includes fallback-provider architecture so another AI service can handle requests if the primary provider becomes unavailable before any response content has been streamed.

## Project Structure

```text
streaming-ai-chat/
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   └── ChatInterface.tsx
│   │
│   └── lib/
│       ├── ai-config.ts
│       ├── gemini.ts
│       └── openrouter.ts
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## How Streaming Works

The client sends the complete conversation history to:

```text
POST /api/chat
```

The server calls the AI provider using a streaming API.

Instead of waiting for the full AI response, the server forwards text chunks to the browser as they arrive.

```text
User Message
     ↓
POST /api/chat
     ↓
Gemini
     ↓
Streaming response
     ↓
ReadableStream
     ↓
Chat Interface
```

The frontend reads the response using:

```text
response.body.getReader()
```

and progressively appends each incoming text chunk to the assistant message.

## Stop Generation

Every AI request uses an `AbortController`.

When the user presses **Stop**:

* the active request is aborted
* already-streamed content remains visible
* the input becomes available again
* the user can immediately start another conversation turn

This prevents the conversation state from breaking after cancellation.

## Smart Auto-Scroll

The application automatically follows streamed content only while the user is already near the bottom of the conversation.

If the user scrolls upward:

* automatic scrolling stops
* the user can continue reading older messages
* a **Jump to latest** control becomes available

This avoids forcing the user back to the newest token while they are reading previous content.

## Multi-Turn Conversation

The full conversation history is sent with every request.

Example:

```text
User: My name is Rasel.

Assistant: Nice to meet you, Rasel.

User: What name did I tell you?

Assistant: You told me your name is Rasel.
```

This allows the AI to retain context across multiple turns in the same chat session.

## Environment Variables

Create a `.env.local` file in the project root.

```env
GEMINI_API_KEY=
OPENROUTER_API_KEY=

GEMINI_MODEL=
OPENROUTER_MODEL=
```

Do not commit real API keys to GitHub.

The API keys are accessed only from server-side modules using environment variables.

## Installation

Clone the repository:

```bash
git clone https://github.com/raselahmed2023/ai-chat.git
```

Move into the project:

```bash
cd streaming-ai-chat
```

Install dependencies:

```bash
npm install
```

Create:

```text
.env.local
```

Add the required environment variables.

Then start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Production Build

Run:

```bash
npm run build
```

Then:

```bash
npm run start
```

## Testing Checklist

Before deployment, verify:

* AI response visibly streams instead of appearing all at once
* Thinking indicator appears before the first token
* Stop button works during generation
* Partial response remains after stopping
* New messages can be sent after stopping
* Multiple conversation turns preserve context
* Scrolling upward disables forced auto-scroll
* Jump to latest works correctly
* Empty messages cannot be submitted
* Enter sends the message
* Shift + Enter adds a new line
* Chat works at approximately 375px mobile width
* No API key appears in client-side code
* `npm run build` passes without TypeScript errors

## Security

API credentials are never exposed directly to the browser.

The frontend communicates only with the internal server route:

```text
/api/chat
```

The server route then communicates with the configured AI provider using environment variables.

Real `.env.local` credentials should never be committed to GitHub.

## Important Source Files

### Route Handler

```text
src/app/api/chat/route.ts
```

### Chat Component

```text
src/components/ChatInterface.tsx
```

### AI Configuration

```text
src/lib/ai-config.ts
```

### Gemini Provider

```text
src/lib/gemini.ts
```

## Assignment Goal

This project was built as a **Streaming AI Chat Interface** exercise focused on modern frontend AI engineering patterns, including:

* streamed generation
* cancellation
* state preservation
* responsive interaction design
* multi-turn AI conversation
* server-side secret management
* robust scrolling behavior


## FE-07 Tool Contract

### Tool Name

`analyzeFrontendSkill`

### Purpose

Analyzes a frontend development topic or skill and returns a structured assessment that is rendered as a UI component.

### Input Schema

```ts
{
  topic: string;
  level: "beginner" | "intermediate" | "advanced";
}



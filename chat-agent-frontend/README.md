# chat-agent-frontend

A clean, Intercom-style chat UI for the **FakeStore** support agent. Talks to
[`chat-agent-backend`](../chat-agent-backend).

**Tech stack:** Next.js (App Router) + React + TypeScript + Tailwind CSS. No
extra dependencies beyond what `create-next-app` provides — all chat logic lives
in a single `useChat` hook and the components are presentational.

## Prerequisites

- **Node** >= 20
- **npm**
- The **backend** running (default `http://localhost:3001`).

## Setup

```bash
cp .env.local.example .env.local   # adjust NEXT_PUBLIC_API_URL if the backend isn't on :3001
npm install
npm run dev
```

The app runs on `http://localhost:3000`. Start the backend first so the chat can
reach it.

| Script          | Purpose                  |
| --------------- | ------------------------ |
| `npm run dev`   | Dev server on `:3000`    |
| `npm run build` | Production build         |
| `npm start`     | Serve the built app      |

## Configuration

| Variable              | Default                 | Purpose                  |
| --------------------- | ----------------------- | ------------------------ |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API base URL     |

## Features

- **Optimistic UI** — your message appears instantly; the AI reply arrives
  after with a typing indicator.
- **Session persistence** — the `sessionId` is stored in `localStorage`, so the
  conversation survives a page refresh (history is re-fetched on mount).
- **Graceful errors** — failed sends show a dismissible red banner instead of a
  broken bubble; the optimistic user message is kept.
- **Empty-input guard** — empty/whitespace messages are ignored before any API
  call. The textarea caps at 2000 chars with a counter past 1800.
- **Keyboard UX** — `Enter` sends, `Shift+Enter` adds a newline; the textarea
  auto-grows from 1 to ~4 rows.

## Architecture notes

```
src/
├── app/
│   ├── layout.tsx        Root layout + fonts
│   ├── page.tsx          Renders <ChatWindow />
│   └── globals.css       Tailwind + bubble/typing keyframes
├── lib/api.ts            sendMessage / fetchHistory (single source of fetch logic)
├── hooks/useChat.ts      All chat state + side effects
└── components/
    ├── ChatWindow.tsx    Container: header, list, error banner, input
    ├── MessageList.tsx   Scrollable list + auto-scroll
    ├── MessageBubble.tsx User vs AI bubble styling + timestamps
    ├── ChatInput.tsx     Auto-growing textarea + send button
    └── TypingIndicator.tsx
```

- **Separation of concerns** — `lib/api.ts` owns all network calls, `useChat`
  owns state/effects, and components are presentational. Pointing at a different
  backend is a one-line env change.
- **State lives in one hook** — `useChat` is the single place that mutates
  messages, session, loading, and error, which keeps components dumb and testable.

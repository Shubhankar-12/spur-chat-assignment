# chat-agent-backend

AI-powered customer support chat API for **FakeStore**, a small fictional e-commerce shop.
Node.js + TypeScript + Express, backed by SQLite (`better-sqlite3`) with an optional
Redis cache layer in front of session reads.

## Prerequisites

- **Node** >= 20
- **npm**
- **Redis** — _optional_. The app runs fine without it (see [Redis note](#redis-note)).
- A **Google Gemini API key** (from [Google AI Studio](https://aistudio.google.com/apikey)).

## Setup

```bash
cp .env.example .env        # then fill in GEMINI_API_KEY
# optionally adjust PORT and REDIS_URL in .env
npm install
npm run dev
```

The server starts on `http://localhost:3001` (configurable via `PORT`). On first
run it creates `./data/chat.db`, the schema, and seeds the FAQ table.

Scripts:

| Script          | Purpose                                  |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Hot-reloading dev server (`ts-node-dev`) |
| `npm run build` | Compile TypeScript to `./dist`           |
| `npm start`     | Run the compiled build                   |

## Redis note

Redis is **optional**. If it isn't running, the app falls back to SQLite for all
reads — every Redis call is wrapped in try/catch and degrades to a warning log.
The client uses `lazyConnect` + `maxRetriesPerRequest: 1` so a missing Redis never
crashes the server or hangs a request.

## API reference

### `GET /health`

Lightweight liveness check.

**Response `200`** — `{ "status": "ok" }`

### `POST /chat/message`

Send a user message and receive an AI reply. Creates a conversation if no
`sessionId` is supplied (or if the supplied one no longer exists).

**Request**

```json
{
  "message": "How long does shipping take?",
  "sessionId": "optional-uuid-from-a-previous-response"
}
```

- `message` — required, 1–2000 chars.
- `sessionId` — optional UUID. Omit it to start a new conversation.

**Response `200`**

```json
{
  "reply": "Standard delivery is 5–7 business days...",
  "sessionId": "3f1c…-uuid"
}
```

**Errors** — `{ "error": string }` with status `400` (validation),
`429` (rate limit), `500` (LLM/internal), `503` (LLM unavailable).

### `GET /session/:sessionId`

Return the full conversation history, oldest message first.

**Response `200`**

```json
{
  "sessionId": "3f1c…-uuid",
  "messages": [
    {
      "id": "…",
      "conversation_id": "…",
      "sender": "user",
      "text": "Hi",
      "timestamp": 1730000000000
    },
    {
      "id": "…",
      "conversation_id": "…",
      "sender": "ai",
      "text": "Hello! …",
      "timestamp": 1730000000500
    }
  ]
}
```

**Errors** — `404` if the conversation doesn't exist.

## Knowledge base (FAQ)

The agent's answers are grounded in the `faq` table, seeded on first run from
`src/db/seed.ts`. Seeded topics:

| Topic            | Covers                                            |
| ---------------- | ------------------------------------------------- |
| `shipping`       | Countries served (US, Canada, UK, India) + speeds |
| `shipping_india` | India-specific delivery times, COD, UPI, ₹ pricing |
| `returns`        | 30-day return window and process                  |
| `support_hours`  | Support availability                              |
| `payments`       | Accepted payment methods                          |
| `order_tracking` | How to track an order                             |

To extend the agent's knowledge, add rows to the `faq` table (or edit the seed).
`buildFaqContext` reads the whole table and injects it into the system prompt on
every request, so new entries take effect with no code changes. Note that the
seed only runs when the table is empty — to re-seed, clear the `faq` rows (or
delete `./data/chat.db`) and restart.

## Architecture notes

```
src/
├── index.ts            Express entry point — seed, mount routers, error handler
├── db/                 SQLite singleton, schema/FAQ seed, repository (data access)
├── cache/redis.ts      Redis singleton + graceful cacheSession/getCachedSession
├── lib/                llm.ts (Gemini wrapper), errors.ts (AppError), types.ts
└── modules/
    ├── chat/           router → service → schema (validation)
    └── session/        router → service
```

- **Separation of concerns** — routers handle HTTP + validation, services hold
  business logic, `db`/`cache` are the data layer, `lib` holds cross-cutting
  helpers. Adding a new channel (WhatsApp, Instagram) means adding a thin router
  that calls the same `chat.service`; the LLM and persistence logic are reused.
- **Cache-aside pattern** — reads try Redis first (`getCachedSession`); on a miss
  they read SQLite and repopulate the cache. Writes persist to SQLite (the source
  of truth) and then refresh the cache. SQLite is always authoritative.
- **LLM cost controls** — `llm.ts` caps history at the **last 10 messages**,
  `maxOutputTokens` at 512, and disables Gemini "thinking" for fast FAQ answers.
  The Gemini integration (model `gemini-2.5-flash`) is fully encapsulated in
  `generateReply`, so swapping models or providers touches one file.
- **Error handling** — all Gemini SDK errors are caught and re-thrown as
  `AppError`s with friendly messages; a single Express error handler converts any
  error to `{ error }` JSON with the right status (including `400` for malformed
  JSON bodies) and never leaks a stack trace.
- **Prompt safety** — the system prompt pins scope (FakeStore-only), forbids
  revealing instructions, and wraps the FAQ in a `<knowledge_base>` block marked
  as reference-only data, so seeded (or later untrusted) FAQ content can't act as
  injected instructions.

## Security notes

There is **no authentication** (out of scope for this exercise). Sessions are
identified solely by an unguessable UUID, so anyone holding a `sessionId` can read
its transcript via `GET /session/:id`, and a client may supply its own
conversation UUID. In production this would be an IDOR — sessions should be tied
to an authenticated user. Message content is rendered as plain text on the
frontend (no `dangerouslySetInnerHTML`), so there is no stored-XSS vector.

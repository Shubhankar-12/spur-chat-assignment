# AI Live Chat Agent

An AI-powered customer support chat for **FakeStore**, a small fictional
e-commerce shop. A user chats with a support agent that answers from a seeded
FAQ knowledge base, with conversations persisted and continued across turns.

| Folder | Stack |
| ------ | ----- |
| [`chat-agent-backend`](./chat-agent-backend) | Node.js + TypeScript + Express · SQLite (`better-sqlite3`) · optional Redis cache · Google Gemini |
| [`chat-agent-frontend`](./chat-agent-frontend) | Next.js (App Router) + React + TypeScript + Tailwind CSS |

Each folder has its own README with deeper detail (full API reference, etc.).
This file is the overview.

---

## Prerequisites

- **Node.js >= 20** (the backend uses `better-sqlite3`, a native module with
  prebuilt binaries for Node 20)
- **npm**
- A **Google Gemini API key** — free from [Google AI Studio](https://aistudio.google.com/apikey)
- **Redis** — *optional* (the app runs fine without it)

---

## Run it locally (step by step)

Open two terminals.

### 1. Backend → http://localhost:3001

```bash
cd chat-agent-backend
cp .env.example .env          # then edit .env and set GEMINI_API_KEY
npm install
npm run dev
```

On first start it logs:

```
[seed] Inserted 6 FAQ entries.
Server running on http://localhost:3001
Redis: offline – falling back to SQLite only   # or "Redis: connected"
```

### 2. Frontend → http://localhost:3000

```bash
cd chat-agent-frontend
cp .env.local.example .env.local   # default points at http://localhost:3001
npm install
npm run dev
```

Open **http://localhost:3000** and start chatting.

> Start the backend first so the UI has something to talk to. CORS is already
> open on the backend, so no extra config is needed.

---

## Database setup (migrations / seed)

There is **no separate migration step** — the database is created and seeded
automatically on backend startup:

- On boot, `src/db/seed.ts` runs `CREATE TABLE IF NOT EXISTS …` for the
  `conversations`, `messages`, and `faq` tables (idempotent, so it's safe to run
  every start). The SQLite file is created at `chat-agent-backend/data/chat.db`.
- The `faq` table is seeded **once** (only when it's empty) with 6 topics:
  `shipping`, `shipping_india`, `returns`, `support_hours`, `payments`,
  `order_tracking`.

**To re-seed / reset:** stop the server, delete the DB, and restart:

```bash
# from chat-agent-backend/
rm -rf data        # removes chat.db (+ WAL/SHM sidecar files)
npm run dev        # recreates schema and re-seeds the FAQ
```

To change or extend the knowledge base, edit `FAQ_SEED` in `src/db/seed.ts` (then
re-seed), or simply insert rows into the `faq` table — `buildFaqContext` reads the
whole table on every request, so new entries take effect with no code change.

---

## Environment variables

### Backend (`chat-agent-backend/.env`)

| Variable          | Required | Default                  | Purpose                                  |
| ----------------- | -------- | ------------------------ | ---------------------------------------- |
| `GEMINI_API_KEY`  | **Yes**  | —                        | Google Gemini API key (the LLM provider) |
| `PORT`            | No       | `3001`                   | Server port                              |
| `REDIS_URL`       | No       | `redis://localhost:6379` | Redis connection (cache is optional)     |

> This project uses **Gemini**, so the key is `GEMINI_API_KEY` (not
> `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`). The LLM is isolated in one file
> (`src/lib/llm.ts`), so switching providers is a single-file change.

### Frontend (`chat-agent-frontend/.env.local`)

| Variable              | Default                 | Purpose              |
| --------------------- | ----------------------- | -------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API base URL |

Only `.env*.example` templates are committed; real `.env` files are gitignored.

---

## Architecture overview

### Backend — layered modules

```
src/
├── index.ts            Express entry: seed DB, mount routers, error handler
├── db/
│   ├── client.ts       SQLite singleton (WAL + foreign keys)
│   ├── seed.ts         Idempotent schema + FAQ seed
│   └── repository.ts   All data access (conversations + messages)
├── cache/redis.ts      Redis singleton + graceful cacheSession/getCachedSession
├── lib/
│   ├── llm.ts          Gemini wrapper — generateReply(history, msg, faq)
│   ├── errors.ts       AppError + Express error-handler middleware
│   └── types.ts        Shared types
└── modules/
    ├── chat/           router → service → schema (Zod validation)
    └── session/        router → service
```

The request flow is strictly layered: **router** (HTTP + validation) →
**service** (business logic) → **repository / cache** (data). Routers never
touch the DB; services never touch HTTP. The LLM and the cache are each isolated
behind a single module.

### Interesting design decisions

- **Cache-aside on the full transcript.** Reads try Redis first and fall back to
  SQLite on a miss (then repopulate). Both the chat path and the history endpoint
  treat the cache key as the *complete* transcript, so a warm cache never returns
  a truncated history. SQLite is always the source of truth.
- **Redis is truly optional.** The client uses `lazyConnect`,
  `maxRetriesPerRequest: 1`, `connectTimeout: 1000`, and `retryStrategy: () => null`,
  and every cache call is wrapped in try/catch. A missing Redis never blocks
  startup or hangs a request — the server even starts listening *before* it
  probes Redis.
- **Extensible by design.** Adding a new channel (WhatsApp, Instagram) is a thin
  router that calls the same `chat.service.postMessage`; the LLM and persistence
  are reused. New FAQ knowledge is just new rows.
- **Validation + uniform errors.** Request bodies are validated with Zod; a single
  error-handler converts everything to `{ error }` JSON with the right status
  (including `400` for malformed JSON) and never leaks a stack trace.
- **Frontend state in one hook.** All chat state/effects live in `useChat`;
  components are presentational. Session id is kept in `localStorage` so the
  conversation survives a refresh.

---

## LLM notes

- **Provider / model:** Google **Gemini 2.5 Flash** (`gemini-2.5-flash`) via the
  official `@google/genai` SDK. Chosen for low latency and cost on short
  FAQ-style answers.
- **Prompting:** a single `systemInstruction` (built in `buildSystemPrompt`) that:
  - pins the agent's **persona and scope** (FakeStore topics only; politely
    decline anything unrelated),
  - enforces **honesty** ("if it isn't in the knowledge base, say so" — no
    inventing prices/policies),
  - forbids revealing the system prompt, and
  - injects the FAQ inside a delimited `<knowledge_base>` block marked as
    *reference-only data*, so FAQ content can't act as injected instructions.
- **Conversation handling:** prior turns are mapped to Gemini's `user` / `model`
  roles and sent as `contents`; the new message is appended last.
- **Cost / latency controls:** history is capped at the **last 10 messages**,
  `maxOutputTokens` is **512**, and Gemini "thinking" is disabled
  (`thinkingConfig: { thinkingBudget: 0 }`) since these are short support answers.
- **Error handling:** SDK errors are caught and mapped to friendly messages —
  invalid key → clear auth error, `429` → rate-limit message, `5xx`/network →
  "temporarily unavailable" — with the real error logged server-side.

---

## Trade-offs & "If I had more time…"

**Trade-offs made (deliberate, for scope):**

- **SQLite + auto-seed instead of a migration tool.** Zero-config and perfect for
  a single-node demo; not suited to horizontal scaling or schema versioning.
- **Whole FAQ injected into the prompt.** Simple and effective for ~6 entries, but
  it doesn't scale — at hundreds of entries it would need retrieval/embeddings.
- **No authentication.** Sessions are unguessable UUIDs, but anyone with a
  `sessionId` can read its transcript (an IDOR in production). Out of scope here.
- **Non-streaming replies.** The UI shows a typing indicator and waits for the
  full response, which is simpler than token streaming.

**If I had more time:**

- **Stream responses** token-by-token (SSE / `generateContentStream`) for a more
  responsive feel.
- **Retrieval-augmented FAQ** (embeddings + top-k) so the knowledge base can grow
  without bloating the prompt.
- **Auth + per-user sessions**, and rate limiting per IP/user.
- **Tests** — unit tests for the service/repository layers and the LLM
  error-mapping, plus an end-to-end happy-path test.
- **A `CacheStore` interface** so swapping Redis for another cache (or removing it)
  is a pure config change.
- **Configurable DB path** (`DATA_DIR`) so a hosted deploy (e.g. Render) can mount
  a persistent disk for durable history.
- **Observability** — structured logging and basic metrics (latency, token usage).

---

## Deploying

The frontend deploys cleanly to **Vercel** (root directory `chat-agent-frontend`,
set `NEXT_PUBLIC_API_URL` to the backend URL). The backend runs on **Render** as a
Node web service (build `npm install && npm run build`, start `npm start`) — pin
**Node 20** so `better-sqlite3` uses its prebuilt binary. Note that Render's disk
is ephemeral, so chat history resets on redeploy unless a persistent disk is
attached.

# AI Live Chat Agent

An AI customer support chat for **FakeStore**, a small made-up online shop. A user
chats with a support agent that answers from a seeded FAQ. Chats are saved and
continue across messages.

| Folder | Stack |
| ------ | ----- |
| [`chat-agent-backend`](./chat-agent-backend) | Node.js + TypeScript + Express, SQLite (`better-sqlite3`), optional Redis cache, Google Gemini |
| [`chat-agent-frontend`](./chat-agent-frontend) | Next.js (App Router) + React + TypeScript + Tailwind CSS |

Each folder has its own README with more detail (like the full API reference).
This file is the overview.

---

## What you need first

- **Node.js 20 or higher** (the backend uses `better-sqlite3`, which has ready-made
  binaries for Node 20)
- **npm**
- A **Google Gemini API key** (free from [Google AI Studio](https://aistudio.google.com/apikey))
- **Redis** is optional. The app works fine without it.

---

## Run it locally, step by step

Open two terminals.

### 1. Backend (http://localhost:3001)

```bash
cd chat-agent-backend
cp .env.example .env          # then open .env and set GEMINI_API_KEY
npm install
npm run dev
```

On the first start you should see:

```
[seed] Inserted 6 FAQ entries.
Server running on http://localhost:3001
Redis: offline – falling back to SQLite only   # or "Redis: connected"
```

### 2. Frontend (http://localhost:3000)

```bash
cd chat-agent-frontend
cp .env.local.example .env.local   # default points at http://localhost:3001
npm install
npm run dev
```

Open **http://localhost:3000** and start chatting.

> Start the backend first so the UI has something to talk to. CORS is already open
> on the backend, so you do not need any extra setup.

---

## Database setup (tables and seed)

There is no separate migration step. The database is built and seeded
automatically when the backend starts:

- On boot, `src/db/seed.ts` runs `CREATE TABLE IF NOT EXISTS ...` for the
  `conversations`, `messages`, and `faq` tables. This is safe to run every time.
  The SQLite file is created at `chat-agent-backend/data/chat.db`.
- The `faq` table is filled **once** (only when it is empty) with 6 topics:
  `shipping`, `shipping_india`, `returns`, `support_hours`, `payments`, and
  `order_tracking`.

To reset and seed again, stop the server, delete the database, and start again:

```bash
# from chat-agent-backend/
rm -rf data        # removes chat.db and its WAL/SHM files
npm run dev        # rebuilds the tables and seeds the FAQ again
```

To change or add knowledge, edit `FAQ_SEED` in `src/db/seed.ts` (then seed again),
or just add rows to the `faq` table. The code reads the whole table on every
request, so new rows work right away with no code change.

---

## Environment variables

### Backend (`chat-agent-backend/.env`)

| Variable          | Required | Default                  | What it does                          |
| ----------------- | -------- | ------------------------ | ------------------------------------- |
| `GEMINI_API_KEY`  | **Yes**  | none                     | Google Gemini API key (the LLM)       |
| `PORT`            | No       | `3001`                   | Server port                           |
| `REDIS_URL`       | No       | `redis://localhost:6379` | Redis connection (cache is optional)  |

> This project uses **Gemini**, so the key is `GEMINI_API_KEY` (not
> `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`). The LLM lives in one file
> (`src/lib/llm.ts`), so switching to another provider is a one-file change.

### Frontend (`chat-agent-frontend/.env.local`)

| Variable              | Default                 | What it does         |
| --------------------- | ----------------------- | -------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API base URL |

Only the `.env*.example` templates are committed. Real `.env` files are ignored by
git.

---

## How the backend is built

### Layers and modules

```
src/
├── index.ts            Express start: seed DB, mount routers, error handler
├── db/
│   ├── client.ts       SQLite connection (WAL + foreign keys)
│   ├── seed.ts         Builds tables and seeds the FAQ
│   └── repository.ts   All database access (conversations and messages)
├── cache/redis.ts      Redis client + safe cacheSession/getCachedSession
├── lib/
│   ├── llm.ts          Gemini wrapper: generateReply(history, msg, faq)
│   ├── errors.ts       AppError + Express error-handler
│   └── types.ts        Shared types
└── modules/
    ├── chat/           router -> service -> schema (Zod validation)
    └── session/        router -> service
```

The flow is layered: the **router** handles HTTP and validation, the **service**
holds the logic, and the **repository / cache** handle data. Routers never touch
the database, and services never touch HTTP. The LLM and the cache each sit behind
one module.

### Design decisions worth noting

- **Cache holds the full chat.** Reads check Redis first and fall back to SQLite on
  a miss, then refill the cache. Both the chat path and the history endpoint treat
  the cache key as the *full* transcript, so a warm cache never returns a cut-short
  history. SQLite is always the source of truth.
- **Redis is truly optional.** The client uses `lazyConnect`,
  `maxRetriesPerRequest: 1`, `connectTimeout: 1000`, and `retryStrategy: () => null`,
  and every cache call is wrapped in try/catch. A missing Redis never blocks start
  or hangs a request. The server even starts listening before it checks Redis.
- **Easy to extend.** A new channel (WhatsApp, Instagram) is just a thin router
  that calls the same `chat.service.postMessage`. The LLM and storage are reused.
  New knowledge is just new rows.
- **Validation and one error shape.** Request bodies are checked with Zod. One
  error-handler turns everything into `{ error }` JSON with the right status code
  (including `400` for bad JSON) and never leaks a stack trace.
- **Frontend state in one place.** All chat state and effects live in the `useChat`
  hook, so the components stay simple. The session id is kept in `localStorage`, so
  the chat survives a page refresh.

---

## LLM notes

- **Provider and model:** Google **Gemini 2.5 Flash** (`gemini-2.5-flash`) through
  the official `@google/genai` SDK. Picked for fast, cheap answers on short FAQ
  questions.
- **How it is prompted:** one `systemInstruction` (built in `buildSystemPrompt`)
  that:
  - sets the persona and scope (FakeStore topics only, and politely decline
    anything else),
  - asks for honesty (if it is not in the knowledge base, say so, and do not make
    up prices or policies),
  - says never to reveal the system prompt, and
  - puts the FAQ inside a `<knowledge_base>` block marked as reference data only,
    so FAQ text cannot act as hidden instructions.
- **Chat history:** past messages are mapped to Gemini's `user` and `model` roles
  and sent as `contents`. The new message is added last.
- **Cost and speed limits:** history is capped at the **last 10 messages**,
  `maxOutputTokens` is **512**, and Gemini "thinking" is turned off
  (`thinkingConfig: { thinkingBudget: 0 }`) since these are short answers.
- **Error handling:** SDK errors are caught and turned into friendly messages. A
  bad key gives a clear auth error, `429` gives a rate-limit message, and `5xx` or
  network errors give a "temporarily unavailable" message. The real error is logged
  on the server.

---

## Trade-offs and "if I had more time"

**Trade-offs I chose on purpose, to fit the scope:**

- **SQLite with auto-seed instead of a migration tool.** No setup and great for a
  single-server demo, but not built for scaling or schema versioning.
- **The whole FAQ goes into the prompt.** Simple and works well for ~6 entries, but
  it would not scale. With hundreds of entries it would need search/embeddings.
- **No login.** Session ids are hard to guess, but anyone with a `sessionId` can
  read that chat. That would be a security issue in production. Out of scope here.
- **Replies are not streamed.** The UI shows a typing dot and waits for the full
  answer, which is simpler than streaming tokens.

**If I had more time:**

- **Stream the reply** word by word (SSE or `generateContentStream`) so it feels
  faster.
- **Search-based FAQ** (embeddings + top matches) so the knowledge base can grow
  without a huge prompt.
- **Login and per-user sessions**, plus rate limiting per user or IP.
- **Tests** for the service and repository layers and the LLM error handling, plus
  one end-to-end happy-path test.
- **A `CacheStore` interface** so swapping or removing Redis is just config.
- **A configurable DB path** (`DATA_DIR`) so a hosted deploy can mount a disk and
  keep history.
- **Logging and basic metrics** (latency, token usage).

---

## Deploying

The frontend deploys cleanly to **Vercel** (set the root directory to
`chat-agent-frontend` and set `NEXT_PUBLIC_API_URL` to the backend URL). The
backend runs on **Render** as a Node web service (build with
`npm install && npm run build`, start with `npm start`). Pin **Node 20** so
`better-sqlite3` uses its ready-made binary. Render's disk is temporary, so chat
history resets on each deploy unless you attach a persistent disk.

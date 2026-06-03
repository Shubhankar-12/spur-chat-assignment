import "dotenv/config";
import express from "express";
import cors from "cors";
import { seed } from "./db/seed";
import { isRedisAvailable } from "./cache/redis";
import { errorHandler } from "./lib/errors";
import chatRouter from "./modules/chat/chat.router";
import sessionRouter from "./modules/session/session.router";

const PORT = Number(process.env.PORT) || 3001;

async function main() {
  seed();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/chat", chatRouter);
  app.use("/session", sessionRouter);

  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

    isRedisAvailable().then((redisUp) => {
      console.log(
        redisUp
          ? "Redis: connected"
          : "Redis: offline – falling back to SQLite only",
      );
    });
  });
}

main().catch((err) => {
  console.error("[fatal] Failed to start server:", err);
  process.exit(1);
});

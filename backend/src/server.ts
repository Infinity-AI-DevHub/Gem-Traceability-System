import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./database/pool.js";

const server = createApp().listen(env.PORT, "127.0.0.1", () => {
  console.log(`Origin backend listening on http://127.0.0.1:${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

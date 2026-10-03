import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { pool } from "./database/pool.js";
import { asyncHandler } from "./lib/async-handler.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { referenceRouter } from "./modules/reference/reference.routes.js";
import { stonesRouter } from "./modules/stones/stones.routes.js";
import { ledgerRouter } from "./modules/ledger/ledger.routes.js";
import { commandsRouter } from "./modules/commands/commands.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { requireAuth } from "./middleware/auth.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  if (env.NODE_ENV !== "test") app.use(pinoHttp());

  app.get("/api/v1/health", (_request, response) => {
    response.json({ status: "ok", service: "origin-backend" });
  });
  app.get("/api/v1/health/database", asyncHandler(async (_request, response) => {
    await pool.query("SELECT 1");
    response.json({ status: "ok", database: "mysql" });
  }));
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1", requireAuth);
  app.use("/api/v1/stones", stonesRouter);
  app.use("/api/v1/ledger", ledgerRouter);
  app.use("/api/v1/commands", commandsRouter);
  app.use("/api/v1", referenceRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

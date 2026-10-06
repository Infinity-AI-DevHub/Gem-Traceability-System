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
import { jewelleryRouter } from "./modules/jewellery/jewellery.routes.js";
import { uploadRoot } from "./lib/image-storage.js";
import { requireTrustedBrowserRequest } from "./middleware/request-security.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", "loopback");
  app.disable("x-powered-by");
  app.use(
    helmet({
      hsts:
        env.NODE_ENV === "production"
          ? { maxAge: 31_536_000, includeSubDomains: true }
          : false,
    }),
  );
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
      methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      maxAge: 600,
    }),
  );
  if (env.NODE_ENV !== "test")
    app.use(
      pinoHttp({
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            'res.headers["set-cookie"]',
          ],
          censor: "[Redacted]",
        },
      }),
    );

  app.get("/api/v1/health", (_request, response) => {
    response.json({ status: "ok", service: "origin-backend" });
  });
  app.get(
    "/api/v1/health/database",
    asyncHandler(async (_request, response) => {
      await pool.query("SELECT 1");
      response.json({ status: "ok", database: "mysql" });
    }),
  );
  app.use(requireTrustedBrowserRequest);
  app.use("/api/v1/auth", express.json({ limit: "32kb" }), authRouter);
  app.use("/uploads", requireAuth, express.static(uploadRoot, {
    fallthrough: false,
    index: false,
    cacheControl: false,
    setHeaders(response) {
      response.setHeader("Cache-Control", "private, max-age=604800");
    },
  }));
  app.use("/api/v1", requireAuth, express.json({ limit: "120mb" }));
  app.use("/api/v1/stones", stonesRouter);
  app.use("/api/v1/jewellery", jewelleryRouter);
  app.use("/api/v1/ledger", ledgerRouter);
  app.use("/api/v1/commands", commandsRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1", referenceRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

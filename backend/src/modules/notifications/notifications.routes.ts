import { Router } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { pool } from "../../database/pool.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { HttpError } from "../../lib/http-error.js";
import {
  deliverPendingPushNotifications,
  endpointHash,
  generateNotifications,
  pushConfiguration,
} from "./notifications.service.js";

export const notificationsRouter = Router();
const subscriptionSchema = z.object({
  endpoint: z.string().url().max(4000),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  }),
  deviceName: z.string().trim().min(1).max(120).optional(),
  browserName: z.string().trim().min(1).max(120).optional(),
  platformName: z.string().trim().min(1).max(120).optional(),
  persistAfterLogout: z.boolean().default(false),
});
const currentUserId = (response: { locals: { auditUser?: { id?: number } } }) => {
  const id = Number(response.locals.auditUser?.id);
  if (!id) throw new HttpError(401, "Please sign in again");
  return id;
};

notificationsRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    await generateNotifications();
    const userId = currentUserId(response);
    const [[rows], [counts]] = await Promise.all([
      pool.query<RowDataPacket[]>(
        `SELECT id,kind,severity,title,message,action_url,read_at,created_at
         FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 80`,
        [userId],
      ),
      pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) unread_count FROM notifications WHERE user_id=? AND read_at IS NULL",
        [userId],
      ),
    ]);
    response.json({
      data: {
        unreadCount: Number(counts[0]?.unread_count ?? 0),
        items: rows.map((row) => ({
          id: Number(row.id),
          kind: row.kind,
          severity: row.severity,
          title: row.title,
          message: row.message,
          actionUrl: row.action_url ?? "/dashboard",
          read: Boolean(row.read_at),
          createdAt: new Date(row.created_at).toISOString(),
        })),
      },
    });
  }),
);

notificationsRouter.patch(
  "/:id/read",
  asyncHandler(async (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id <= 0)
      throw new HttpError(422, "Please choose a notification");
    await pool.execute(
      "UPDATE notifications SET read_at=COALESCE(read_at,NOW(3)) WHERE id=? AND user_id=?",
      [id, currentUserId(response)],
    );
    response.json({ data: { ok: true } });
  }),
);

notificationsRouter.post(
  "/read-all",
  asyncHandler(async (_request, response) => {
    await pool.execute(
      "UPDATE notifications SET read_at=COALESCE(read_at,NOW(3)) WHERE user_id=?",
      [currentUserId(response)],
    );
    response.json({ data: { ok: true } });
  }),
);

notificationsRouter.get("/push-config", (_request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.json({ data: pushConfiguration });
});

notificationsRouter.post(
  "/push-subscriptions/status",
  asyncHandler(async (request, response) => {
    const input = z.object({ endpoint: z.string().url().max(4000) }).parse(request.body);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT active,persist_after_logout,device_name,browser_name
       FROM push_subscriptions WHERE endpoint_hash=? AND user_id=? LIMIT 1`,
      [endpointHash(input.endpoint), currentUserId(response)],
    );
    response.json({
      data: {
        saved: Boolean(rows[0]?.active && rows[0]?.persist_after_logout),
        deviceName: rows[0]?.device_name ?? "",
        browserName: rows[0]?.browser_name ?? "",
      },
    });
  }),
);

notificationsRouter.post(
  "/push-subscriptions",
  asyncHandler(async (request, response) => {
    if (!pushConfiguration.available)
      throw new HttpError(
        503,
        "Browser alerts are not ready yet. Please ask the administrator to finish the notification setup.",
      );
    const input = subscriptionSchema.parse(request.body);
    await pool.execute(
      `INSERT INTO push_subscriptions
        (user_id,endpoint_hash,endpoint,p256dh,auth_secret,user_agent,
         device_name,browser_name,platform_name,persist_after_logout,last_seen_at,active)
       VALUES (?,?,?,?,?,?,?,?,?,?,NOW(3),TRUE)
       ON DUPLICATE KEY UPDATE user_id=VALUES(user_id),endpoint=VALUES(endpoint),
         p256dh=VALUES(p256dh),auth_secret=VALUES(auth_secret),
         user_agent=VALUES(user_agent),device_name=VALUES(device_name),
         browser_name=VALUES(browser_name),platform_name=VALUES(platform_name),
         persist_after_logout=VALUES(persist_after_logout),last_seen_at=NOW(3),active=TRUE`,
      [
        currentUserId(response),
        endpointHash(input.endpoint),
        input.endpoint,
        input.keys.p256dh,
        input.keys.auth,
        request.get("User-Agent")?.slice(0, 500) ?? null,
        input.deviceName ?? null,
        input.browserName ?? null,
        input.platformName ?? null,
        input.persistAfterLogout,
      ],
    );
    const [subscriptions] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM push_subscriptions WHERE endpoint_hash=? LIMIT 1",
      [endpointHash(input.endpoint)],
    );
    const subscriptionId = Number(subscriptions[0]?.id);
    await pool.execute(
      `INSERT IGNORE INTO notification_deliveries
        (notification_id,subscription_id,delivered_at,attempted_at,attempts)
       SELECT id,?,NOW(3),NOW(3),1 FROM notifications WHERE user_id=?`,
      [subscriptionId, currentUserId(response)],
    );
    await pool.execute(
      `INSERT IGNORE INTO notifications
        (user_id,event_key,kind,severity,title,message,action_url)
       VALUES (?,?,'SYSTEM','SUCCESS','Browser alerts are ready',
         'This device will now show important alerts, even when the app is closed.','/dashboard')`,
      [currentUserId(response), `push-ready:${subscriptionId}`],
    );
    await deliverPendingPushNotifications();
    response.status(201).json({ data: { ok: true } });
  }),
);

notificationsRouter.delete(
  "/push-subscriptions",
  asyncHandler(async (request, response) => {
    const input = z.object({ endpoint: z.string().url().max(4000) }).parse(request.body);
    await pool.execute(
      "UPDATE push_subscriptions SET active=FALSE WHERE endpoint_hash=? AND user_id=?",
      [endpointHash(input.endpoint), currentUserId(response)],
    );
    response.status(204).end();
  }),
);

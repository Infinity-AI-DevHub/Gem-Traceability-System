import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import webpush from "web-push";
import { env } from "../../config/env.js";
import { pool } from "../../database/pool.js";

type DueItem = RowDataPacket & {
  source: string;
  source_id: string;
  stone_id: string;
  gem_type: string;
  owner_name: string;
  deadline_on: string | Date;
  action_url: string;
};

const pushReady = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
if (pushReady)
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY!,
    env.VAPID_PRIVATE_KEY!,
  );

const cleanDetail = (value: unknown) => {
  try {
    const details = typeof value === "string" ? JSON.parse(value) : value;
    const detail = (details as { detail?: unknown } | null)?.detail;
    return typeof detail === "string" && detail.trim()
      ? detail.trim()
      : "The record was updated.";
  } catch {
    return "The record was updated.";
  }
};

export async function generateNotifications() {
  await pool.query(`
    UPDATE notifications n
    LEFT JOIN workshop_jobs j
      ON j.id=SUBSTRING_INDEX(SUBSTRING_INDEX(n.event_key,':',3),':',-1)
      AND j.status IN ('PENDING_DISPATCH','WITH_PROVIDER')
    SET n.read_at=COALESCE(n.read_at,NOW(3))
    WHERE n.kind='DUE_DATE' AND n.event_key LIKE 'due:workshop:%' AND j.id IS NULL
  `);
  await pool.query(`
    UPDATE notifications n
    LEFT JOIN jewellery_jobs j
      ON j.id=SUBSTRING_INDEX(SUBSTRING_INDEX(n.event_key,':',3),':',-1)
      AND j.status='WITH_WORKSHOP'
    SET n.read_at=COALESCE(n.read_at,NOW(3))
    WHERE n.kind='DUE_DATE' AND n.event_key LIKE 'due:jewellery:%' AND j.id IS NULL
  `);
  await pool.query(`
    UPDATE notifications n
    LEFT JOIN salesman_handovers h
      ON h.id=SUBSTRING_INDEX(SUBSTRING_INDEX(n.event_key,':',3),':',-1)
      AND h.status='WITH_SALESMAN'
    SET n.read_at=COALESCE(n.read_at,NOW(3))
    WHERE n.kind='DUE_DATE' AND n.event_key LIKE 'due:salesman:%' AND h.id IS NULL
  `);
  await pool.query(`
    UPDATE notifications n
    LEFT JOIN promotion_handovers h
      ON h.id=SUBSTRING_INDEX(SUBSTRING_INDEX(n.event_key,':',3),':',-1)
      AND h.status='WITH_COMPANY'
    SET n.read_at=COALESCE(n.read_at,NOW(3))
    WHERE n.kind='DUE_DATE' AND n.event_key LIKE 'due:promotion:%' AND h.id IS NULL
  `);
  const [dueItems] = await pool.query<DueItem[]>(`
    SELECT 'workshop' source,j.id source_id,j.stone_id,s.gem_type,
      COALESCE(w.name,p.display_name,'the workshop') owner_name,j.due_on deadline_on,
      '/workshops' action_url
    FROM workshop_jobs j JOIN stones s ON s.id=j.stone_id
    LEFT JOIN workshops w ON w.id=j.workshop_id
    LEFT JOIN providers p ON p.id=j.provider_id
    WHERE j.status IN ('PENDING_DISPATCH','WITH_PROVIDER') AND j.due_on<=DATE_ADD(CURDATE(),INTERVAL 2 DAY)
    UNION ALL
    SELECT 'jewellery',j.id,j.stone_id,s.gem_type,w.name,j.deadline_on,'/jewellery'
    FROM jewellery_jobs j JOIN stones s ON s.id=j.stone_id JOIN workshops w ON w.id=j.workshop_id
    WHERE j.status='WITH_WORKSHOP' AND j.deadline_on<=DATE_ADD(CURDATE(),INTERVAL 2 DAY)
    UNION ALL
    SELECT 'salesman',h.id,h.stone_id,s.gem_type,sm.name,h.deadline_on,'/salesman-trials'
    FROM salesman_handovers h JOIN stones s ON s.id=h.stone_id JOIN salesmen sm ON sm.id=h.salesman_id
    WHERE h.status='WITH_SALESMAN' AND h.deadline_on<=DATE_ADD(CURDATE(),INTERVAL 2 DAY)
    UNION ALL
    SELECT 'promotion',h.id,h.stone_id,s.gem_type,c.name,h.deadline_on,'/promotions'
    FROM promotion_handovers h JOIN stones s ON s.id=h.stone_id JOIN companies c ON c.id=h.company_id
    WHERE h.status='WITH_COMPANY' AND h.deadline_on<=DATE_ADD(CURDATE(),INTERVAL 2 DAY)
  `);

  const [users] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE active=TRUE",
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const item of dueItems) {
    const deadline = new Date(item.deadline_on);
    deadline.setHours(0, 0, 0, 0);
    const days = Math.round((deadline.getTime() - today.getTime()) / 86_400_000);
    const phase = days < 0 ? "overdue" : `due-${days}`;
    const title =
      days < 0
        ? `Overdue: ${item.gem_type} should be returned`
        : days === 0
          ? `Due today: ${item.gem_type}`
          : days === 1
            ? `Due tomorrow: ${item.gem_type}`
            : `Due in two days: ${item.gem_type}`;
    const message =
      days < 0
        ? `${item.stone_id} was due back from ${item.owner_name} ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago. Please arrange its return.`
        : `${item.stone_id} should come back from ${item.owner_name} ${days === 0 ? "today" : days === 1 ? "tomorrow" : "in two days"}.`;
    for (const user of users)
      await pool.execute(
        `INSERT IGNORE INTO notifications
          (user_id,event_key,kind,severity,title,message,action_url)
         VALUES (?,?,?,?,?,?,?)`,
        [
          user.id,
          `due:${item.source}:${item.source_id}:${phase}`,
          "DUE_DATE",
          days < 0 ? "URGENT" : days === 0 ? "WARNING" : "INFO",
          title,
          message,
          item.action_url,
        ],
      );
  }

  const [events] = await pool.query<RowDataPacket[]>(`
    SELECT e.id,e.stone_id,e.title,e.details,s.gem_type
    FROM lifecycle_events e JOIN stones s ON s.id=e.stone_id
    WHERE e.occurred_at>=DATE_SUB(NOW(3),INTERVAL 7 DAY)
    ORDER BY e.id DESC LIMIT 300
  `);
  for (const event of events)
    for (const user of users)
      await pool.execute(
        `INSERT IGNORE INTO notifications
          (user_id,event_key,kind,severity,title,message,action_url)
         VALUES (?,?,?,?,?,?,?)`,
        [
          user.id,
          `lifecycle:${event.id}`,
          "ACTIVITY",
          "SUCCESS",
          String(event.title),
          `${event.gem_type} ${event.stone_id}: ${cleanDetail(event.details)}`,
          `/stones/${encodeURIComponent(String(event.stone_id))}`,
        ],
      );
}

export async function deliverPendingPushNotifications() {
  if (!pushReady) return;
  await pool.query(`
    INSERT IGNORE INTO notification_deliveries (notification_id,subscription_id)
    SELECT n.id,s.id FROM notifications n
    JOIN push_subscriptions s ON s.user_id=n.user_id AND s.active=TRUE
    WHERE n.created_at>=DATE_SUB(NOW(3),INTERVAL 7 DAY) AND n.read_at IS NULL
  `);
  const [deliveries] = await pool.query<RowDataPacket[]>(`
    SELECT d.notification_id,d.subscription_id,d.attempts,
      n.title,n.message,n.action_url,n.severity,
      s.endpoint,s.p256dh,s.auth_secret
    FROM notification_deliveries d
    JOIN notifications n ON n.id=d.notification_id
    JOIN push_subscriptions s ON s.id=d.subscription_id
    WHERE d.delivered_at IS NULL AND d.attempts<3 AND s.active=TRUE
    ORDER BY n.created_at LIMIT 100
  `);
  for (const item of deliveries) {
    try {
      await webpush.sendNotification(
        {
          endpoint: item.endpoint,
          keys: { p256dh: item.p256dh, auth: item.auth_secret },
        },
        JSON.stringify({
          title: item.title,
          body: item.message,
          url: item.action_url || "/dashboard",
          severity: item.severity,
          tag: `origin-${item.notification_id}`,
        }),
        { TTL: 60 * 60 * 24 },
      );
      await pool.execute(
        "UPDATE notification_deliveries SET delivered_at=NOW(3),attempted_at=NOW(3),attempts=attempts+1,last_error=NULL WHERE notification_id=? AND subscription_id=?",
        [item.notification_id, item.subscription_id],
      );
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number }).statusCode);
      const message =
        error instanceof Error ? error.message.slice(0, 255) : "Delivery failed";
      await pool.execute(
        "UPDATE notification_deliveries SET attempted_at=NOW(3),attempts=attempts+1,last_error=? WHERE notification_id=? AND subscription_id=?",
        [message, item.notification_id, item.subscription_id],
      );
      if (statusCode === 404 || statusCode === 410)
        await pool.execute(
          "UPDATE push_subscriptions SET active=FALSE WHERE id=?",
          [item.subscription_id],
        );
    }
  }
}

export function startNotificationWorker() {
  const run = async () => {
    try {
      await generateNotifications();
      await deliverPendingPushNotifications();
    } catch (error) {
      console.error("Notification worker could not finish", error);
    }
  };
  void run();
  const timer = setInterval(() => void run(), 60_000);
  timer.unref();
}

export const pushConfiguration = {
  available: pushReady,
  publicKey: env.VAPID_PUBLIC_KEY ?? "",
};

export const endpointHash = (endpoint: string) =>
  createHash("sha256").update(endpoint).digest("hex");

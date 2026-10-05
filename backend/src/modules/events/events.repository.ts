import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../../database/pool.js";
import type { StoneRow } from "../../types/domain.js";

type Queryable = Pick<PoolConnection, "execute">;

export async function addEvent(
  database: Queryable,
  input: {
    stoneId: string;
    eventType: string;
    title: string;
    details: Record<string, unknown>;
    actorContactId?: number | null;
  },
) {
  await database.execute(
    "INSERT INTO lifecycle_events (stone_id, event_type, title, details, actor_contact_id) VALUES (?, ?, ?, ?, ?)",
    [
      input.stoneId,
      input.eventType,
      input.title,
      JSON.stringify(input.details),
      input.actorContactId ?? null,
    ],
  );
}

export function stoneSnapshot(stone: StoneRow & Partial<RowDataPacket>) {
  return {
    productId: stone.productId,
    gemType: stone.gemType,
    origin: stone.origin,
    currentWeight: Number(stone.currentWeight),
    intakeWeight: Number(stone.intakeWeight),
    color: stone.color,
    shape: stone.shape,
    cutStyle: stone.cutStyle ?? null,
    purchaseCost: Number(stone.purchaseCost),
    status: stone.status,
    location: stone.locationName ?? null,
    custodian: stone.custodianName ?? null,
    treatmentDisclosure: stone.treatmentDisclosure,
    certificateReference: stone.certificateReference,
    seller: stone.sellerName ?? null,
    acquiredOn: stone.acquiredOn,
    notes: stone.notes,
    version: Number(stone.version),
  };
}

export function changedValues(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.keys(after)
      .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      .map((key) => [key, { from: before[key] ?? null, to: after[key] ?? null }]),
  );
}

export async function listEvents(stoneId: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT e.id, e.stone_id AS stoneId, e.event_type AS eventType, e.title, e.details,
      e.occurred_at AS occurredAt, actor.display_name AS actorName
     FROM lifecycle_events e LEFT JOIN contacts actor ON actor.id = e.actor_contact_id
     WHERE e.stone_id = ? ORDER BY e.occurred_at DESC, e.id DESC`,
    [stoneId],
  );
  return rows;
}

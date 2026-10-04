import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { transaction } from "../../database/pool.js";
import { addEvent } from "../events/events.repository.js";
import { requireStone, updateStoneState } from "./stones.repository.js";
import type { z } from "zod";
import type {
  intakeStone,
  placeHold,
  transferCustody,
} from "./stones.schemas.js";
import { HttpError } from "../../lib/http-error.js";
import { randomUUID } from "node:crypto";

type Intake = z.infer<typeof intakeStone>;

async function resolveLocation(
  connection: Parameters<Parameters<typeof transaction>[0]>[0],
  input: Intake,
) {
  if (input.locationId) return input.locationId;
  if (!input.locationName)
    throw new HttpError(422, "A receiving location is required");
  await connection.execute(
    "INSERT INTO locations (name, location_type) VALUES (?, 'VAULT') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
    [input.locationName],
  );
  const [rows] = await connection.query<RowDataPacket[]>(
    "SELECT id FROM locations WHERE name=?",
    [input.locationName],
  );
  return Number(rows[0]?.id);
}

async function resolveSeller(
  connection: Parameters<Parameters<typeof transaction>[0]>[0],
  input: Intake,
) {
  if (input.sellerId) {
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM sellers WHERE id=? AND active=TRUE LIMIT 1",
      [input.sellerId],
    );
    if (!rows[0]) throw new HttpError(422, "Select an active seller");
    return input.sellerId;
  }
  if (!input.sellerName) return null;
  await connection.execute(
    `INSERT INTO sellers (name,phone,email,locality) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE phone=COALESCE(VALUES(phone),phone),email=COALESCE(VALUES(email),email),locality=COALESCE(VALUES(locality),locality)`,
    [
      input.sellerName,
      input.sellerPhone || null,
      input.sellerEmail || null,
      input.sellerLocality || null,
    ],
  );
  const [rows] = await connection.query<RowDataPacket[]>(
    "SELECT id FROM sellers WHERE name=? LIMIT 1",
    [input.sellerName],
  );
  return Number(rows[0]?.id);
}

function gemCode(gemType: string) {
  const normalized = gemType.toUpperCase();
  if (normalized.includes("SAPPHIRE") || normalized.includes("PADPARADSCHA"))
    return "SAP";
  if (normalized.includes("RUBY")) return "RUB";
  if (normalized.includes("SPINEL")) return "SPI";
  return normalized
    .replace(/[^A-Z]/g, "")
    .slice(0, 3)
    .padEnd(3, "X");
}

async function nextStoneId(
  connection: Parameters<Parameters<typeof transaction>[0]>[0],
  input: Intake,
) {
  if (input.id) return input.id;
  const year = new Date(input.acquiredOn).getUTCFullYear();
  const code = gemCode(input.gemType);
  await connection.execute(
    `INSERT INTO stone_sequences (year_number, gem_code, last_number) VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)`,
    [year, code],
  );
  const [rows] = await connection.execute<RowDataPacket[]>(
    "SELECT last_number AS number FROM stone_sequences WHERE year_number = ? AND gem_code = ? FOR UPDATE",
    [year, code],
  );
  const number = Number(rows[0]?.number ?? 1);
  return `GEM-${code}-${String(year).slice(-2)}-${String(number).padStart(4, "0")}`;
}

export async function receiveStone(input: Intake) {
  return transaction(async (connection) => {
    const id = await nextStoneId(connection, input);
    const locationId = await resolveLocation(connection, input);
    const sellerId = await resolveSeller(connection, input);
    const productId = `PRD-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    const qrToken = randomUUID();
    try {
      await connection.execute<ResultSetHeader>(
        `INSERT INTO stones
          (id, product_id, qr_token, gem_type, origin, current_weight, intake_weight, color, shape, cut_style, purchase_cost,
           status, location_id, treatment_disclosure, certificate_reference, seller_id, acquired_on, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?, ?, ?, ?, ?)`,
        [
          id,
          productId,
          qrToken,
          input.gemType,
          input.origin,
          input.weight,
          input.weight,
          input.color ?? null,
          input.shape ?? null,
          input.cutStyle ?? null,
          input.purchaseCost,
          locationId,
          input.treatmentDisclosure,
          input.certificateReference ?? null,
          sellerId ?? null,
          input.acquiredOn,
          input.notes ?? null,
        ],
      );
    } catch (error) {
      if ((error as { code?: string }).code === "ER_DUP_ENTRY")
        throw new HttpError(409, `Stone ${id} already exists`);
      throw error;
    }
    await addEvent(connection, {
      stoneId: id,
      eventType: "INTAKE",
      title: "Stone received",
      details: {
        origin: input.origin,
        intakeWeight: input.weight,
        purchaseCost: input.purchaseCost,
      },
    });
    return requireStone(id, connection);
  });
}

export async function editStoneRecord(
  id: string,
  input: Intake & { expectedVersion: number },
) {
  return transaction(async (connection) => {
    const stone = await requireStone(id, connection);
    const locationId = await resolveLocation(connection, input);
    const sellerId = await resolveSeller(connection, input);
    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE stones SET gem_type=?, origin=?,
       current_weight=IF(current_weight=intake_weight, ?, current_weight), intake_weight=?,
       color=?, shape=?, cut_style=?, purchase_cost=?, location_id=?, treatment_disclosure=?,
       certificate_reference=?, seller_id=?, acquired_on=?, notes=?, version=version+1
       WHERE id=? AND version=?`,
      [
        input.gemType,
        input.origin,
        input.weight,
        input.weight,
        input.color ?? null,
        input.shape ?? null,
        input.cutStyle ?? null,
        input.purchaseCost,
        locationId,
        input.treatmentDisclosure,
        input.certificateReference ?? null,
        sellerId,
        input.acquiredOn,
        input.notes ?? null,
        id,
        input.expectedVersion,
      ],
    );
    if (result.affectedRows !== 1)
      throw new HttpError(
        409,
        "The stone changed since it was loaded. Refresh and try again.",
      );
    await addEvent(connection, {
      stoneId: id,
      eventType: "RECORD_UPDATE",
      title: "Stone details updated",
      details: {
        detail: `Core intake details updated from version ${stone.version}.`,
      },
    });
    return requireStone(id, connection);
  });
}

export async function moveStone(
  id: string,
  input: z.infer<typeof transferCustody>,
) {
  return transaction(async (connection) => {
    const stone = await requireStone(id, connection);
    if (stone.status === "SOLD")
      throw new HttpError(
        409,
        "Sold stones cannot be moved into internal custody",
      );
    await updateStoneState(connection, id, input.expectedVersion, {
      locationId: input.locationId,
      custodianContactId: input.custodianContactId,
    });
    await addEvent(connection, {
      stoneId: id,
      eventType: "CUSTODY_TRANSFER",
      title: "Custody transferred",
      details: {
        fromLocationId: stone.locationId,
        toLocationId: input.locationId,
        notes: input.notes ?? null,
      },
    });
    return requireStone(id, connection);
  });
}

export async function holdStone(id: string, input: z.infer<typeof placeHold>) {
  return transaction(async (connection) => {
    const stone = await requireStone(id, connection);
    if (stone.status !== "AVAILABLE")
      throw new HttpError(409, "Only available stones can be placed on hold");
    await updateStoneState(connection, id, input.expectedVersion, {
      status: "ON_HOLD",
    });
    await addEvent(connection, {
      stoneId: id,
      eventType: "HOLD_PLACED",
      title: "Stone placed on hold",
      details: { reason: input.reason },
    });
    return requireStone(id, connection);
  });
}

export async function clearStoneHold(
  id: string,
  input: z.infer<typeof placeHold>,
) {
  return transaction(async (connection) => {
    const stone = await requireStone(id, connection);
    if (stone.status !== "ON_HOLD")
      throw new HttpError(409, "Stone is not on hold");
    await updateStoneState(connection, id, input.expectedVersion, {
      status: "AVAILABLE",
    });
    await addEvent(connection, {
      stoneId: id,
      eventType: "HOLD_CLEARED",
      title: "Hold cleared",
      details: { reason: input.reason },
    });
    return requireStone(id, connection);
  });
}

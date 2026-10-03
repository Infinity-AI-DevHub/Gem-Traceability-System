import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { transaction } from "../../database/pool.js";
import { addEvent } from "../events/events.repository.js";
import { requireStone, updateStoneState } from "./stones.repository.js";
import type { z } from "zod";
import type { intakeStone, placeHold, transferCustody } from "./stones.schemas.js";
import { HttpError } from "../../lib/http-error.js";

type Intake = z.infer<typeof intakeStone>;

function gemCode(gemType: string) {
  const normalized = gemType.toUpperCase();
  if (normalized.includes("SAPPHIRE") || normalized.includes("PADPARADSCHA")) return "SAP";
  if (normalized.includes("RUBY")) return "RUB";
  if (normalized.includes("SPINEL")) return "SPI";
  return normalized.replace(/[^A-Z]/g, "").slice(0, 3).padEnd(3, "X");
}

async function nextStoneId(connection: Parameters<Parameters<typeof transaction>[0]>[0], input: Intake) {
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
    let locationId=input.locationId;
    if(!locationId){const locationName=input.locationName;if(!locationName)throw new HttpError(422,"A receiving location is required");await connection.execute("INSERT INTO locations (name, location_type) VALUES (?, 'VAULT') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",[locationName]);const[rows]=await connection.query<RowDataPacket[]>("SELECT id FROM locations WHERE name=?",[locationName]);locationId=Number(rows[0]?.id)}
    let sellerContactId=input.sellerContactId;
    if(!sellerContactId&&input.sellerName){await connection.execute("INSERT INTO contacts (display_name, role) SELECT ?, 'SELLER' WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE display_name=? AND role='SELLER')",[input.sellerName,input.sellerName]);const[rows]=await connection.query<RowDataPacket[]>("SELECT id FROM contacts WHERE display_name=? AND role='SELLER' LIMIT 1",[input.sellerName]);sellerContactId=Number(rows[0]?.id)}
    try {
      await connection.execute<ResultSetHeader>(
        `INSERT INTO stones
          (id, gem_type, origin, current_weight, intake_weight, color, shape, purchase_cost,
           status, location_id, treatment_disclosure, certificate_reference, seller_contact_id, acquired_on, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?, ?, ?, ?, ?)`,
        [id, input.gemType, input.origin, input.weight, input.weight, input.color ?? null, input.shape ?? null,
          input.purchaseCost, locationId, input.treatmentDisclosure, input.certificateReference ?? null,
          sellerContactId ?? null, input.acquiredOn, input.notes ?? null],
      );
    } catch (error) {
      if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new HttpError(409, `Stone ${id} already exists`);
      throw error;
    }
    await addEvent(connection, {
      stoneId: id,
      eventType: "INTAKE",
      title: "Stone received",
      details: { origin: input.origin, intakeWeight: input.weight, purchaseCost: input.purchaseCost },
    });
    return requireStone(id, connection);
  });
}

export async function moveStone(id: string, input: z.infer<typeof transferCustody>) {
  return transaction(async (connection) => {
    const stone = await requireStone(id, connection);
    if (stone.status === "SOLD") throw new HttpError(409, "Sold stones cannot be moved into internal custody");
    await updateStoneState(connection, id, input.expectedVersion, {
      locationId: input.locationId,
      custodianContactId: input.custodianContactId,
    });
    await addEvent(connection, {
      stoneId: id,
      eventType: "CUSTODY_TRANSFER",
      title: "Custody transferred",
      details: { fromLocationId: stone.locationId, toLocationId: input.locationId, notes: input.notes ?? null },
    });
    return requireStone(id, connection);
  });
}

export async function holdStone(id: string, input: z.infer<typeof placeHold>) {
  return transaction(async (connection) => {
    const stone = await requireStone(id, connection);
    if (stone.status !== "AVAILABLE") throw new HttpError(409, "Only available stones can be placed on hold");
    await updateStoneState(connection, id, input.expectedVersion, { status: "ON_HOLD" });
    await addEvent(connection, { stoneId: id, eventType: "HOLD_PLACED", title: "Stone placed on hold", details: { reason: input.reason } });
    return requireStone(id, connection);
  });
}

export async function clearStoneHold(id: string, input: z.infer<typeof placeHold>) {
  return transaction(async (connection) => {
    const stone = await requireStone(id, connection);
    if (stone.status !== "ON_HOLD") throw new HttpError(409, "Stone is not on hold");
    await updateStoneState(connection, id, input.expectedVersion, { status: "AVAILABLE" });
    await addEvent(connection, { stoneId: id, eventType: "HOLD_CLEARED", title: "Hold cleared", details: { reason: input.reason } });
    return requireStone(id, connection);
  });
}

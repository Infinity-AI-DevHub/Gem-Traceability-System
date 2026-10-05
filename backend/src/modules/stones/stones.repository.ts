import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { pool } from "../../database/pool.js";
import { HttpError } from "../../lib/http-error.js";
import type { StoneRow, StoneStatus } from "../../types/domain.js";

type Queryable = Pick<PoolConnection, "execute">;

const selectStone = `SELECT
  s.id, s.product_id AS productId, s.qr_token AS qrToken,
  s.gem_type AS gemType, s.origin, s.current_weight AS currentWeight,
  s.intake_weight AS intakeWeight, s.color, s.shape, s.cut_style AS cutStyle, s.purchase_cost AS purchaseCost,
  s.status, s.location_id AS locationId,
  s.custodian_contact_id AS custodianContactId, s.treatment_disclosure AS treatmentDisclosure,
  s.certificate_reference AS certificateReference, s.seller_contact_id AS sellerContactId,
  s.seller_id AS sellerId,
  DATE_FORMAT(s.acquired_on, '%Y-%m-%d') AS acquiredOn, s.notes, s.version,
  s.created_at AS createdAt, s.updated_at AS updatedAt,
  l.name AS locationName, l.is_external AS locationIsExternal,
  custodian.display_name AS custodianName, COALESCE(seller_record.name,seller.display_name) AS sellerName
FROM stones s
LEFT JOIN locations l ON l.id = s.location_id
LEFT JOIN contacts custodian ON custodian.id = s.custodian_contact_id
LEFT JOIN contacts seller ON seller.id = s.seller_contact_id
LEFT JOIN sellers seller_record ON seller_record.id = s.seller_id`;

export async function listStones(input: {
  status?: StoneStatus;
  search?: string;
  limit: number;
  offset: number;
}) {
  const where: string[] = [];
  const values: Array<string | number> = [];
  if (input.status) {
    where.push("s.status = ?");
    values.push(input.status);
  }
  if (input.search) {
    where.push(
      "(s.id LIKE ? OR s.product_id LIKE ? OR s.gem_type LIKE ? OR s.origin LIKE ?)",
    );
    const search = `%${input.search}%`;
    values.push(search, search, search, search);
  }
  values.push(input.limit, input.offset);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `${selectStone} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    values,
  );
  return rows;
}

export async function findStone(id: string, database: Queryable = pool) {
  const [rows] = await database.execute<RowDataPacket[]>(
    `${selectStone} WHERE s.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] as (StoneRow & RowDataPacket) | undefined;
}

export async function requireStone(id: string, database: Queryable = pool) {
  const stone = await findStone(id, database);
  if (!stone) throw new HttpError(404, `Stone ${id} was not found`);
  return stone;
}

export async function updateStoneState(
  database: Queryable,
  id: string,
  expectedVersion: number,
  update: {
    status?: StoneStatus;
    locationId?: number;
    custodianContactId?: number | null;
    currentWeight?: number;
    treatmentDisclosure?: string;
    certificateReference?: string | null;
  },
) {
  const fields: string[] = [];
  const values: Array<string | number | null> = [];
  const columnMap = {
    status: "status",
    locationId: "location_id",
    custodianContactId: "custodian_contact_id",
    currentWeight: "current_weight",
    treatmentDisclosure: "treatment_disclosure",
    certificateReference: "certificate_reference",
  } as const;
  for (const [key, column] of Object.entries(columnMap)) {
    const value = update[key as keyof typeof update];
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      values.push(value);
    }
  }
  fields.push("version = version + 1");
  values.push(id, expectedVersion);
  const [result] = await database.execute<ResultSetHeader>(
    `UPDATE stones SET ${fields.join(", ")} WHERE id = ? AND version = ?`,
    values,
  );
  if (result.affectedRows !== 1)
    throw new HttpError(
      409,
      "The stone changed since it was loaded. Refresh and try again.",
    );
}

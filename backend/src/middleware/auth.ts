import { createHash } from "node:crypto";
import type { RequestHandler } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../database/pool.js";
import { HttpError } from "../lib/http-error.js";

export const requireAuth: RequestHandler = async (request, _response, next) => {
  try {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) throw new HttpError(401, "Authentication required");
    const id = createHash("sha256").update(token).digest("hex");
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id FROM user_sessions s JOIN users u ON u.id=s.user_id
      WHERE s.id=? AND s.expires_at>NOW() AND u.active=TRUE LIMIT 1`,
      [id],
    );
    if (!rows[0]) throw new HttpError(401, "Session expired or invalid");
    next();
  } catch (error) {
    next(error);
  }
};

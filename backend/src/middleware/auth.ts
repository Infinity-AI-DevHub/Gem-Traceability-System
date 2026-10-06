import type { RequestHandler } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../database/pool.js";
import { HttpError } from "../lib/http-error.js";
import { hashSessionToken, readSessionToken } from "../lib/session.js";

export const requireAuth: RequestHandler = async (request, _response, next) => {
  try {
    const token = readSessionToken(request);
    if (!token) throw new HttpError(401, "Authentication required");
    const id = hashSessionToken(token);
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id,u.username,u.display_name,u.role FROM user_sessions s JOIN users u ON u.id=s.user_id
      WHERE s.id=? AND s.expires_at>NOW() AND u.active=TRUE LIMIT 1`,
      [id],
    );
    if (!rows[0]) throw new HttpError(401, "Session expired or invalid");
    if (request.method !== "GET" && rows[0].role === "VIEWER")
      throw new HttpError(403, "Your account has read-only access");
    _response.locals.auditUser = {
      id: Number(rows[0].id),
      name: rows[0].display_name || rows[0].username,
    };
    next();
  } catch (error) {
    next(error);
  }
};

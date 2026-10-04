import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { pool } from "../../database/pool.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { HttpError } from "../../lib/http-error.js";
import { verifyPassword } from "../../lib/password.js";

export const authRouter = Router();
const credentials = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(8).max(200),
});
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

authRouter.post(
  "/login",
  asyncHandler(async (request, response) => {
    const input = credentials.parse(request.body);
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id,username,password_hash,display_name,role FROM users WHERE username=? AND active=TRUE LIMIT 1",
      [input.username],
    );
    const user = rows[0];
    if (!user || !verifyPassword(input.password, String(user.password_hash)))
      throw new HttpError(401, "Invalid username or password");
    const token = randomBytes(32).toString("hex");
    await pool.execute("DELETE FROM user_sessions WHERE expires_at <= NOW()");
    await pool.execute<ResultSetHeader>(
      "INSERT INTO user_sessions (id,user_id,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 12 HOUR))",
      [tokenHash(token), user.id],
    );
    response.json({
      data: {
        token,
        user: {
          username: user.username,
          displayName: user.display_name,
          role: user.role,
        },
      },
    });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (request, response) => {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (token)
      await pool.execute("DELETE FROM user_sessions WHERE id=?", [
        tokenHash(token),
      ]);
    response.status(204).end();
  }),
);

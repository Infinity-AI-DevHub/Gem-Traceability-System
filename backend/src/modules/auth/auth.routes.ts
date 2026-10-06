import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { env } from "../../config/env.js";
import { pool } from "../../database/pool.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { HttpError } from "../../lib/http-error.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import {
  clearLegacySessionCookie,
  createSessionCookie,
  hashSessionToken,
  readSessionToken,
  sessionHours,
} from "../../lib/session.js";

export const authRouter = Router();
const credentials = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(8).max(200),
});
const failureLimit = 5;
const blockMinutes = 15;
const dummyPasswordHash = hashPassword("invalid-password-timing-placeholder");
const loginKeyHash = (value: string) =>
  createHash("sha256").update(`origin-login:${value}`).digest("hex");

function loginKeys(username: string, ip: string | undefined) {
  return [
    {
      hash: loginKeyHash(
        `username:${username.trim().toLocaleLowerCase("en-US")}`,
      ),
      limit: failureLimit,
    },
    { hash: loginKeyHash(`ip:${ip || "unknown"}`), limit: 25 },
  ];
}

async function isLoginBlocked(keys: Array<{ hash: string; limit: number }>) {
  const placeholders = keys.map(() => "?").join(",");
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 FROM auth_login_limits
     WHERE key_hash IN (${placeholders}) AND blocked_until > NOW(3) LIMIT 1`,
    keys.map((key) => key.hash),
  );
  return Boolean(rows[0]);
}

async function recordLoginFailure(
  keys: Array<{ hash: string; limit: number }>,
) {
  for (const key of keys) {
    await pool.execute(
      `INSERT INTO auth_login_limits
        (key_hash,failures,window_started_at,blocked_until)
       VALUES (?,1,NOW(3),NULL)
       ON DUPLICATE KEY UPDATE
         failures=IF(window_started_at < DATE_SUB(NOW(3), INTERVAL ${blockMinutes} MINUTE),1,failures+1),
         window_started_at=IF(window_started_at < DATE_SUB(NOW(3), INTERVAL ${blockMinutes} MINUTE),NOW(3),window_started_at),
         blocked_until=IF(failures >= ${key.limit},DATE_ADD(NOW(3), INTERVAL ${blockMinutes} MINUTE),blocked_until)`,
      [key.hash],
    );
  }
}

function setNoStore(response: {
  setHeader(name: string, value: string | string[]): void;
}) {
  response.setHeader("Cache-Control", "no-store");
}

authRouter.post(
  "/login",
  asyncHandler(async (request, response) => {
    setNoStore(response);
    const input = credentials.parse(request.body);
    const keys = loginKeys(input.username, request.ip);
    if (await isLoginBlocked(keys)) {
      response.setHeader("Retry-After", String(blockMinutes * 60));
      throw new HttpError(
        429,
        "Too many sign-in attempts. Try again in 15 minutes",
      );
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id,username,password_hash,display_name,role,locked_until
       FROM users WHERE username=? AND active=TRUE LIMIT 1`,
      [input.username],
    );
    const user = rows[0];
    const passwordMatches = verifyPassword(
      input.password,
      String(user?.password_hash ?? dummyPasswordHash),
    );
    const accountLocked =
      user?.locked_until && new Date(user.locked_until).getTime() > Date.now();

    if (!user || !passwordMatches || accountLocked) {
      await recordLoginFailure(keys);
      if (user && !accountLocked) {
        const lockExpired =
          user.locked_until &&
          new Date(user.locked_until).getTime() <= Date.now();
        if (lockExpired) {
          await pool.execute(
            "UPDATE users SET failed_login_attempts=1,locked_until=NULL WHERE id=?",
            [user.id],
          );
        } else {
          await pool.execute(
            `UPDATE users SET
               failed_login_attempts=failed_login_attempts+1,
               locked_until=IF(failed_login_attempts+1>=?,DATE_ADD(NOW(3), INTERVAL ? MINUTE),locked_until)
             WHERE id=?`,
            [failureLimit, blockMinutes, user.id],
          );
        }
      }
      throw new HttpError(401, "Invalid username or password");
    }

    const token = randomBytes(32).toString("base64url");
    const id = hashSessionToken(token);
    await pool.execute("DELETE FROM user_sessions WHERE expires_at <= NOW(3)");
    await pool.execute(
      "DELETE FROM auth_login_limits WHERE updated_at < DATE_SUB(NOW(3), INTERVAL 1 DAY)",
    );
    await pool.execute<ResultSetHeader>(
      `INSERT INTO user_sessions (id,user_id,expires_at)
       VALUES (?,?,DATE_ADD(NOW(3), INTERVAL ${sessionHours} HOUR))`,
      [id, user.id],
    );
    await pool.execute(
      "UPDATE users SET failed_login_attempts=0,locked_until=NULL,last_login_at=NOW(3) WHERE id=?",
      [user.id],
    );
    await pool.execute(
      `DELETE FROM auth_login_limits WHERE key_hash IN (${keys.map(() => "?").join(",")})`,
      keys.map((key) => key.hash),
    );

    const cookies = [createSessionCookie(token)];
    if (env.NODE_ENV === "production") cookies.push(clearLegacySessionCookie());
    response.setHeader("Set-Cookie", cookies);
    response.json({
      data: {
        user: {
          username: user.username,
          displayName: user.display_name,
          role: user.role,
        },
      },
    });
  }),
);

authRouter.get(
  "/session",
  asyncHandler(async (request, response) => {
    setNoStore(response);
    const token = readSessionToken(request);
    if (!token) throw new HttpError(401, "Authentication required");
    const id = hashSessionToken(token);
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.username,u.display_name,u.role
       FROM user_sessions s JOIN users u ON u.id=s.user_id
       WHERE s.id=? AND s.expires_at>NOW(3) AND u.active=TRUE LIMIT 1`,
      [id],
    );
    const user = rows[0];
    if (!user) throw new HttpError(401, "Session expired or invalid");
    await pool.execute("UPDATE user_sessions SET last_seen_at=NOW(3) WHERE id=?", [
      id,
    ]);
    response.json({
      data: {
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      },
    });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (request, response) => {
    setNoStore(response);
    const token = readSessionToken(request);
    if (token)
      await pool.execute("DELETE FROM user_sessions WHERE id=?", [
        hashSessionToken(token),
      ]);
    response.setHeader("Set-Cookie", [
      createSessionCookie("", true),
      clearLegacySessionCookie(),
    ]);
    response.status(204).end();
  }),
);

import { createHash } from "node:crypto";
import { env } from "../config/env.js";

export const sessionCookieName =
  env.NODE_ENV === "production" ? "__Host-origin_session" : "origin_session";
// Browsers may enforce their own cookie lifetime limits, but the application
// does not expire an authenticated session on a timer. Each session remains
// valid until the user signs out, changes their password from another session,
// or an administrator revokes it.
export const sessionMaxAgeSeconds = 60 * 60 * 24 * 365 * 10;

export const hashSessionToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export function readSessionToken(request: {
  headers: { cookie?: string; authorization?: string };
}) {
  const bearer = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) return bearer;
  const cookies = new Map(
    (request.headers.cookie ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return separator < 0
          ? [part, ""]
          : [part.slice(0, separator), part.slice(separator + 1)];
      }),
  );
  const value =
    cookies.get(sessionCookieName) ?? cookies.get("origin_session");
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export const createSessionCookie = (token: string, clear = false) =>
  `${sessionCookieName}=${clear ? "" : encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${clear ? 0 : sessionMaxAgeSeconds}${env.NODE_ENV === "production" ? "; Secure" : ""}`;

export const clearLegacySessionCookie = () =>
  "origin_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0";

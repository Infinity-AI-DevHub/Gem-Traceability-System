import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export const requireTrustedBrowserRequest: RequestHandler = (
  request,
  _response,
  next,
) => {
  if (safeMethods.has(request.method) || request.headers.authorization) {
    next();
    return;
  }

  try {
    if (request.get("X-Requested-With") !== "XMLHttpRequest")
      throw new HttpError(403, "This request could not be verified");

    const origin = request.get("Origin");
    const referer = request.get("Referer");
    let sourceOrigin: string | undefined;
    if (origin) sourceOrigin = origin;
    else if (referer) {
      try {
        sourceOrigin = new URL(referer).origin;
      } catch {
        throw new HttpError(403, "This request could not be verified");
      }
    }
    if (!sourceOrigin || sourceOrigin !== new URL(env.FRONTEND_ORIGIN).origin)
      throw new HttpError(403, "This request could not be verified");
    next();
  } catch (error) {
    next(error);
  }
};

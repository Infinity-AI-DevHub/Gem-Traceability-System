import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/http-error.js";

export const notFound: RequestHandler = (request, _response, next) => {
  next(
    new HttpError(
      404,
      `Route ${request.method} ${request.originalUrl} was not found`,
    ),
  );
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
  void next;
  if (error instanceof ZodError) {
    response
      .status(422)
      .json({ error: "Validation failed", details: error.flatten() });
    return;
  }
  if (error instanceof HttpError) {
    response
      .status(error.status)
      .json({ error: error.message, details: error.details });
    return;
  }
  response.status(500).json({ error: "Internal server error" });
};

import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/http-error.js";

const validationMessages: Record<string, string> = {
  gemType: "Choose a gem type.",
  origin: "Choose an origin or locality.",
  weight: "Enter a stone weight greater than zero.",
  purchaseCost: "Enter a valid purchase cost. Use 0 when there was no cost.",
  treatmentDisclosure: "Choose the stone's treatment status.",
  acquiredOn: "Choose a valid purchase date.",
  sellerId: "Choose a valid supplier.",
  sellerEmail: "Enter a valid supplier email address or leave it empty.",
  locationId: "Choose a valid receiving location.",
  locationName: "Enter a receiving location.",
  images: "Check the stone images and try again.",
  sellerImages: "Check the supplier images and try again.",
};

function readableValidationError(error: ZodError) {
  const issue = error.issues[0];
  const field = issue?.path.find((part) => typeof part === "string");
  if (typeof field === "string" && validationMessages[field])
    return validationMessages[field];
  if (issue?.message === "A receiving location is required")
    return "Enter a receiving location.";
  return "Please check the highlighted information and try again.";
}

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
      .json({ error: readableValidationError(error), details: error.flatten() });
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

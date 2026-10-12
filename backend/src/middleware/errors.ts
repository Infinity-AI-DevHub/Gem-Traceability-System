import type { ErrorRequestHandler, Request, RequestHandler } from "express";
import { ZodError, type ZodIssue } from "zod";
import { HttpError } from "../lib/http-error.js";

type PublicError = {
  status: number;
  message: string;
  code: string;
  details?: unknown;
};

type DatabaseError = Error & {
  code?: string;
  errno?: number;
  sqlMessage?: string;
  sqlState?: string;
};

const fieldLabels: Record<string, string> = {
  acquiredOn: "purchase date",
  actionUrl: "notification link",
  address: "address",
  amount: "payment amount",
  browserName: "browser name",
  captured: "image source",
  categoryKey: "category",
  certificateReference: "certificate reference",
  color: "colour",
  companyId: "company",
  cost: "cost",
  currentPassword: "current password",
  cutStyle: "cut",
  dataUrl: "image",
  deadlineAt: "deadline",
  description: "description",
  deviceName: "device name",
  displayName: "name",
  due: "due date",
  email: "email address",
  endpoint: "notification address",
  expectedVersion: "record version",
  finalPrice: "selling price",
  gemType: "gem type",
  handoverAt: "handover date and time",
  handoverDate: "handover date",
  images: "images",
  itemSize: "item size",
  itemType: "jewellery type",
  jewelleryId: "jewellery item",
  key: "notification key",
  kind: "process",
  locality: "locality",
  location: "location",
  locationId: "receiving location",
  locationName: "receiving location",
  locationType: "location type",
  metalPurity: "metal purity",
  metalType: "metal type",
  metalWeight: "metal weight",
  name: "name",
  newPassword: "new password",
  notes: "notes",
  operation: "operation",
  origin: "origin or locality",
  password: "password",
  paymentMethod: "payment method",
  phone: "phone number",
  platformName: "device platform",
  price: "price",
  process: "process",
  providerId: "provider",
  quotedPrice: "quoted price",
  reason: "reason",
  report: "report reference",
  returnedAt: "received date and time",
  returnedWeight: "returned weight",
  role: "contact type",
  sellerEmail: "supplier email address",
  sellerId: "supplier",
  sellerImages: "supplier images",
  sellerName: "supplier name",
  sellerPhone: "supplier phone number",
  settingStyle: "setting style",
  shape: "shape",
  sortOrder: "display order",
  specialty: "specialty",
  stoneId: "stone",
  stones: "stones",
  subscription: "notification subscription",
  totalWeight: "total weight",
  treatmentDisclosure: "treatment status",
  username: "username",
  weight: "stone weight",
  workshopId: "workshop",
  workshopType: "workshop type",
};

const categoryLabels: Record<string, string> = {
  GEM_TYPE: "gem type",
  ORIGIN: "origin or locality",
  SHAPE: "shape",
  CUT: "cut",
  COLOR: "colour",
  TREATMENT: "treatment type",
  METAL: "metal type",
  METAL_PURITY: "metal purity",
  PAYMENT_METHOD: "payment method",
};

const duplicateConstraintMessages: Record<string, string> = {
  uq_buyers_name:
    "A buyer with this name already exists. Choose the existing buyer or use a different name.",
  uq_companies_name:
    "A company with this name already exists. Choose the existing company or use a different name.",
  uq_locations_name:
    "A location with this name already exists. Choose the existing location or use a different name.",
  uq_provider_workshop_name:
    "This provider is already listed for the selected workshop.",
  uq_salesmen_name:
    "A salesman with this name already exists. Choose the existing salesman or use a different name.",
  uq_sellers_name:
    "A supplier with this name already exists. Choose the existing supplier or use a different name.",
  uq_users_username:
    "This username is already in use. Choose a different username.",
  uq_workshops_name:
    "A workshop with this name already exists. Choose the existing workshop or use a different name.",
  uq_direct_sales_stone:
    "A direct sale has already been recorded for this stone.",
  uq_jewellery_profiles_job:
    "A jewellery profile has already been created for this job.",
  uq_jewellery_profiles_stone:
    "A jewellery profile has already been created for this stone.",
  uq_stones_product_id:
    "This product ID already belongs to another stone. Please try saving again.",
};

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLocaleLowerCase("en-US");
}

function fieldName(issue?: ZodIssue) {
  const part = [...(issue?.path ?? [])]
    .reverse()
    .find((item) => typeof item === "string");
  if (typeof part !== "string") return "information";
  return fieldLabels[part] ?? titleCase(part);
}

function readableValidationError(error: ZodError) {
  const issue = error.issues[0];
  const field = fieldName(issue);
  const message = issue?.message ?? "";
  const defaultMessage =
    /^(Invalid|Expected|Required|Too small|Too big|Unrecognized)/i.test(
      message,
    );

  if (message === "A receiving location is required")
    return "Choose a receiving location before saving the stone.";
  if (message && !defaultMessage)
    return message.endsWith(".") ? message : `${message}.`;
  if (issue?.code === "too_small")
    return `Enter a valid ${field}. The current value is too short or too small.`;
  if (issue?.code === "too_big")
    return `The ${field} is too long or too large. Please shorten it and try again.`;
  if (issue?.code === "invalid_format") return `Enter a valid ${field}.`;
  return `Check the ${field} and try again.`;
}

function duplicateConstraint(error: DatabaseError) {
  const text = `${error.message ?? ""} ${error.sqlMessage ?? ""}`;
  return Object.keys(duplicateConstraintMessages).find((key) =>
    text.includes(key),
  );
}

function duplicateMessage(request: Request, error: DatabaseError) {
  const text = `${error.message ?? ""} ${error.sqlMessage ?? ""}`;
  if (text.includes("uq_category_item")) {
    const category =
      categoryLabels[String(request.body?.categoryKey)] ?? "category item";
    const name = String(request.body?.name ?? "").trim();
    return name
      ? `The ${category} “${name}” already exists. Choose it from the list or edit the existing item.`
      : `This ${category} already exists. Choose it from the list or edit the existing item.`;
  }

  const constraint = duplicateConstraint(error);
  if (constraint && duplicateConstraintMessages[constraint])
    return duplicateConstraintMessages[constraint];

  const path = request.path.toLocaleLowerCase("en-US");
  if (path.includes("/categories"))
    return "This category name already exists. Choose it from the list or edit the existing item.";
  if (path.includes("/providers"))
    return "This provider is already listed for the selected workshop.";
  if (path.includes("/workshops"))
    return "A workshop with this name already exists. Choose it from the directory or use a different name.";
  if (path.includes("/sellers"))
    return "A supplier with this name already exists. Choose it from the directory or use a different name.";
  if (path.includes("/salesmen"))
    return "A salesman with this name already exists. Choose that person from the directory or use a different name.";
  if (path.includes("/buyers"))
    return "A buyer with this name already exists. Choose that buyer from the directory or use a different name.";
  return "This information has already been added. Choose the existing item or enter different details.";
}

function columnName(error: DatabaseError) {
  const text = `${error.message ?? ""} ${error.sqlMessage ?? ""}`;
  const match = text.match(/column ['`]([^'`]+)['`]/i);
  const column = match?.[1];
  return column ? fieldLabels[column] ?? titleCase(column) : "value";
}

export function publicError(error: unknown, request: Request): PublicError {
  if (error instanceof ZodError)
    return {
      status: 422,
      message: readableValidationError(error),
      code: "INVALID_INPUT",
      details: error.flatten(),
    };
  if (error instanceof HttpError)
    return {
      status: error.status,
      message: error.message,
      code:
        error.status === 404
          ? "NOT_FOUND"
          : error.status === 409
            ? "CONFLICT"
            : error.status === 403
              ? "NOT_ALLOWED"
              : error.status === 401
                ? "SIGN_IN_REQUIRED"
                : "REQUEST_FAILED",
      details: error.details,
    };

  const databaseError = error as DatabaseError;
  if (databaseError?.code === "ER_DUP_ENTRY")
    return {
      status: 409,
      message: duplicateMessage(request, databaseError),
      code: "ALREADY_EXISTS",
    };
  if (databaseError?.code === "ER_NO_REFERENCED_ROW_2")
    return {
      status: 409,
      message:
        "One of your selections no longer exists. Refresh the page, choose it again, and retry.",
      code: "SELECTION_NO_LONGER_AVAILABLE",
    };
  if (databaseError?.code === "ER_ROW_IS_REFERENCED_2")
    return {
      status: 409,
      message:
        "This item is already used by another record, so it cannot be removed.",
      code: "ITEM_IN_USE",
    };
  if (databaseError?.code === "ER_DATA_TOO_LONG")
    return {
      status: 422,
      message: `The ${columnName(databaseError)} is too long. Shorten it and try again.`,
      code: "VALUE_TOO_LONG",
    };
  if (
    [
      "ER_BAD_NULL_ERROR",
      "ER_CHECK_CONSTRAINT_VIOLATED",
      "ER_TRUNCATED_WRONG_VALUE",
      "ER_WARN_DATA_OUT_OF_RANGE",
    ].includes(databaseError?.code ?? "")
  )
    return {
      status: 422,
      message: `Check the ${columnName(databaseError)}. The entered value is missing or is not allowed.`,
      code: "INVALID_VALUE",
    };
  if (
    ["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(
      databaseError?.code ?? "",
    )
  )
    return {
      status: 409,
      message:
        "Another update was happening at the same time. Nothing was lost. Please try once more.",
      code: "UPDATE_CONFLICT",
    };
  if (
    [
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "PROTOCOL_CONNECTION_LOST",
    ].includes(databaseError?.code ?? "")
  )
    return {
      status: 503,
      message:
        "The database is temporarily unavailable. Nothing was saved. Please try again in a moment.",
      code: "DATABASE_UNAVAILABLE",
    };

  const expressError = error as {
    status?: number;
    type?: string;
  };
  if (expressError?.type === "entity.too.large" || expressError?.status === 413)
    return {
      status: 413,
      message:
        "The selected images are too large. Use smaller images and try again.",
      code: "UPLOAD_TOO_LARGE",
    };
  if (expressError instanceof SyntaxError && expressError.status === 400)
    return {
      status: 400,
      message:
        "Some submitted information could not be read. Refresh the page and try again.",
      code: "INVALID_REQUEST",
    };

  return {
    status: 500,
    message:
      "We could not complete this action because of a server problem. Nothing was changed. Please try again.",
    code: "SERVER_ERROR",
  };
}

export const notFound: RequestHandler = (_request, _response, next) => {
  next(
    new HttpError(
      404,
      "This page or action could not be found. It may have moved or been removed.",
    ),
  );
};

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  next,
) => {
  void next;
  const result = publicError(error, request);
  if (result.status >= 500)
    request.log?.error({ err: error, errorCode: result.code }, "Request failed");
  response.status(result.status).json({
    error: result.message,
    code: result.code,
    ...(result.details === undefined ? {} : { details: result.details }),
  });
};

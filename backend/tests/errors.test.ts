import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { publicError } from "../src/middleware/errors.js";

function request(path: string, body: Record<string, unknown> = {}) {
  return { path, body } as Request;
}

describe("human-readable API errors", () => {
  it("explains duplicate category names using the category and entered name", () => {
    const error = Object.assign(new Error("Duplicate entry"), {
      code: "ER_DUP_ENTRY",
      sqlMessage:
        "Duplicate entry 'GEM_TYPE-Ruby' for key 'uq_category_item'",
    });

    expect(
      publicError(
        error,
        request("/categories", { categoryKey: "GEM_TYPE", name: "Ruby" }),
      ),
    ).toMatchObject({
      status: 409,
      code: "ALREADY_EXISTS",
      message:
        "The gem type “Ruby” already exists. Choose it from the list or edit the existing item.",
    });
  });

  it("explains duplicate directory records without exposing database details", () => {
    const error = Object.assign(new Error("Duplicate entry"), {
      code: "ER_DUP_ENTRY",
      sqlMessage: "Duplicate entry for key 'uq_workshops_name'",
    });

    expect(publicError(error, request("/workshops"))).toMatchObject({
      status: 409,
      code: "ALREADY_EXISTS",
      message:
        "A workshop with this name already exists. Choose the existing workshop or use a different name.",
    });
  });

  it("turns validation failures into field-specific instructions", () => {
    const result = z
      .object({ email: z.email() })
      .safeParse({ email: "not-an-email" });
    if (result.success) throw new Error("Expected validation to fail");

    expect(publicError(result.error, request("/buyers"))).toMatchObject({
      status: 422,
      code: "INVALID_INPUT",
      message: "Enter a valid email address.",
    });
  });

  it("explains temporary database problems and confirms nothing was saved", () => {
    const error = Object.assign(new Error("connection lost"), {
      code: "PROTOCOL_CONNECTION_LOST",
    });

    expect(publicError(error, request("/stones"))).toMatchObject({
      status: 503,
      code: "DATABASE_UNAVAILABLE",
      message:
        "The database is temporarily unavailable. Nothing was saved. Please try again in a moment.",
    });
  });

  it("does not expose unexpected internal error text", () => {
    const result = publicError(
      new Error("SELECT password_hash FROM users failed"),
      request("/ledger"),
    );

    expect(result.status).toBe(500);
    expect(result.code).toBe("SERVER_ERROR");
    expect(result.message).not.toContain("password_hash");
  });
});

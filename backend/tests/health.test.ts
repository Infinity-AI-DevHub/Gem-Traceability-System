process.env.NODE_ENV = "test";

import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("health endpoint", () => {
  it("reports the API as ready", async () => {
    const response = await request(createApp()).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", service: "origin-backend" });
  });

  it("protects API routes without a session", async () => {
    const response = await request(createApp()).get("/api/v1/unknown");
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Authentication required");
  });
});

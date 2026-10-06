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

  it("rejects unverified browser writes before authentication", async () => {
    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .send({ username: "admin", password: "not-the-password" });
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("This request could not be verified");
  });

  it("rejects writes from an untrusted origin", async () => {
    const response = await request(createApp())
      .post("/api/v1/auth/login")
      .set("Origin", "https://attacker.example")
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ username: "admin", password: "not-the-password" });
    expect(response.status).toBe(403);
  });

  it("sets browser security headers", async () => {
    const response = await request(createApp()).get("/api/v1/health");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });
});

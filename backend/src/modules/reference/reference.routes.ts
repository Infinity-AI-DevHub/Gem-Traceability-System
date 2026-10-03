import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { pool } from "../../database/pool.js";
import { asyncHandler } from "../../lib/async-handler.js";

export const referenceRouter = Router();

const contact = z.object({
  displayName: z.string().trim().min(2).max(180),
  role: z.enum(["BUYER", "SELLER", "CUTTER", "LABORATORY", "STAFF", "OTHER"]),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.email().optional().nullable(),
  locality: z.string().trim().max(150).optional().nullable(),
});
const location = z.object({
  name: z.string().trim().min(2).max(180),
  locationType: z.enum(["VAULT", "DISPLAY", "WORKSHOP", "LABORATORY", "BUYER", "OTHER"]),
  isExternal: z.boolean().default(false),
});

referenceRouter.get("/contacts", asyncHandler(async (_request, response) => {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, display_name AS displayName, role, phone, email, locality FROM contacts WHERE active = TRUE ORDER BY display_name");
  response.json({ data: rows });
}));
referenceRouter.post("/contacts", asyncHandler(async (request, response) => {
  const input = contact.parse(request.body);
  const [result] = await pool.execute<ResultSetHeader>("INSERT INTO contacts (display_name, role, phone, email, locality) VALUES (?, ?, ?, ?, ?)", [input.displayName, input.role, input.phone ?? null, input.email ?? null, input.locality ?? null]);
  response.status(201).json({ data: { id: result.insertId, ...input } });
}));
referenceRouter.get("/locations", asyncHandler(async (_request, response) => {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, name, location_type AS locationType, is_external AS isExternal FROM locations WHERE active = TRUE ORDER BY name");
  response.json({ data: rows });
}));
referenceRouter.post("/locations", asyncHandler(async (request, response) => {
  const input = location.parse(request.body);
  const [result] = await pool.execute<ResultSetHeader>("INSERT INTO locations (name, location_type, is_external) VALUES (?, ?, ?)", [input.name, input.locationType, input.isExternal]);
  response.status(201).json({ data: { id: result.insertId, ...input } });
}));

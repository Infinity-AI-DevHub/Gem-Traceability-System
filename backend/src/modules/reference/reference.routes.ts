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
  locationType: z.enum([
    "VAULT",
    "DISPLAY",
    "WORKSHOP",
    "LABORATORY",
    "BUYER",
    "OTHER",
  ]),
  isExternal: z.boolean().default(false),
});
const workshop = z.object({
  name: z.string().trim().min(2).max(180),
  workshopType: z.enum(["CUTTING", "TREATMENT", "BOTH"]),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.email().optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
});
const provider = z.object({
  workshopId: z.coerce.number().int().positive(),
  displayName: z.string().trim().min(2).max(180),
  specialty: z.enum(["CUTTING", "TREATMENT", "BOTH"]),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.email().optional().nullable(),
});
const seller = z.object({
  name: z.string().trim().min(2).max(180),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z
    .union([z.email(), z.literal("")])
    .optional()
    .nullable(),
  locality: z.string().trim().max(150).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});
const salesman = seller;

referenceRouter.get(
  "/contacts",
  asyncHandler(async (_request, response) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, display_name AS displayName, role, phone, email, locality FROM contacts WHERE active = TRUE ORDER BY display_name",
    );
    response.json({ data: rows });
  }),
);
referenceRouter.post(
  "/contacts",
  asyncHandler(async (request, response) => {
    const input = contact.parse(request.body);
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO contacts (display_name, role, phone, email, locality) VALUES (?, ?, ?, ?, ?)",
      [
        input.displayName,
        input.role,
        input.phone ?? null,
        input.email ?? null,
        input.locality ?? null,
      ],
    );
    response.status(201).json({ data: { id: result.insertId, ...input } });
  }),
);
referenceRouter.get(
  "/salesmen",
  asyncHandler(async (_request, response) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id,name,phone,email,locality,notes FROM salesmen WHERE active=TRUE ORDER BY name",
    );
    response.json({ data: rows });
  }),
);
referenceRouter.post(
  "/salesmen",
  asyncHandler(async (request, response) => {
    const input = salesman.parse(request.body);
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO salesmen (name,phone,email,locality,notes) VALUES (?,?,?,?,?)",
      [
        input.name,
        input.phone ?? null,
        input.email || null,
        input.locality ?? null,
        input.notes ?? null,
      ],
    );
    response.status(201).json({ data: { id: result.insertId, ...input } });
  }),
);
referenceRouter.get(
  "/workshops",
  asyncHandler(async (_request, response) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id,name,workshop_type AS workshopType,phone,email,address FROM workshops WHERE active=TRUE ORDER BY name",
    );
    response.json({ data: rows });
  }),
);
referenceRouter.post(
  "/workshops",
  asyncHandler(async (request, response) => {
    const input = workshop.parse(request.body);
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO workshops (name,workshop_type,phone,email,address) VALUES (?,?,?,?,?)",
      [
        input.name,
        input.workshopType,
        input.phone ?? null,
        input.email ?? null,
        input.address ?? null,
      ],
    );
    response.status(201).json({ data: { id: result.insertId, ...input } });
  }),
);
referenceRouter.get(
  "/providers",
  asyncHandler(async (_request, response) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id,workshop_id AS workshopId,display_name AS displayName,specialty,phone,email FROM providers WHERE active=TRUE ORDER BY display_name",
    );
    response.json({ data: rows });
  }),
);
referenceRouter.post(
  "/providers",
  asyncHandler(async (request, response) => {
    const input = provider.parse(request.body);
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO providers (workshop_id,display_name,specialty,phone,email) VALUES (?,?,?,?,?)",
      [
        input.workshopId,
        input.displayName,
        input.specialty,
        input.phone ?? null,
        input.email ?? null,
      ],
    );
    response.status(201).json({ data: { id: result.insertId, ...input } });
  }),
);
referenceRouter.get(
  "/sellers",
  asyncHandler(async (_request, response) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id,name,phone,email,locality,notes FROM sellers WHERE active=TRUE ORDER BY name",
    );
    response.json({ data: rows });
  }),
);
referenceRouter.post(
  "/sellers",
  asyncHandler(async (request, response) => {
    const input = seller.parse(request.body);
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO sellers (name,phone,email,locality,notes) VALUES (?,?,?,?,?)",
      [
        input.name,
        input.phone || null,
        input.email || null,
        input.locality || null,
        input.notes || null,
      ],
    );
    response.status(201).json({ data: { id: result.insertId, ...input } });
  }),
);
referenceRouter.get(
  "/locations",
  asyncHandler(async (_request, response) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, location_type AS locationType, is_external AS isExternal FROM locations WHERE active = TRUE ORDER BY name",
    );
    response.json({ data: rows });
  }),
);
referenceRouter.post(
  "/locations",
  asyncHandler(async (request, response) => {
    const input = location.parse(request.body);
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO locations (name, location_type, is_external) VALUES (?, ?, ?)",
      [input.name, input.locationType, input.isExternal],
    );
    response.status(201).json({ data: { id: result.insertId, ...input } });
  }),
);

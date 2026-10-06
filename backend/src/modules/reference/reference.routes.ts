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
  workshopType: z.enum([
    "CUTTING",
    "TREATMENT",
    "BOTH",
    "JEWELLERY",
    "ALL",
  ]),
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
const buyer = seller;
const categoryKey = z.enum([
  "GEM_TYPE",
  "ORIGIN",
  "SHAPE",
  "CUT",
  "COLOR",
  "TREATMENT",
  "METAL",
  "METAL_PURITY",
  "PAYMENT_METHOD",
]);
const categoryItem = z.object({
  categoryKey,
  name: z.string().trim().min(1).max(180),
  description: z.string().trim().max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(65535).default(0),
});

referenceRouter.get(
  "/categories",
  asyncHandler(async (_request, response) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id,category_key AS categoryKey,name,description,sort_order AS sortOrder
       FROM category_items WHERE active=TRUE ORDER BY category_key,sort_order,name`,
    );
    response.json({ data: rows });
  }),
);
referenceRouter.post(
  "/categories",
  asyncHandler(async (request, response) => {
    const input = categoryItem.parse(request.body);
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO category_items (category_key,name,description,sort_order)
       VALUES (?,?,?,?)`,
      [input.categoryKey, input.name, input.description || null, input.sortOrder],
    );
    response.status(201).json({ data: { id: result.insertId, ...input } });
  }),
);
referenceRouter.patch(
  "/categories/:id",
  asyncHandler(async (request, response) => {
    const id = z.coerce.number().int().positive().parse(request.params.id);
    const input = categoryItem.parse(request.body);
    await pool.execute(
      `UPDATE category_items SET category_key=?,name=?,description=?,sort_order=?
       WHERE id=? AND active=TRUE`,
      [input.categoryKey, input.name, input.description || null, input.sortOrder, id],
    );
    response.json({ data: { id, ...input } });
  }),
);
referenceRouter.delete(
  "/categories/:id",
  asyncHandler(async (request, response) => {
    const id = z.coerce.number().int().positive().parse(request.params.id);
    await pool.execute("UPDATE category_items SET active=FALSE WHERE id=?", [id]);
    response.status(204).send();
  }),
);

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
  "/buyers",
  asyncHandler(async (_request, response) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id,name,phone,email,locality,notes FROM buyers WHERE active=TRUE ORDER BY name",
    );
    response.json({ data: rows });
  }),
);
referenceRouter.post(
  "/buyers",
  asyncHandler(async (request, response) => {
    const input = buyer.parse(request.body);
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO buyers (name,phone,email,locality,notes) VALUES (?,?,?,?,?)",
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

const directorySchemas = {
  sellers: seller,
  salesmen: salesman,
  buyers: buyer,
  workshops: workshop,
  contacts: contact,
} as const;
const directoryUpdates = {
  sellers: {
    sql: "UPDATE sellers SET name=?,phone=?,email=?,locality=?,notes=? WHERE id=? AND active=TRUE",
    values: (value: z.infer<typeof seller>) => [value.name, value.phone || null, value.email || null, value.locality || null, value.notes || null],
  },
  salesmen: {
    sql: "UPDATE salesmen SET name=?,phone=?,email=?,locality=?,notes=? WHERE id=? AND active=TRUE",
    values: (value: z.infer<typeof salesman>) => [value.name, value.phone || null, value.email || null, value.locality || null, value.notes || null],
  },
  buyers: {
    sql: "UPDATE buyers SET name=?,phone=?,email=?,locality=?,notes=? WHERE id=? AND active=TRUE",
    values: (value: z.infer<typeof buyer>) => [value.name, value.phone || null, value.email || null, value.locality || null, value.notes || null],
  },
  workshops: {
    sql: "UPDATE workshops SET name=?,workshop_type=?,phone=?,email=?,address=? WHERE id=? AND active=TRUE",
    values: (value: z.infer<typeof workshop>) => [value.name, value.workshopType, value.phone || null, value.email || null, value.address || null],
  },
  contacts: {
    sql: "UPDATE contacts SET display_name=?,role=?,phone=?,email=?,locality=? WHERE id=? AND active=TRUE",
    values: (value: z.infer<typeof contact>) => [value.displayName, value.role, value.phone || null, value.email || null, value.locality || null],
  },
} as const;

referenceRouter.patch(
  "/directory/:entity/:id",
  asyncHandler(async (request, response) => {
    const entity = z.enum(["sellers", "salesmen", "buyers", "workshops", "contacts"]).parse(request.params.entity);
    const id = z.coerce.number().int().positive().parse(request.params.id);
    const input = directorySchemas[entity].parse(request.body) as Record<string, unknown>;
    const update = directoryUpdates[entity] as unknown as {
      sql: string;
      values: (value: Record<string, unknown>) => Array<string | number | null>;
    };
    await pool.execute(update.sql, [...update.values(input), id]);
    response.json({ data: { id, ...input } });
  }),
);
referenceRouter.delete(
  "/directory/:entity/:id",
  asyncHandler(async (request, response) => {
    const entity = z.enum(["sellers", "salesmen", "buyers", "workshops", "contacts"]).parse(request.params.entity);
    const id = z.coerce.number().int().positive().parse(request.params.id);
    await pool.execute(`UPDATE ${entity} SET active=FALSE WHERE id=?`, [id]);
    response.status(204).send();
  }),
);

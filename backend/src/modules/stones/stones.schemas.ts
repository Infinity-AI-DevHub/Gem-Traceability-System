import { z } from "zod";
import {
  optionalText,
  positiveMoney,
  positiveWeight,
  stoneId,
} from "../../validation/common.js";

export const listStonesQuery = z.object({
  status: z
    .enum([
      "AVAILABLE",
      "RESERVED",
      "IN_CUTTING",
      "IN_TREATMENT",
      "SOLD",
      "ON_HOLD",
    ])
    .optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const stoneDetails = z.object({
  id: stoneId.optional(),
  gemType: z.string().trim().min(2).max(100),
  origin: z.string().trim().min(2).max(150),
  weight: positiveWeight,
  color: optionalText,
  shape: optionalText,
  cutStyle: optionalText,
  purchaseCost: positiveMoney.default(0),
  treatmentDisclosure: z
    .string()
    .trim()
    .min(2)
    .max(500)
    .default("Not assessed"),
  certificateReference: z.string().trim().max(150).optional().nullable(),
  sellerContactId: z.coerce.number().int().positive().optional().nullable(),
  sellerName: z.string().trim().max(180).optional().nullable(),
  sellerId: z.coerce.number().int().positive().optional().nullable(),
  sellerPhone: z.string().trim().max(50).optional().nullable(),
  sellerEmail: z
    .union([z.email(), z.literal("")])
    .optional()
    .nullable(),
  sellerLocality: z.string().trim().max(150).optional().nullable(),
  locationId: z.coerce.number().int().positive().optional(),
  locationName: z.string().trim().min(2).max(180).optional(),
  acquiredOn: z.iso.date(),
  notes: optionalText,
});

export const intakeStone = stoneDetails.refine(
  (value) => value.locationId || value.locationName,
  { message: "A receiving location is required" },
);

export const editStone = stoneDetails
  .omit({ id: true })
  .extend({
    expectedVersion: z.coerce.number().int().min(1),
  })
  .refine((value) => value.locationId || value.locationName, {
    message: "A receiving location is required",
  });

export const addStoneImages = z.object({
  images: z
    .array(
      z.object({
        dataUrl: z
          .string()
          .max(3_000_000)
          .regex(/^data:image\/(jpeg|png|webp);base64,/),
        captured: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(4),
});

export const transferCustody = z.object({
  locationId: z.coerce.number().int().positive(),
  custodianContactId: z.coerce.number().int().positive().nullable(),
  notes: z.string().trim().max(1000).optional(),
  expectedVersion: z.coerce.number().int().min(1),
});

export const placeHold = z.object({
  reason: z.string().trim().min(3).max(1000),
  expectedVersion: z.coerce.number().int().min(1),
});

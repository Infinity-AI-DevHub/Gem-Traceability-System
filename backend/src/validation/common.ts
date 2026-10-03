import { z } from "zod";

export const stoneId = z.string().trim().regex(/^GEM-[A-Z]{3}-\d{2}-\d{4,}$/);
export const positiveMoney = z.coerce.number().min(0).max(999_999_999_999.99);
export const positiveWeight = z.coerce.number().positive().max(999_999.999);
export const optionalText = z.string().trim().max(2000).optional().nullable();

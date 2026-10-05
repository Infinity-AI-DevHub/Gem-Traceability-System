import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4500),
  FRONTEND_ORIGIN: z.string().url().default("http://127.0.0.1:3500"),
  DB_HOST: z.string().min(1).default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1).default("origin_gemstone"),
  DB_USER: z.string().min(1).default("origin_app"),
  DB_PASSWORD: z.string().default(""),
  DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(50).default(10),
});

export const env = schema.parse(process.env);

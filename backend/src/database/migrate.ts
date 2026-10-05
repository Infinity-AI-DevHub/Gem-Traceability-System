import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { env } from "../config/env.js";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = join(here, "../../migrations");

const settings = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  multipleStatements: true,
};

let connection;
try {
  connection = await mysql.createConnection({ ...settings, database: env.DB_NAME });
} catch (error) {
  if ((error as { code?: string }).code !== "ER_BAD_DB_ERROR") throw error;
  connection = await mysql.createConnection(settings);
  const databaseName = `\`${env.DB_NAME.replaceAll("`", "``")}\``;
  await connection.query(
    `CREATE DATABASE ${databaseName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.changeUser({ database: env.DB_NAME });
}

try {
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(255) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB`);
  const [rows] = await connection.query<RowDataPacket[]>(
    "SELECT name FROM schema_migrations",
  );
  const applied = new Set(rows.map((row) => String(row.name)));
  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(migrationsDirectory, file), "utf8");
    await connection.beginTransaction();
    try {
      await connection.query(sql);
      await connection.execute(
        "INSERT INTO schema_migrations (name) VALUES (?)",
        [file],
      );
      await connection.commit();
      console.log(`Applied ${file}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
} finally {
  await connection.end();
}

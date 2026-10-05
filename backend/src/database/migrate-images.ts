import type { RowDataPacket } from "mysql2/promise";
import { pool } from "./pool.js";
import { removeStoredImage, storeImageBuffer } from "../lib/image-storage.js";

const sources = [
  { table: "stone_images", collection: "stones" as const },
  { table: "seller_images", collection: "sellers" as const },
  { table: "jewellery_images", collection: "jewellery" as const },
];

let migrated = 0;
try {
  for (const source of sources) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id,image_data,mime_type FROM ${source.table}
       WHERE file_path IS NULL AND image_data IS NOT NULL ORDER BY id`,
    );
    for (const row of rows) {
      const stored = await storeImageBuffer(
        Buffer.from(row.image_data),
        String(row.mime_type),
        source.collection,
      );
      try {
        await pool.execute(
          `UPDATE ${source.table} SET file_path=?,image_data=NULL
           WHERE id=? AND file_path IS NULL`,
          [stored.filePath, row.id],
        );
        migrated += 1;
      } catch (error) {
        await removeStoredImage(stored.filePath);
        throw error;
      }
    }
  }
  console.log(`Migrated ${migrated} image${migrated === 1 ? "" : "s"} to the uploads directory.`);
} finally {
  await pool.end();
}

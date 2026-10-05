import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { pool } from "../../database/pool.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { HttpError } from "../../lib/http-error.js";
import { addStoneImages } from "../stones/stones.schemas.js";
import { addEvent } from "../events/events.repository.js";

export const jewelleryRouter = Router();
const jewelleryId = z.string().trim().min(5).max(32);

jewelleryRouter.post(
  "/:jewelleryId/images",
  asyncHandler(async (request, response) => {
    const id = jewelleryId.parse(request.params.jewelleryId);
    const [profiles] = await pool.execute<RowDataPacket[]>(
      "SELECT id,stone_id FROM jewellery_profiles WHERE id=? LIMIT 1",
      [id],
    );
    if (!profiles[0]) throw new HttpError(404, "Jewellery profile was not found");
    const input = addStoneImages.parse(request.body);
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT COUNT(*) total FROM jewellery_images WHERE jewellery_id=?",
      [id],
    );
    if (Number(rows[0]?.total ?? 0) + input.images.length > 4)
      throw new HttpError(422, "A jewellery profile can have up to four images");
    for (const [index, image] of input.images.entries()) {
      const match = image.dataUrl.match(
        /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/,
      );
      if (!match) throw new HttpError(422, "Unsupported image format");
      const data = Buffer.from(match[2]!, "base64");
      if (data.length > 2_000_000)
        throw new HttpError(422, "Each image must be smaller than 2 MB");
      await pool.execute(
        "INSERT INTO jewellery_images (jewellery_id,image_data,mime_type,sort_order,captured) VALUES (?,?,?,?,?)",
        [
          id,
          data,
          match[1]!,
          Number(rows[0]?.total ?? 0) + index,
          image.captured,
        ],
      );
    }
    await addEvent(pool, {
      stoneId: profiles[0].stone_id,
      eventType: "JEWELLERY_IMAGE_UPLOAD",
      title: `${input.images.length} jewellery image${input.images.length === 1 ? "" : "s"} added`,
      details: {
        detail: `Jewellery profile ${id} gallery updated.`,
        performedBy: String(response.locals.auditUser?.name ?? "System"),
        jewelleryId: id,
        uploaded: input.images.map((image, index) => ({
          position: Number(rows[0]?.total ?? 0) + index + 1,
          source: image.captured ? "Camera" : "File upload",
        })),
      },
    });
    response.status(201).json({ data: { uploaded: input.images.length } });
  }),
);

jewelleryRouter.delete(
  "/:jewelleryId/images/:imageId",
  asyncHandler(async (request, response) => {
    const id = jewelleryId.parse(request.params.jewelleryId);
    const imageId = Number(request.params.imageId);
    const [images] = await pool.execute<RowDataPacket[]>(
      `SELECT ji.mime_type,ji.captured,ji.sort_order,jp.stone_id
       FROM jewellery_images ji JOIN jewellery_profiles jp ON jp.id=ji.jewellery_id
       WHERE ji.id=? AND ji.jewellery_id=? LIMIT 1`,
      [imageId, id],
    );
    const image = images[0];
    if (!image) throw new HttpError(404, "Jewellery image was not found");
    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM jewellery_images WHERE id=? AND jewellery_id=?",
      [imageId, id],
    );
    if (result.affectedRows !== 1)
      throw new HttpError(404, "Jewellery image was not found");
    await addEvent(pool, {
      stoneId: image.stone_id,
      eventType: "JEWELLERY_IMAGE_REMOVAL",
      title: "Jewellery image removed",
      details: {
        detail: `Image ${imageId} removed from jewellery profile ${id}.`,
        performedBy: String(response.locals.auditUser?.name ?? "System"),
        jewelleryId: id,
        imageId,
        mimeType: image.mime_type,
        captured: Boolean(image.captured),
        position: Number(image.sort_order) + 1,
      },
    });
    response.status(204).send();
  }),
);

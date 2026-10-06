import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { stoneId } from "../../validation/common.js";
import { listEvents } from "../events/events.repository.js";
import { findStone, listStones } from "./stones.repository.js";
import {
  addStoneImages,
  editStone,
  intakeStone,
  intakeStoneBatch,
  listStonesQuery,
  placeHold,
  transferCustody,
} from "./stones.schemas.js";
import {
  clearStoneHold,
  editStoneRecord,
  holdStone,
  moveStone,
  receiveStoneOnce,
  receiveStones,
} from "./stones.service.js";
import { HttpError } from "../../lib/http-error.js";
import { pool } from "../../database/pool.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { addEvent } from "../events/events.repository.js";
import { removeStoredImage, storeImage } from "../../lib/image-storage.js";

export const stonesRouter = Router();

stonesRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const query = listStonesQuery.parse(request.query);
    response.json({
      data: await listStones(query),
      pagination: { limit: query.limit, offset: query.offset },
    });
  }),
);

stonesRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const performedBy = String(response.locals.auditUser?.name ?? "System");
    const userId = Number(response.locals.auditUser?.id);
    const requestKeyHeader = request.get("Idempotency-Key");
    const requestKey = z.uuid().safeParse(requestKeyHeader);
    if (!requestKey.success)
      throw new HttpError(
        400,
        "This page is out of date. Refresh it, then register the stone again.",
      );
    response
      .status(201)
      .json({
        data: await receiveStoneOnce(
          intakeStone.parse(request.body),
          performedBy,
          userId,
          requestKey.data,
        ),
      });
  }),
);

stonesRouter.post(
  "/batch",
  asyncHandler(async (request, response) => {
    const performedBy = String(response.locals.auditUser?.name ?? "System");
    const input = intakeStoneBatch.parse(request.body);
    const created = await receiveStones(input.stones, performedBy);
    response.status(201).json({
      data: { ids: created.map((stone) => stone.id), count: created.length },
    });
  }),
);

stonesRouter.patch(
  "/:stoneId",
  asyncHandler(async (request, response) => {
    const id = stoneId.parse(request.params.stoneId);
    const performedBy = String(response.locals.auditUser?.name ?? "System");
    response.json({
      data: await editStoneRecord(id, editStone.parse(request.body), performedBy),
    });
  }),
);

stonesRouter.post(
  "/:stoneId/images",
  asyncHandler(async (request, response) => {
    const id = stoneId.parse(request.params.stoneId);
    if (!(await findStone(id)))
      throw new HttpError(404, `Stone ${id} was not found`);
    const input = addStoneImages.parse(request.body);
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT COUNT(*) total FROM stone_images WHERE stone_id=?",
      [id],
    );
    if (Number(rows[0]?.total ?? 0) + input.images.length > 4)
      throw new HttpError(422, "A stone can have up to four images");
    for (const [index, image] of input.images.entries()) {
      const stored = await storeImage(image.dataUrl, "stones");
      await pool.execute(
        "INSERT INTO stone_images (stone_id,file_path,mime_type,sort_order,captured) VALUES (?,?,?,?,?)",
        [
          id,
          stored.filePath,
          stored.mimeType,
          Number(rows[0]?.total ?? 0) + index,
          image.captured,
        ],
      );
    }
    await addEvent(pool, {
      stoneId: id,
      eventType: "IMAGE_UPLOAD",
      title: `${input.images.length} stone image${input.images.length === 1 ? "" : "s"} added`,
      details: {
        detail: "Stone reference gallery updated.",
        performedBy: String(response.locals.auditUser?.name ?? "System"),
        uploaded: input.images.map((image, index) => ({
          position: Number(rows[0]?.total ?? 0) + index + 1,
          source: image.captured ? "Camera" : "File upload",
        })),
      },
    });
    response.status(201).json({ data: { uploaded: input.images.length } });
  }),
);

stonesRouter.delete(
  "/:stoneId/images/:imageId",
  asyncHandler(async (request, response) => {
    const id = stoneId.parse(request.params.stoneId);
    const imageId = Number(request.params.imageId);
    if (!Number.isInteger(imageId) || imageId < 1)
      throw new HttpError(422, "Invalid image ID");
    const [images] = await pool.execute<RowDataPacket[]>(
      "SELECT file_path,mime_type,captured,sort_order FROM stone_images WHERE id=? AND stone_id=? LIMIT 1",
      [imageId, id],
    );
    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM stone_images WHERE id=? AND stone_id=?",
      [imageId, id],
    );
    if (result.affectedRows !== 1)
      throw new HttpError(404, "Stone image was not found");
    await removeStoredImage(images[0]?.file_path);
    await addEvent(pool, {
      stoneId: id,
      eventType: "IMAGE_REMOVAL",
      title: "Stone image removed",
      details: {
        detail: `Reference image ${imageId} removed from the stone gallery.`,
        performedBy: String(response.locals.auditUser?.name ?? "System"),
        imageId,
        mimeType: images[0]?.mime_type ?? null,
        captured: Boolean(images[0]?.captured),
        position: Number(images[0]?.sort_order ?? 0) + 1,
      },
    });
    response.status(204).send();
  }),
);

stonesRouter.get(
  "/:stoneId",
  asyncHandler(async (request, response) => {
    const id = stoneId.parse(request.params.stoneId);
    const stone = await findStone(id);
    if (!stone) throw new HttpError(404, `Stone ${id} was not found`);
    response.json({ data: stone });
  }),
);

stonesRouter.get(
  "/:stoneId/events",
  asyncHandler(async (request, response) => {
    const id = stoneId.parse(request.params.stoneId);
    if (!(await findStone(id)))
      throw new HttpError(404, `Stone ${id} was not found`);
    response.json({ data: await listEvents(id) });
  }),
);

stonesRouter.post(
  "/:stoneId/custody-transfers",
  asyncHandler(async (request, response) => {
    const id = stoneId.parse(request.params.stoneId);
    response
      .status(201)
      .json({ data: await moveStone(id, transferCustody.parse(request.body), String(response.locals.auditUser?.name ?? "System")) });
  }),
);

stonesRouter.post(
  "/:stoneId/holds",
  asyncHandler(async (request, response) => {
    const id = stoneId.parse(request.params.stoneId);
    response
      .status(201)
      .json({ data: await holdStone(id, placeHold.parse(request.body), String(response.locals.auditUser?.name ?? "System")) });
  }),
);

stonesRouter.post(
  "/:stoneId/holds/clear",
  asyncHandler(async (request, response) => {
    const id = stoneId.parse(request.params.stoneId);
    response.json({
      data: await clearStoneHold(id, placeHold.parse(request.body), String(response.locals.auditUser?.name ?? "System")),
    });
  }),
);

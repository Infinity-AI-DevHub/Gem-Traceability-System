import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { stoneId } from "../../validation/common.js";
import { listEvents } from "../events/events.repository.js";
import { findStone, listStones } from "./stones.repository.js";
import { intakeStone, listStonesQuery, placeHold, transferCustody } from "./stones.schemas.js";
import { clearStoneHold, holdStone, moveStone, receiveStone } from "./stones.service.js";
import { HttpError } from "../../lib/http-error.js";

export const stonesRouter = Router();

stonesRouter.get("/", asyncHandler(async (request, response) => {
  const query = listStonesQuery.parse(request.query);
  response.json({ data: await listStones(query), pagination: { limit: query.limit, offset: query.offset } });
}));

stonesRouter.post("/", asyncHandler(async (request, response) => {
  response.status(201).json({ data: await receiveStone(intakeStone.parse(request.body)) });
}));

stonesRouter.get("/:stoneId", asyncHandler(async (request, response) => {
  const id = stoneId.parse(request.params.stoneId);
  const stone = await findStone(id);
  if (!stone) throw new HttpError(404, `Stone ${id} was not found`);
  response.json({ data: stone });
}));

stonesRouter.get("/:stoneId/events", asyncHandler(async (request, response) => {
  const id = stoneId.parse(request.params.stoneId);
  if (!await findStone(id)) throw new HttpError(404, `Stone ${id} was not found`);
  response.json({ data: await listEvents(id) });
}));

stonesRouter.post("/:stoneId/custody-transfers", asyncHandler(async (request, response) => {
  const id = stoneId.parse(request.params.stoneId);
  response.status(201).json({ data: await moveStone(id, transferCustody.parse(request.body)) });
}));

stonesRouter.post("/:stoneId/holds", asyncHandler(async (request, response) => {
  const id = stoneId.parse(request.params.stoneId);
  response.status(201).json({ data: await holdStone(id, placeHold.parse(request.body)) });
}));

stonesRouter.post("/:stoneId/holds/clear", asyncHandler(async (request, response) => {
  const id = stoneId.parse(request.params.stoneId);
  response.json({ data: await clearStoneHold(id, placeHold.parse(request.body)) });
}));

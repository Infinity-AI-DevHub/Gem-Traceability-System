import { Router } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { transaction } from "../../database/pool.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { HttpError } from "../../lib/http-error.js";
import {
  addEvent,
  changedValues,
  stoneSnapshot,
} from "../events/events.repository.js";
import { requireStone, updateStoneState } from "../stones/stones.repository.js";

export const commandsRouter = Router();
const inputSchema = z.object({
  operation: z.string(),
  stoneId: z.string(),
  data: z.record(z.string(), z.unknown()),
});
const text = (v: unknown) => String(v ?? "").trim();
const num = (v: unknown) => Number(v ?? 0);

commandsRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const { operation, stoneId, data } = inputSchema.parse(request.body);
    const expectedVersion = num(data.expectedVersion);
    await transaction(async (db) => {
      const stone = await requireStone(stoneId, db);
      let title = "Operation recorded",
        detail = "";
      const contact = async (name: string, role: string) => {
        await db.execute(
          `INSERT INTO contacts (display_name,role) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE display_name=? AND role=?)`,
          [name, role, name, role],
        );
        const [r] = await db.query<RowDataPacket[]>(
          "SELECT id FROM contacts WHERE display_name=? AND role=? LIMIT 1",
          [name, role],
        );
        return Number(r[0]?.id);
      };
      if (
        operation === "hold" ||
        operation === "clear-hold" ||
        operation === "stocktake"
      ) {
        const next =
          operation === "hold"
            ? "ON_HOLD"
            : operation === "clear-hold"
              ? "AVAILABLE"
              : stone.status;
        if (operation !== "stocktake")
          await updateStoneState(db, stoneId, expectedVersion, {
            status: next,
          });
        title =
          operation === "hold"
            ? "Stone placed on hold"
            : operation === "clear-hold"
              ? "Hold cleared"
              : "Stocktake verified";
        detail =
          text(data.reason) || "Physical identity and location confirmed";
      } else if (operation === "custody") {
        const name = text(data.location),
          person = text(data.custodian);
        if (!name || !person)
          throw new HttpError(422, "Location and custodian are required");
        await db.execute(
          "INSERT INTO locations (name,location_type) VALUES (?,'OTHER') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",
          [name],
        );
        const [r] = await db.query<RowDataPacket[]>(
          "SELECT id FROM locations WHERE name=?",
          [name],
        );
        const personId = await contact(person, "OTHER");
        await updateStoneState(db, stoneId, expectedVersion, {
          locationId: Number(r[0]?.id),
          custodianContactId: personId,
        });
        title = "Custody transferred";
        detail = `${name} · ${person}`;
      } else if (operation === "quality") {
        await updateStoneState(db, stoneId, expectedVersion, {
          treatmentDisclosure: text(data.outcome),
          certificateReference: text(data.report) || null,
        });
        title = "Quality assessment recorded";
        detail = text(data.notes) || text(data.outcome);
      } else if (operation === "job") {
        const kind = text(data.kind).toUpperCase();
        if (!(["CUTTING", "TREATMENT"] as string[]).includes(kind))
          throw new HttpError(422, "Select cutting or treatment");
        if (stone.status !== "AVAILABLE")
          throw new HttpError(
            409,
            "Only available stones can be sent for cutting or treatment",
          );
        const [promotionHandovers] = await db.query<RowDataPacket[]>(
          "SELECT id FROM promotion_handovers WHERE stone_id=? AND status='WITH_COMPANY' LIMIT 1",
          [stoneId],
        );
        if (promotionHandovers[0])
          throw new HttpError(
            409,
            "Receive this item from the promotion company before starting a workshop job",
          );
        const workshopId = num(data.workshopId);
        const providerId = num(data.providerId);
        const [providers] = await db.query<RowDataPacket[]>(
          `SELECT p.display_name provider_name,w.name workshop_name
           FROM providers p JOIN workshops w ON w.id=p.workshop_id
           WHERE p.id=? AND p.workshop_id=? AND p.active=TRUE AND w.active=TRUE
             AND p.specialty IN (?, 'BOTH') AND w.workshop_type IN (?, 'BOTH') LIMIT 1`,
          [providerId, workshopId, kind, kind],
        );
        if (!providers[0])
          throw new HttpError(
            422,
            "Select an active workshop and matching provider",
          );
        const id = `${kind === "CUTTING" ? "CUT" : "TRT"}-${Date.now()}`;
        await db.execute(
          "INSERT INTO workshop_jobs (id,stone_id,job_type,workshop_id,provider_id,handover_on,due_on,outgoing_weight,estimated_cost,instructions) VALUES (?,?,?,?,?,?,?,?,?,?)",
          [
            id,
            stoneId,
            kind,
            workshopId,
            providerId,
            text(data.handoverDate) || null,
            text(data.due) || null,
            stone.currentWeight,
            num(data.cost),
            text(data.notes),
          ],
        );
        await updateStoneState(db, stoneId, expectedVersion, {
          status: kind === "CUTTING" ? "IN_CUTTING" : "IN_TREATMENT",
        });
        title = `${text(data.kind)} job created`;
        detail = `${id} · ${providers[0].workshop_name} · ${providers[0].provider_name}`;
      } else if (operation === "dispatch") {
        const [jobs] = await db.query<RowDataPacket[]>(
          "SELECT * FROM workshop_jobs WHERE stone_id=? AND status='PENDING_DISPATCH' ORDER BY created_at DESC LIMIT 1",
          [stoneId],
        );
        if (!jobs[0]) throw new HttpError(409, "No job is awaiting dispatch");
        await db.execute(
          "UPDATE workshop_jobs SET status='WITH_PROVIDER',dispatched_at=NOW() WHERE id=?",
          [jobs[0].id],
        );
        title = "Custody transferred to provider";
        detail = text(data.handover);
      } else if (operation === "return") {
        const [jobs] = await db.query<RowDataPacket[]>(
          "SELECT * FROM workshop_jobs WHERE stone_id=? AND status='WITH_PROVIDER' ORDER BY created_at DESC LIMIT 1",
          [stoneId],
        );
        if (!jobs[0]) throw new HttpError(409, "No dispatched job was found");
        await db.execute(
          "UPDATE workshop_jobs SET status='RETURNED',returned_weight=?,final_cost=?,return_notes=?,returned_at=NOW() WHERE id=?",
          [num(data.weight), num(data.cost), text(data.notes), jobs[0].id],
        );
        let receivingLocationId = stone.locationId;
        const receivingLocation = text(data.location);
        if (receivingLocation) {
          await db.execute(
            "INSERT INTO locations (name,location_type) VALUES (?,'VAULT') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),active=TRUE",
            [receivingLocation],
          );
          const [locations] = await db.query<RowDataPacket[]>(
            "SELECT id FROM locations WHERE name=? LIMIT 1",
            [receivingLocation],
          );
          receivingLocationId = Number(locations[0]?.id);
        }
        await updateStoneState(db, stoneId, expectedVersion, {
          status: "AVAILABLE",
          currentWeight: num(data.weight),
          locationId: receivingLocationId ?? undefined,
          treatmentDisclosure:
            jobs[0].job_type === "TREATMENT"
              ? text(data.treatment)
              : stone.treatmentDisclosure,
        });
        title = "Workshop job returned";
        detail = `${data.weight} ct`;
      } else if (operation === "sales-handover") {
        if (stone.status !== "AVAILABLE")
          throw new HttpError(
            409,
            "Only available stones can be handed to a salesman",
          );
        const [promotionHandovers] = await db.query<RowDataPacket[]>(
          "SELECT id FROM promotion_handovers WHERE stone_id=? AND status='WITH_COMPANY' LIMIT 1",
          [stoneId],
        );
        if (promotionHandovers[0])
          throw new HttpError(
            409,
            "Receive this item from the promotion company before handing it to a salesman",
          );
        const salesmanName = text(data.salesman);
        const [salesmen] = await db.query<RowDataPacket[]>(
          "SELECT id,name FROM salesmen WHERE name=? AND active=TRUE LIMIT 1",
          [salesmanName],
        );
        if (!salesmen[0])
          throw new HttpError(422, "Select a salesman from the dropdown");
        const quote = num(data.price);
        const deadline = text(data.deadline);
        const handedOverAt = text(data.handedOverAt).replace("T", " ");
        if (quote <= 0 || !deadline || !handedOverAt)
          throw new HttpError(
            422,
            "Quoted price, deadline and handover time are required",
          );
        const [active] = await db.query<RowDataPacket[]>(
          "SELECT id FROM salesman_handovers WHERE stone_id=? AND status='WITH_SALESMAN' LIMIT 1",
          [stoneId],
        );
        if (active[0])
          throw new HttpError(409, "This stone is already with a salesman");
        const id = `TRY-${Date.now()}`;
        await db.execute(
          `INSERT INTO salesman_handovers
           (id,stone_id,salesman_id,quoted_price,handed_over_at,deadline_on)
           VALUES (?,?,?,?,?,?)`,
          [id, stoneId, salesmen[0].id, quote, handedOverAt, deadline],
        );
        await updateStoneState(db, stoneId, expectedVersion, {
          status: "RESERVED",
        });
        title = "Stone handed to salesman";
        detail = `${salesmen[0].name} · quote ${quote} · due ${deadline}`;
      } else if (operation === "sales-return") {
        const [handovers] = await db.query<RowDataPacket[]>(
          `SELECT h.id,sm.name FROM salesman_handovers h
           JOIN salesmen sm ON sm.id=h.salesman_id
           WHERE h.stone_id=? AND h.status='WITH_SALESMAN'
           ORDER BY h.created_at DESC LIMIT 1`,
          [stoneId],
        );
        if (!handovers[0])
          throw new HttpError(409, "No active salesman handover found");
        await db.execute(
          "UPDATE salesman_handovers SET status='RETURNED',returned_at=NOW(),return_notes=? WHERE id=?",
          [text(data.notes) || null, handovers[0].id],
        );
        await updateStoneState(db, stoneId, expectedVersion, {
          status: "AVAILABLE",
        });
        title = "Stone received from salesman";
        detail = `${handovers[0].name} · ${text(data.notes) || "Returned safely"}`;
      } else if (operation === "sales-complete") {
        const [handovers] = await db.query<RowDataPacket[]>(
          `SELECT h.id,sm.name FROM salesman_handovers h
           JOIN salesmen sm ON sm.id=h.salesman_id
           WHERE h.stone_id=? AND h.status='WITH_SALESMAN'
           ORDER BY h.created_at DESC LIMIT 1`,
          [stoneId],
        );
        if (!handovers[0])
          throw new HttpError(409, "No active salesman handover found");
        const finalPrice = num(data.finalPrice);
        if (finalPrice <= 0)
          throw new HttpError(422, "Enter the final selling price");
        await db.execute(
          "UPDATE salesman_handovers SET status='SOLD',sold_at=NOW(),final_price=? WHERE id=?",
          [finalPrice, handovers[0].id],
        );
        await updateStoneState(db, stoneId, expectedVersion, {
          status: "SOLD",
        });
        title = "Sale reported by salesman";
        detail = `${handovers[0].name} · final price ${finalPrice}`;
      } else if (operation === "direct-sale") {
        if (!["AVAILABLE", "JEWELLERY"].includes(stone.status))
          throw new HttpError(
            409,
            "Only available stones or finished jewellery can be sold directly",
          );
        const [promotionHandovers] = await db.query<RowDataPacket[]>(
          "SELECT id FROM promotion_handovers WHERE stone_id=? AND status='WITH_COMPANY' LIMIT 1",
          [stoneId],
        );
        if (promotionHandovers[0])
          throw new HttpError(409, "Receive this item from the promotion company before recording a sale");
        const buyerName = text(data.buyerName);
        const finalPrice = num(data.finalPrice);
        const soldAt = text(data.soldAt).replace("T", " ");
        if (!buyerName || finalPrice <= 0 || !soldAt)
          throw new HttpError(
            422,
            "Buyer, final price and sale time are required",
          );
        await db.execute(
          `INSERT INTO buyers (name,phone,email,locality,notes) VALUES (?,?,?,?,?)
           ON DUPLICATE KEY UPDATE
             phone=COALESCE(NULLIF(VALUES(phone),''),phone),
             email=COALESCE(NULLIF(VALUES(email),''),email),
             locality=COALESCE(NULLIF(VALUES(locality),''),locality),
             notes=COALESCE(NULLIF(VALUES(notes),''),notes),
             active=TRUE`,
          [
            buyerName,
            text(data.buyerPhone) || null,
            text(data.buyerEmail) || null,
            text(data.buyerLocality) || null,
            text(data.notes) || null,
          ],
        );
        const [buyers] = await db.query<RowDataPacket[]>(
          "SELECT id FROM buyers WHERE name=? LIMIT 1",
          [buyerName],
        );
        if (!buyers[0])
          throw new HttpError(500, "Buyer record could not be created");
        const saleId = `DIR-${Date.now()}`;
        await db.execute(
          `INSERT INTO direct_sales
           (id,stone_id,buyer_id,final_price,sold_at,notes) VALUES (?,?,?,?,?,?)`,
          [
            saleId,
            stoneId,
            buyers[0].id,
            finalPrice,
            soldAt,
            text(data.notes) || null,
          ],
        );
        await updateStoneState(db, stoneId, expectedVersion, {
          status: "SOLD",
        });
        title = "Direct sale completed";
        detail = `${buyerName} · final price ${finalPrice}`;
      } else if (operation === "jewellery-handover") {
        if (stone.status !== "AVAILABLE")
          throw new HttpError(409, "Only available stones can be sent for jewellery creation");
        const [promotionHandovers] = await db.query<RowDataPacket[]>(
          "SELECT id FROM promotion_handovers WHERE stone_id=? AND status='WITH_COMPANY' LIMIT 1",
          [stoneId],
        );
        if (promotionHandovers[0])
          throw new HttpError(
            409,
            "Receive this item from the promotion company before starting jewellery production",
          );
        const workshopId = num(data.workshopId);
        const [workshops] = await db.query<RowDataPacket[]>(
          "SELECT id,name FROM workshops WHERE id=? AND active=TRUE AND workshop_type IN ('JEWELLERY','ALL') LIMIT 1",
          [workshopId],
        );
        if (!workshops[0]) throw new HttpError(422, "Select a jewellery workshop");
        const handedOverAt = text(data.handedOverAt).replace("T", " ");
        const deadline = text(data.deadline);
        if (!handedOverAt || !deadline)
          throw new HttpError(422, "Handover time and deadline are required");
        const jobId = `JWB-${Date.now()}`;
        await db.execute(
          `INSERT INTO jewellery_jobs
           (id,stone_id,workshop_id,handed_over_at,deadline_on,instructions)
           VALUES (?,?,?,?,?,?)`,
          [jobId, stoneId, workshopId, handedOverAt, deadline, text(data.notes) || null],
        );
        await updateStoneState(db, stoneId, expectedVersion, {
          status: "IN_JEWELLERY",
        });
        title = "Stone handed over for jewellery creation";
        detail = `${workshops[0].name} · due ${deadline}`;
      } else if (operation === "jewellery-receive") {
        const [jobs] = await db.query<RowDataPacket[]>(
          `SELECT j.id,w.name workshop_name FROM jewellery_jobs j
           JOIN workshops w ON w.id=j.workshop_id
           WHERE j.stone_id=? AND j.status='WITH_WORKSHOP'
           ORDER BY j.created_at DESC LIMIT 1`,
          [stoneId],
        );
        if (!jobs[0]) throw new HttpError(409, "No active jewellery job found");
        const profileId = `JWL-${Date.now()}`;
        await db.execute(
          "UPDATE jewellery_jobs SET status='RECEIVED',received_at=NOW(),receive_notes=? WHERE id=?",
          [text(data.receiveNotes) || null, jobs[0].id],
        );
        await db.execute(
          `INSERT INTO jewellery_profiles
           (id,stone_id,job_id,item_type,metal_type,metal_purity,metal_weight,total_weight,setting_style,item_size,description)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [
            profileId,
            stoneId,
            jobs[0].id,
            text(data.itemType) || "Jewellery",
            text(data.metalType) || null,
            text(data.metalPurity) || null,
            num(data.metalWeight) || null,
            num(data.totalWeight) || null,
            text(data.settingStyle) || null,
            text(data.itemSize) || null,
            text(data.description) || null,
          ],
        );
        await updateStoneState(db, stoneId, expectedVersion, {
          status: "JEWELLERY",
        });
        title = "Finished jewellery received";
        detail = `${profileId} · ${jobs[0].workshop_name}`;
      } else if (operation === "jewellery-edit") {
        const [profiles] = await db.query<RowDataPacket[]>(
          "SELECT id,version FROM jewellery_profiles WHERE stone_id=? LIMIT 1",
          [stoneId],
        );
        if (!profiles[0]) throw new HttpError(404, "Jewellery profile not found");
        await db.execute(
          `UPDATE jewellery_profiles SET item_type=?,metal_type=?,metal_purity=?,metal_weight=?,
           total_weight=?,setting_style=?,item_size=?,description=?,version=version+1 WHERE id=?`,
          [
            text(data.itemType) || "Jewellery",
            text(data.metalType) || null,
            text(data.metalPurity) || null,
            num(data.metalWeight) || null,
            num(data.totalWeight) || null,
            text(data.settingStyle) || null,
            text(data.itemSize) || null,
            text(data.description) || null,
            profiles[0].id,
          ],
        );
        title = "Jewellery profile updated";
        detail = String(profiles[0].id);
      } else if (operation === "promotion-handover") {
        if (!["AVAILABLE", "JEWELLERY"].includes(stone.status))
          throw new HttpError(409, "Only available stones or finished jewellery can be handed over for promotion");
        const companyId = num(data.companyId);
        const [companies] = await db.query<RowDataPacket[]>(
          "SELECT id,name FROM companies WHERE id=? AND active=TRUE LIMIT 1",
          [companyId],
        );
        if (!companies[0]) throw new HttpError(422, "Select a promotion company");
        const [active] = await db.query<RowDataPacket[]>(
          "SELECT id FROM promotion_handovers WHERE stone_id=? AND status='WITH_COMPANY' LIMIT 1",
          [stoneId],
        );
        if (active[0]) throw new HttpError(409, "This item is already with a promotion company");
        const handedOverAt = text(data.handedOverAt).replace("T", " ");
        const deadline = text(data.deadline);
        if (!handedOverAt || !deadline)
          throw new HttpError(422, "Handover time and deadline are required");
        const handoverId = `PRO-${Date.now()}`;
        await db.execute(
          `INSERT INTO promotion_handovers
           (id,stone_id,company_id,handed_over_at,deadline_on,notes) VALUES (?,?,?,?,?,?)`,
          [handoverId, stoneId, companyId, handedOverAt, deadline, text(data.notes) || null],
        );
        title = "Item handed over for promotion";
        detail = `${companies[0].name} · due ${deadline}`;
      } else if (operation === "promotion-return") {
        const [handovers] = await db.query<RowDataPacket[]>(
          `SELECT h.id,c.name FROM promotion_handovers h JOIN companies c ON c.id=h.company_id
           WHERE h.stone_id=? AND h.status='WITH_COMPANY' ORDER BY h.created_at DESC LIMIT 1`,
          [stoneId],
        );
        if (!handovers[0]) throw new HttpError(409, "No active promotion handover found");
        await db.execute(
          "UPDATE promotion_handovers SET status='RETURNED',returned_at=NOW(),return_notes=? WHERE id=?",
          [text(data.returnNotes) || null, handovers[0].id],
        );
        title = "Item received from promotion company";
        detail = `${handovers[0].name} · ${text(data.returnNotes) || "Returned"}`;
      } else if (operation === "reserve" || operation === "sale") {
        const buyer = text(data.buyer),
          buyerId = await contact(buyer, "BUYER"),
          price = num(data.price),
          payment = num(data.deposit ?? data.payment);
        const id = `${operation === "reserve" ? "RES" : "INV"}-${Date.now()}`;
        await db.execute(
          "INSERT INTO sales (id,stone_id,buyer_contact_id,status,agreed_price,disclosure_snapshot,reserved_at,sold_at) VALUES (?,?,?,?,?,?,IF(?='RESERVED',NOW(),NULL),IF(?='SOLD',NOW(),NULL))",
          [
            id,
            stoneId,
            buyerId,
            operation === "reserve" ? "RESERVED" : "SOLD",
            price,
            stone.treatmentDisclosure,
            operation === "reserve" ? "RESERVED" : "SOLD",
            operation === "reserve" ? "RESERVED" : "SOLD",
          ],
        );
        if (payment > 0)
          await db.execute(
            "INSERT INTO payments (sale_id,amount,method) VALUES (?,?,'OTHER')",
            [id, payment],
          );
        await updateStoneState(db, stoneId, expectedVersion, {
          status: operation === "reserve" ? "RESERVED" : "SOLD",
          custodianContactId:
            operation === "sale" ? buyerId : stone.custodianContactId,
        });
        title = operation === "reserve" ? "Stone reserved" : "Sale completed";
        detail = `${buyer} · ${price}`;
      } else if (operation === "release") {
        await db.execute(
          "UPDATE sales SET status='RELEASED' WHERE stone_id=? AND status='RESERVED'",
          [stoneId],
        );
        await updateStoneState(db, stoneId, expectedVersion, {
          status: "AVAILABLE",
        });
        title = "Reservation released";
        detail = text(data.reason);
      } else if (operation === "payment") {
        const [sales] = await db.query<RowDataPacket[]>(
          `SELECT s.id,s.agreed_price,COALESCE(SUM(p.amount),0) paid
           FROM sales s LEFT JOIN payments p ON p.sale_id=s.id
           WHERE s.stone_id=? AND s.status='SOLD'
           GROUP BY s.id ORDER BY s.created_at DESC LIMIT 1`,
          [stoneId],
        );
        if (!sales[0]) throw new HttpError(409, "No completed sale found");
        const amount = num(data.amount);
        const outstanding = Number(sales[0].agreed_price) - Number(sales[0].paid);
        if (amount <= 0)
          throw new HttpError(422, "Payment amount must be greater than zero");
        if (amount > outstanding)
          throw new HttpError(
            422,
            `Payment exceeds the outstanding balance of ${outstanding}`,
          );
        await db.execute(
          "INSERT INTO payments (sale_id,amount,method,reference) VALUES (?,?,?,?)",
          [
            sales[0].id,
            amount,
            text(data.method).toUpperCase().replaceAll(" ", "_") || "OTHER",
            text(data.reference) || null,
          ],
        );
        title = "Payment received";
        detail = String(amount);
      } else throw new HttpError(422, "Unsupported operation");
      const updatedStone = await requireStone(stoneId, db);
      const before = stoneSnapshot(stone);
      const after = stoneSnapshot(updatedStone);
      const submittedValues = Object.fromEntries(
        Object.entries(data)
          .filter(([key]) => key !== "expectedVersion")
          .map(([key, value]) => [key, value === "" ? null : value]),
      );
      await addEvent(db, {
        stoneId,
        eventType: operation.toUpperCase().replaceAll("-", "_"),
        title,
        details: {
          detail,
          performedBy: String(response.locals.auditUser?.name ?? "System"),
          submittedValues,
          stoneChanges: changedValues(before, after),
          before,
          after,
        },
      });
    });
    response.status(201).json({ data: { ok: true } });
  }),
);

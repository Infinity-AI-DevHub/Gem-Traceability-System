import { Router } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../../database/pool.js";
import { asyncHandler } from "../../lib/async-handler.js";

export const ledgerRouter = Router();

const status: Record<string, string> = {
  AVAILABLE: "Available",
  RESERVED: "With Salesman",
  IN_CUTTING: "In Cutting",
  IN_TREATMENT: "In Treatment",
  SOLD: "Sold",
  ON_HOLD: "On Hold",
};
const jobStatus: Record<string, string> = {
  PENDING_DISPATCH: "Pending dispatch",
  WITH_PROVIDER: "With provider",
  RETURNED: "Returned",
  CANCELLED: "Returned",
};
const dateOnly = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value))
    return value.slice(0, 10);
  return new Date(String(value)).toISOString().slice(0, 10);
};

ledgerRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    const [
      [stones],
      [events],
      [jobs],
      [sales],
      [contacts],
      [images],
      [workshops],
      [providers],
      [sellers],
      [salesmen],
      [salesmanHandovers],
    ] = await Promise.all([
      pool.query<
        RowDataPacket[]
      >(`SELECT s.*, l.name location_name, c.display_name custodian_name,
        COALESCE(seller_record.name,seller.display_name) seller_name
      FROM stones s LEFT JOIN locations l ON l.id=s.location_id LEFT JOIN contacts c ON c.id=s.custodian_contact_id
      LEFT JOIN contacts seller ON seller.id=s.seller_contact_id
      LEFT JOIN sellers seller_record ON seller_record.id=s.seller_id ORDER BY s.created_at DESC`),
      pool.query<
        RowDataPacket[]
      >(`SELECT e.*, c.display_name actor_name FROM lifecycle_events e
      LEFT JOIN contacts c ON c.id=e.actor_contact_id ORDER BY e.occurred_at DESC, e.id DESC`),
      pool.query<
        RowDataPacket[]
      >(`SELECT j.*, COALESCE(p.display_name,c.display_name,w.name) provider_name,
          COALESCE(w.name,c.display_name) workshop_name FROM workshop_jobs j
      LEFT JOIN workshops w ON w.id=j.workshop_id
      LEFT JOIN providers p ON p.id=j.provider_id
      LEFT JOIN contacts c ON c.id=j.provider_contact_id ORDER BY j.created_at DESC`),
      pool.query<
        RowDataPacket[]
      >(`SELECT s.*, c.display_name buyer_name, COALESCE(SUM(p.amount),0) paid
      FROM sales s JOIN contacts c ON c.id=s.buyer_contact_id LEFT JOIN payments p ON p.sale_id=s.id
      GROUP BY s.id ORDER BY s.created_at DESC`),
      pool.query<RowDataPacket[]>(
        "SELECT * FROM contacts WHERE active=TRUE ORDER BY display_name",
      ),
      pool.query<RowDataPacket[]>(
        "SELECT id,stone_id,mime_type,TO_BASE64(image_data) image_base64,captured FROM stone_images ORDER BY sort_order,id",
      ),
      pool.query<RowDataPacket[]>(
        "SELECT id,name,workshop_type,phone,address FROM workshops WHERE active=TRUE ORDER BY name",
      ),
      pool.query<RowDataPacket[]>(
        "SELECT id,workshop_id,display_name,specialty,phone FROM providers WHERE active=TRUE ORDER BY display_name",
      ),
      pool.query<RowDataPacket[]>(
        "SELECT id,name,phone,email,locality,notes FROM sellers WHERE active=TRUE ORDER BY name",
      ),
      pool.query<RowDataPacket[]>(
        "SELECT id,name,phone,email,locality,notes FROM salesmen WHERE active=TRUE ORDER BY name",
      ),
      pool.query<RowDataPacket[]>(
        `SELECT h.*,sm.name salesman_name FROM salesman_handovers h
         JOIN salesmen sm ON sm.id=h.salesman_id ORDER BY h.created_at DESC`,
      ),
    ]);
    const imageMap = new Map<
      string,
      Array<{ id: number; url: string; captured: boolean }>
    >();
    for (const image of images) {
      const list = imageMap.get(image.stone_id) ?? [];
      list.push({
        id: Number(image.id),
        url: `data:${image.mime_type};base64,${image.image_base64}`,
        captured: Boolean(image.captured),
      });
      imageMap.set(image.stone_id, list);
    }
    response.json({
      data: {
        stones: stones.map((s) => ({
          id: s.id,
          productId: s.product_id,
          qrToken: s.qr_token,
          type: s.gem_type,
          origin: s.origin,
          weight: Number(s.current_weight),
          originalWeight: Number(s.intake_weight),
          color: s.color ?? "Not recorded",
          shape: s.shape ?? "Not recorded",
          cut: s.cut_style ?? "Not recorded",
          purchase: Number(s.purchase_cost),
          asking: Number(s.asking_price ?? 0),
          status: status[s.status],
          location: s.location_name ?? "Not assigned",
          custodian: s.custodian_name ?? "Not assigned",
          treatment: s.treatment_disclosure,
          certificate: s.certificate_reference ?? "None",
          seller: s.seller_name ?? "Not recorded",
          sellerId: s.seller_id == null ? null : Number(s.seller_id),
          acquired: dateOnly(s.acquired_on),
          notes: s.notes ?? "",
          version: s.version,
          images: imageMap.get(s.id) ?? [],
        })),
        events: events.map((e) => {
          const details =
            typeof e.details === "string" ? JSON.parse(e.details) : e.details;
          return {
            id: String(e.id),
            stoneId: e.stone_id,
            at: new Date(e.occurred_at).toLocaleString("en-LK", {
              dateStyle: "medium",
              timeStyle: "short",
            }),
            title: e.title,
            detail:
              details.detail ??
              Object.entries(details)
                .map(([k, v]) => `${k}: ${String(v)}`)
                .join(" · "),
            actor: e.actor_name ?? "System",
            category: e.event_type,
          };
        }),
        jobs: jobs.map((j) => ({
          id: j.id,
          stoneId: j.stone_id,
          kind: j.job_type === "CUTTING" ? "Cutting" : "Treatment",
          provider: j.provider_name,
          workshop: j.workshop_name,
          status: jobStatus[j.status],
          handoverDate: dateOnly(j.handover_on),
          due: dateOnly(j.due_on),
          started: dateOnly(j.created_at),
          cost: Number(j.final_cost ?? j.estimated_cost),
          beforeWeight: Number(j.outgoing_weight),
          afterWeight:
            j.returned_weight == null ? undefined : Number(j.returned_weight),
          notes: j.instructions ?? "",
        })),
        sales: sales.map((s) => ({
          id: s.id,
          stoneId: s.stone_id,
          buyer: s.buyer_name,
          price: Number(s.agreed_price),
          paid: Number(s.paid),
          status: s.status[0] + s.status.slice(1).toLowerCase(),
          date: dateOnly(s.sold_at ?? s.reserved_at ?? s.created_at),
          disclosure: s.disclosure_snapshot,
        })),
        contacts: contacts.map((c) => ({
          name: c.display_name,
          role: c.role[0] + c.role.slice(1).toLowerCase(),
          phone: c.phone ?? "",
          locality: c.locality ?? "",
        })),
        workshops: workshops.map((w) => ({
          id: Number(w.id),
          name: w.name,
          type: w.workshop_type,
          phone: w.phone ?? "",
          address: w.address ?? "",
        })),
        providers: providers.map((p) => ({
          id: Number(p.id),
          workshopId: Number(p.workshop_id),
          name: p.display_name,
          specialty: p.specialty,
          phone: p.phone ?? "",
        })),
        sellers: sellers.map((seller) => ({
          id: Number(seller.id),
          name: seller.name,
          phone: seller.phone ?? "",
          email: seller.email ?? "",
          locality: seller.locality ?? "",
          notes: seller.notes ?? "",
        })),
        salesmen: salesmen.map((salesman) => ({
          id: Number(salesman.id),
          name: salesman.name,
          phone: salesman.phone ?? "",
          email: salesman.email ?? "",
          locality: salesman.locality ?? "",
          notes: salesman.notes ?? "",
        })),
        salesmanHandovers: salesmanHandovers.map((handover) => ({
          id: handover.id,
          stoneId: handover.stone_id,
          salesmanId: Number(handover.salesman_id),
          salesman: handover.salesman_name,
          status:
            handover.status === "WITH_SALESMAN"
              ? "With salesman"
              : handover.status === "RETURNED"
                ? "Returned"
                : "Sold",
          quotedPrice: Number(handover.quoted_price),
          handedOverAt: new Date(handover.handed_over_at).toISOString(),
          deadline: dateOnly(handover.deadline_on),
          returnedAt: handover.returned_at
            ? new Date(handover.returned_at).toISOString()
            : "",
          soldAt: handover.sold_at
            ? new Date(handover.sold_at).toISOString()
            : "",
          finalPrice: Number(handover.final_price ?? 0),
          returnNotes: handover.return_notes ?? "",
        })),
      },
    });
  }),
);

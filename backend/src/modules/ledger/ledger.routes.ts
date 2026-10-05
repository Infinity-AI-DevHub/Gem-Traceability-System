import { Router } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../../database/pool.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { imageUrl } from "../../lib/image-storage.js";

export const ledgerRouter = Router();

const status: Record<string, string> = {
  AVAILABLE: "Available",
  RESERVED: "With Salesman",
  IN_CUTTING: "In Cutting",
  IN_TREATMENT: "In Treatment",
  IN_JEWELLERY: "In Jewellery",
  JEWELLERY: "Jewellery",
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
      [sellerImages],
      [salesmen],
      [salesmanHandovers],
      [buyers],
      [directSales],
      [jewelleryJobs],
      [jewelleryProfiles],
      [jewelleryImages],
      [companies],
      [promotionHandovers],
      [categories],
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
        "SELECT id,stone_id,file_path,mime_type,TO_BASE64(image_data) image_base64,captured FROM stone_images ORDER BY sort_order,id",
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
        "SELECT id,seller_id,file_path,mime_type,TO_BASE64(image_data) image_base64,captured FROM seller_images ORDER BY sort_order,id",
      ),
      pool.query<RowDataPacket[]>(
        "SELECT id,name,phone,email,locality,notes FROM salesmen WHERE active=TRUE ORDER BY name",
      ),
      pool.query<RowDataPacket[]>(
        `SELECT h.*,sm.name salesman_name FROM salesman_handovers h
         JOIN salesmen sm ON sm.id=h.salesman_id ORDER BY h.created_at DESC`,
      ),
      pool.query<RowDataPacket[]>(
        "SELECT id,name,phone,email,locality,notes FROM buyers WHERE active=TRUE ORDER BY name",
      ),
      pool.query<RowDataPacket[]>(
        `SELECT ds.*,b.name buyer_name,b.phone buyer_phone,b.email buyer_email,b.locality buyer_locality
         FROM direct_sales ds JOIN buyers b ON b.id=ds.buyer_id ORDER BY ds.sold_at DESC`,
      ),
      pool.query<RowDataPacket[]>(
        `SELECT j.*,w.name workshop_name FROM jewellery_jobs j
         JOIN workshops w ON w.id=j.workshop_id ORDER BY j.created_at DESC`,
      ),
      pool.query<RowDataPacket[]>(
        "SELECT * FROM jewellery_profiles ORDER BY created_at DESC",
      ),
      pool.query<RowDataPacket[]>(
        "SELECT id,jewellery_id,file_path,mime_type,TO_BASE64(image_data) image_base64,captured FROM jewellery_images ORDER BY sort_order,id",
      ),
      pool.query<RowDataPacket[]>(
        "SELECT id,name,phone,email,address,contact_person FROM companies WHERE active=TRUE ORDER BY name",
      ),
      pool.query<RowDataPacket[]>(
        `SELECT h.*,c.name company_name FROM promotion_handovers h
         JOIN companies c ON c.id=h.company_id ORDER BY h.created_at DESC`,
      ),
      pool.query<RowDataPacket[]>(
        `SELECT id,category_key,name,description,sort_order
         FROM category_items WHERE active=TRUE ORDER BY category_key,sort_order,name`,
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
        url: imageUrl(image),
        captured: Boolean(image.captured),
      });
      imageMap.set(image.stone_id, list);
    }
    const jewelleryImageMap = new Map<
      string,
      Array<{ id: number; url: string; captured: boolean }>
    >();
    for (const image of jewelleryImages) {
      const list = jewelleryImageMap.get(image.jewellery_id) ?? [];
      list.push({
        id: Number(image.id),
        url: imageUrl(image),
        captured: Boolean(image.captured),
      });
      jewelleryImageMap.set(image.jewellery_id, list);
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
            actor: details.performedBy ?? e.actor_name ?? "System",
            category: e.event_type,
            details,
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
          id: Number(c.id),
          name: c.display_name,
          role: c.role[0] + c.role.slice(1).toLowerCase(),
          phone: c.phone ?? "",
          email: c.email ?? "",
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
          images: sellerImages
            .filter((image) => Number(image.seller_id) === Number(seller.id))
            .map((image) => ({
              id: Number(image.id),
              url: imageUrl(image),
              captured: Boolean(image.captured),
            })),
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
        buyers: buyers.map((buyer) => ({
          id: Number(buyer.id),
          name: buyer.name,
          phone: buyer.phone ?? "",
          email: buyer.email ?? "",
          locality: buyer.locality ?? "",
          notes: buyer.notes ?? "",
        })),
        directSales: directSales.map((sale) => ({
          id: sale.id,
          stoneId: sale.stone_id,
          buyerId: Number(sale.buyer_id),
          buyer: sale.buyer_name,
          buyerPhone: sale.buyer_phone ?? "",
          buyerEmail: sale.buyer_email ?? "",
          buyerLocality: sale.buyer_locality ?? "",
          finalPrice: Number(sale.final_price),
          soldAt: new Date(sale.sold_at).toISOString(),
          notes: sale.notes ?? "",
        })),
        jewelleryJobs: jewelleryJobs.map((job) => ({
          id: job.id,
          stoneId: job.stone_id,
          workshopId: Number(job.workshop_id),
          workshop: job.workshop_name,
          status: job.status === "WITH_WORKSHOP" ? "With workshop" : "Received",
          handedOverAt: new Date(job.handed_over_at).toISOString(),
          deadline: dateOnly(job.deadline_on),
          receivedAt: job.received_at
            ? new Date(job.received_at).toISOString()
            : "",
          instructions: job.instructions ?? "",
          receiveNotes: job.receive_notes ?? "",
        })),
        jewelleryProfiles: jewelleryProfiles.map((profile) => ({
          id: profile.id,
          stoneId: profile.stone_id,
          jobId: profile.job_id,
          itemType: profile.item_type,
          metalType: profile.metal_type ?? "Not recorded",
          metalPurity: profile.metal_purity ?? "Not recorded",
          metalWeight: Number(profile.metal_weight ?? 0),
          totalWeight: Number(profile.total_weight ?? 0),
          settingStyle: profile.setting_style ?? "Not recorded",
          itemSize: profile.item_size ?? "Not recorded",
          description: profile.description ?? "",
          version: Number(profile.version),
          images: jewelleryImageMap.get(profile.id) ?? [],
        })),
        companies: companies.map((company) => ({
          id: Number(company.id),
          name: company.name,
          phone: company.phone ?? "",
          email: company.email ?? "",
          address: company.address ?? "",
          contactPerson: company.contact_person ?? "",
        })),
        promotionHandovers: promotionHandovers.map((handover) => ({
          id: handover.id,
          stoneId: handover.stone_id,
          companyId: Number(handover.company_id),
          company: handover.company_name,
          status: handover.status === "WITH_COMPANY" ? "With company" : "Returned",
          handedOverAt: new Date(handover.handed_over_at).toISOString(),
          deadline: dateOnly(handover.deadline_on),
          returnedAt: handover.returned_at
            ? new Date(handover.returned_at).toISOString()
            : "",
          notes: handover.notes ?? "",
          returnNotes: handover.return_notes ?? "",
        })),
        categories: categories.map((item) => ({
          id: Number(item.id),
          categoryKey: item.category_key,
          name: item.name,
          description: item.description ?? "",
          sortOrder: Number(item.sort_order),
        })),
      },
    });
  }),
);

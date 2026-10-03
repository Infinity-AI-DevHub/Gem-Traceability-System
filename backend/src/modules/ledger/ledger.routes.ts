import { Router } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../../database/pool.js";
import { asyncHandler } from "../../lib/async-handler.js";

export const ledgerRouter = Router();

const status: Record<string, string> = { AVAILABLE: "Available", RESERVED: "Reserved", IN_CUTTING: "In Cutting", IN_TREATMENT: "In Treatment", SOLD: "Sold", ON_HOLD: "On Hold" };
const jobStatus: Record<string, string> = { PENDING_DISPATCH: "Pending dispatch", WITH_PROVIDER: "With provider", RETURNED: "Returned", CANCELLED: "Returned" };

ledgerRouter.get("/", asyncHandler(async (_request, response) => {
  const [[stones], [events], [jobs], [sales], [contacts]] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT s.*, l.name location_name, c.display_name custodian_name, seller.display_name seller_name
      FROM stones s LEFT JOIN locations l ON l.id=s.location_id LEFT JOIN contacts c ON c.id=s.custodian_contact_id
      LEFT JOIN contacts seller ON seller.id=s.seller_contact_id ORDER BY s.created_at DESC`),
    pool.query<RowDataPacket[]>(`SELECT e.*, c.display_name actor_name FROM lifecycle_events e
      LEFT JOIN contacts c ON c.id=e.actor_contact_id ORDER BY e.occurred_at DESC, e.id DESC`),
    pool.query<RowDataPacket[]>(`SELECT j.*, c.display_name provider_name FROM workshop_jobs j
      JOIN contacts c ON c.id=j.provider_contact_id ORDER BY j.created_at DESC`),
    pool.query<RowDataPacket[]>(`SELECT s.*, c.display_name buyer_name, COALESCE(SUM(p.amount),0) paid
      FROM sales s JOIN contacts c ON c.id=s.buyer_contact_id LEFT JOIN payments p ON p.sale_id=s.id
      GROUP BY s.id ORDER BY s.created_at DESC`),
    pool.query<RowDataPacket[]>("SELECT * FROM contacts WHERE active=TRUE ORDER BY display_name"),
  ]);
  response.json({ data: {
    stones: stones.map((s) => ({ id:s.id, type:s.gem_type, origin:s.origin, weight:Number(s.current_weight), originalWeight:Number(s.intake_weight), color:s.color??"Not recorded", shape:s.shape??"Not recorded", purchase:Number(s.purchase_cost), asking:Number(s.asking_price??0), status:status[s.status], location:s.location_name??"Not assigned", custodian:s.custodian_name??"Not assigned", treatment:s.treatment_disclosure, certificate:s.certificate_reference??"None", seller:s.seller_name??"Not recorded", acquired:String(s.acquired_on).slice(0,10), notes:s.notes??"", version:s.version })),
    events: events.map((e) => { const details=typeof e.details==="string"?JSON.parse(e.details):e.details; return { id:String(e.id), stoneId:e.stone_id, at:new Date(e.occurred_at).toLocaleString("en-LK",{dateStyle:"medium",timeStyle:"short"}), title:e.title, detail:details.detail??Object.entries(details).map(([k,v])=>`${k}: ${String(v)}`).join(" · "), actor:e.actor_name??"System", category:e.event_type }; }),
    jobs: jobs.map((j) => ({ id:j.id, stoneId:j.stone_id, kind:j.job_type==="CUTTING"?"Cutting":"Treatment", provider:j.provider_name, status:jobStatus[j.status], due:j.due_on?String(j.due_on).slice(0,10):"", started:String(j.created_at).slice(0,10), cost:Number(j.final_cost??j.estimated_cost), beforeWeight:Number(j.outgoing_weight), afterWeight:j.returned_weight==null?undefined:Number(j.returned_weight), notes:j.instructions??"" })),
    sales: sales.map((s) => ({ id:s.id, stoneId:s.stone_id, buyer:s.buyer_name, price:Number(s.agreed_price), paid:Number(s.paid), status:s.status[0]+s.status.slice(1).toLowerCase(), date:String(s.sold_at??s.reserved_at??s.created_at).slice(0,10), disclosure:s.disclosure_snapshot })),
    contacts: contacts.map((c) => ({ name:c.display_name, role:c.role[0]+c.role.slice(1).toLowerCase(), phone:c.phone??"", locality:c.locality??"" })),
  }});
}));

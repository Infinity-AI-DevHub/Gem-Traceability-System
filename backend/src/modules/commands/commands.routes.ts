import { Router } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { transaction } from "../../database/pool.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { HttpError } from "../../lib/http-error.js";
import { addEvent } from "../events/events.repository.js";
import { requireStone, updateStoneState } from "../stones/stones.repository.js";

export const commandsRouter = Router();
const inputSchema=z.object({operation:z.string(),stoneId:z.string(),data:z.record(z.string(),z.unknown())});
const text=(v:unknown)=>String(v??"").trim();const num=(v:unknown)=>Number(v??0);

commandsRouter.post("/",asyncHandler(async(request,response)=>{
 const {operation,stoneId,data}=inputSchema.parse(request.body);const expectedVersion=num(data.expectedVersion);
 await transaction(async db=>{
  const stone=await requireStone(stoneId,db);let title="Operation recorded",detail="";
  const contact=async(name:string,role:string)=>{await db.execute(`INSERT INTO contacts (display_name,role) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM contacts WHERE display_name=? AND role=?)`,[name,role,name,role]);const[r]=await db.query<RowDataPacket[]>("SELECT id FROM contacts WHERE display_name=? AND role=? LIMIT 1",[name,role]);return Number(r[0]?.id)};
  if(operation==="hold"||operation==="clear-hold"||operation==="stocktake"){
   const next=operation==="hold"?"ON_HOLD":operation==="clear-hold"?"AVAILABLE":stone.status;
   if(operation!=="stocktake")await updateStoneState(db,stoneId,expectedVersion,{status:next});title=operation==="hold"?"Stone placed on hold":operation==="clear-hold"?"Hold cleared":"Stocktake verified";detail=text(data.reason)||"Physical identity and location confirmed";
  }else if(operation==="custody"){
   const name=text(data.location),person=text(data.custodian);if(!name||!person)throw new HttpError(422,"Location and custodian are required");await db.execute("INSERT INTO locations (name,location_type) VALUES (?,'OTHER') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",[name]);const[r]=await db.query<RowDataPacket[]>("SELECT id FROM locations WHERE name=?",[name]);const personId=await contact(person,"OTHER");await updateStoneState(db,stoneId,expectedVersion,{locationId:Number(r[0]?.id),custodianContactId:personId});title="Custody transferred";detail=`${name} · ${person}`;
  }else if(operation==="quality"){
   await updateStoneState(db,stoneId,expectedVersion,{treatmentDisclosure:text(data.outcome),certificateReference:text(data.report)||null});title="Quality assessment recorded";detail=text(data.notes)||text(data.outcome);
  }else if(operation==="price"){
   await db.execute("UPDATE stones SET asking_price=?,version=version+1 WHERE id=? AND version=?",[num(data.asking),stoneId,expectedVersion]);title="Asking price updated";detail=String(num(data.asking));
  }else if(operation==="job"){
   const kind=text(data.kind).toUpperCase(),provider=text(data.provider);const providerId=await contact(provider,kind==="CUTTING"?"CUTTER":"LABORATORY");const id=`${kind==="CUTTING"?"CUT":"TRT"}-${Date.now()}`;await db.execute("INSERT INTO workshop_jobs (id,stone_id,job_type,provider_contact_id,due_on,outgoing_weight,estimated_cost,instructions) VALUES (?,?,?,?,?,?,?,?)",[id,stoneId,kind,providerId,text(data.due)||null,stone.currentWeight,num(data.cost),text(data.notes)]);await updateStoneState(db,stoneId,expectedVersion,{status:kind==="CUTTING"?"IN_CUTTING":"IN_TREATMENT"});title=`${text(data.kind)} job created`;detail=`${id} · ${provider}`;
  }else if(operation==="dispatch"){
   const[jobs]=await db.query<RowDataPacket[]>("SELECT * FROM workshop_jobs WHERE stone_id=? AND status='PENDING_DISPATCH' ORDER BY created_at DESC LIMIT 1",[stoneId]);if(!jobs[0])throw new HttpError(409,"No job is awaiting dispatch");await db.execute("UPDATE workshop_jobs SET status='WITH_PROVIDER',dispatched_at=NOW() WHERE id=?",[jobs[0].id]);title="Custody transferred to provider";detail=text(data.handover);
  }else if(operation==="return"){
   const[jobs]=await db.query<RowDataPacket[]>("SELECT * FROM workshop_jobs WHERE stone_id=? AND status='WITH_PROVIDER' ORDER BY created_at DESC LIMIT 1",[stoneId]);if(!jobs[0])throw new HttpError(409,"No dispatched job was found");await db.execute("UPDATE workshop_jobs SET status='RETURNED',returned_weight=?,final_cost=?,return_notes=?,returned_at=NOW() WHERE id=?",[num(data.weight),num(data.cost),text(data.notes),jobs[0].id]);await updateStoneState(db,stoneId,expectedVersion,{status:"AVAILABLE",currentWeight:num(data.weight),treatmentDisclosure:jobs[0].job_type==="TREATMENT"?text(data.treatment):stone.treatmentDisclosure});title="Workshop job returned";detail=`${data.weight} ct`;
  }else if(operation==="reserve"||operation==="sale"){
   const buyer=text(data.buyer),buyerId=await contact(buyer,"BUYER"),price=num(data.price),payment=num(data.deposit??data.payment);const id=`${operation==="reserve"?"RES":"INV"}-${Date.now()}`;await db.execute("INSERT INTO sales (id,stone_id,buyer_contact_id,status,agreed_price,disclosure_snapshot,reserved_at,sold_at) VALUES (?,?,?,?,?,?,IF(?='RESERVED',NOW(),NULL),IF(?='SOLD',NOW(),NULL))",[id,stoneId,buyerId,operation==="reserve"?"RESERVED":"SOLD",price,stone.treatmentDisclosure,operation==="reserve"?"RESERVED":"SOLD",operation==="reserve"?"RESERVED":"SOLD"]);if(payment>0)await db.execute("INSERT INTO payments (sale_id,amount,method) VALUES (?,?,'OTHER')",[id,payment]);await updateStoneState(db,stoneId,expectedVersion,{status:operation==="reserve"?"RESERVED":"SOLD",custodianContactId:operation==="sale"?buyerId:stone.custodianContactId});title=operation==="reserve"?"Stone reserved":"Sale completed";detail=`${buyer} · ${price}`;
  }else if(operation==="release"){
   await db.execute("UPDATE sales SET status='RELEASED' WHERE stone_id=? AND status='RESERVED'",[stoneId]);await updateStoneState(db,stoneId,expectedVersion,{status:"AVAILABLE"});title="Reservation released";detail=text(data.reason);
  }else if(operation==="payment"){
   const[sales]=await db.query<RowDataPacket[]>("SELECT id FROM sales WHERE stone_id=? AND status='SOLD' ORDER BY created_at DESC LIMIT 1",[stoneId]);if(!sales[0])throw new HttpError(409,"No completed sale found");await db.execute("INSERT INTO payments (sale_id,amount,method,reference) VALUES (?,?,?,?)",[sales[0].id,num(data.amount),text(data.method).toUpperCase().replaceAll(" ","_")||"OTHER",text(data.reference)||null]);title="Payment received";detail=String(num(data.amount));
  }else throw new HttpError(422,"Unsupported operation");
  await addEvent(db,{stoneId,eventType:operation.toUpperCase().replaceAll("-","_"),title,details:{detail}});
 });response.status(201).json({data:{ok:true}});
}));

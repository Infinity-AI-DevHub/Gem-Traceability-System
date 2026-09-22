export type StoneStatus = "Available" | "Reserved" | "In Cutting" | "In Treatment" | "Sold" | "On Hold";
export type Stone = {
  id: string; type: string; origin: string; weight: number; originalWeight: number;
  color: string; shape: string; purchase: number; asking: number; status: StoneStatus;
  location: string; custodian: string; treatment: string; certificate: string;
  seller: string; acquired: string; notes: string;
};
export type Event = { id: string; stoneId: string; at: string; title: string; detail: string; actor: string; category: string };
export type Job = { id: string; stoneId: string; kind: "Cutting" | "Treatment"; provider: string; status: "Pending dispatch" | "With provider" | "Returned"; due: string; started: string; cost: number; beforeWeight: number; afterWeight?: number; notes: string };
export type Sale = { id: string; stoneId: string; buyer: string; price: number; paid: number; status: "Reserved" | "Sold" | "Released" | "Converted"; date: string; disclosure: string };
export type Contact = { name: string; role: string; phone: string; locality: string };
export type Ledger = { stones: Stone[]; events: Event[]; jobs: Job[]; sales: Sale[]; contacts: Contact[] };

export const today = () => new Date().toISOString().slice(0, 10);
export const money = (n: number) => `LKR ${new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(n)}`;
export const stamp = () => new Date().toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" });

export const initialLedger: Ledger = {
  stones: [
    { id:"GEM-SAP-26-0147",type:"Blue Sapphire",origin:"Ratnapura",weight:3.42,originalWeight:3.67,color:"Cornflower blue",shape:"Oval mixed",purchase:785000,asking:1480000,status:"Available",location:"Main vault · A03",custodian:"D. Alwis",treatment:"No treatment declared",certificate:"GIC 4841",seller:"R. Gunasekara",acquired:"2026-09-04",notes:"Eye clean; natural inclusions under magnification." },
    { id:"GEM-RUB-26-0146",type:"Ruby",origin:"Mozambique",weight:1.86,originalWeight:1.86,color:"Vivid red",shape:"Cushion",purchase:510000,asking:920000,status:"Reserved",location:"Display tray · R02",custodian:"D. Alwis",treatment:"Heated · dealer disclosed",certificate:"Pending",seller:"M. Fernando",acquired:"2026-08-29",notes:"Reserved for Nimal Perera." },
    { id:"GEM-SPI-26-0145",type:"Pink Spinel",origin:"Elahera",weight:2.14,originalWeight:2.14,color:"Rose pink",shape:"Rough",purchase:280000,asking:0,status:"In Cutting",location:"Saman Stones · external",custodian:"Saman Stones",treatment:"Not assessed",certificate:"None",seller:"R. Gunasekara",acquired:"2026-09-11",notes:"Windowing to be corrected during recut." },
    { id:"GEM-SAP-26-0144",type:"Yellow Sapphire",origin:"Beruwala",weight:4.08,originalWeight:4.31,color:"Golden yellow",shape:"Emerald",purchase:315000,asking:675000,status:"Available",location:"Main vault · A07",custodian:"D. Alwis",treatment:"No treatment declared",certificate:"GIC 4798",seller:"S. De Silva",acquired:"2026-08-12",notes:"Polished, ready for listing." },
    { id:"GEM-CHR-26-0143",type:"Chrysoberyl",origin:"Balangoda",weight:2.72,originalWeight:2.72,color:"Greenish yellow",shape:"Oval",purchase:198000,asking:0,status:"In Treatment",location:"Lanka Heat Lab · external",custodian:"Lanka Heat Lab",treatment:"Treatment in progress",certificate:"None",seller:"K. Wijesinghe",acquired:"2026-09-01",notes:"Awaiting return and assessment." },
    { id:"GEM-SAP-26-0142",type:"Padparadscha",origin:"Ratnapura",weight:1.21,originalWeight:1.32,color:"Pink-orange",shape:"Cushion",purchase:890000,asking:1650000,status:"Sold",location:"Released to buyer",custodian:"Ayesha Fernando",treatment:"No indication of heat · GIC report",certificate:"GIC 4752",seller:"R. Gunasekara",acquired:"2026-07-22",notes:"Sale record retained for traceability." },
  ],
  events: [
    {id:"ev-1",stoneId:"GEM-SAP-26-0147",at:"19 Sep 2026 · 9:42 AM",title:"Listed for sale",detail:"Asking price LKR 1,480,000",actor:"D. Alwis",category:"Sale"},
    {id:"ev-2",stoneId:"GEM-SAP-26-0147",at:"17 Sep 2026 · 2:10 PM",title:"Laboratory report logged",detail:"GIC 4841 · No indication of heat",actor:"D. Alwis",category:"Quality"},
    {id:"ev-3",stoneId:"GEM-SAP-26-0147",at:"12 Sep 2026 · 11:30 AM",title:"Repolishing completed",detail:"3.67 ct → 3.42 ct; cost LKR 32,000",actor:"D. Alwis",category:"Cutting"},
    {id:"ev-4",stoneId:"GEM-SAP-26-0147",at:"04 Sep 2026 · 10:05 AM",title:"Stone received",detail:"Purchased from R. Gunasekara; assigned GEM-SAP-26-0147",actor:"D. Alwis",category:"Intake"},
    {id:"ev-5",stoneId:"GEM-RUB-26-0146",at:"18 Sep 2026 · 4:15 PM",title:"Reserved",detail:"Nimal Perera · agreed LKR 920,000",actor:"D. Alwis",category:"Reservation"},
    {id:"ev-6",stoneId:"GEM-SPI-26-0145",at:"16 Sep 2026 · 2:20 PM",title:"Custody transferred",detail:"Signed out to Saman Stones for cutting",actor:"D. Alwis",category:"Custody"},
    {id:"ev-7",stoneId:"GEM-CHR-26-0143",at:"17 Sep 2026 · 9:40 AM",title:"Treatment dispatched",detail:"Transferred to Lanka Heat Lab",actor:"D. Alwis",category:"Treatment"},
    {id:"ev-8",stoneId:"GEM-SAP-26-0142",at:"17 Sep 2026 · 5:15 PM",title:"Sale completed",detail:"INV-2026-0037 · Ayesha Fernando · LKR 1,650,000",actor:"D. Alwis",category:"Sale"},
  ],
  jobs: [
    {id:"CUT-0098",stoneId:"GEM-SPI-26-0145",kind:"Cutting",provider:"Saman Stones",status:"With provider",due:"2026-09-25",started:"2026-09-16",cost:42000,beforeWeight:2.14,notes:"Correct windowing; return weight and measurements required."},
    {id:"TRT-0041",stoneId:"GEM-CHR-26-0143",kind:"Treatment",provider:"Lanka Heat Lab",status:"With provider",due:"2026-09-26",started:"2026-09-17",cost:28000,beforeWeight:2.72,notes:"Assess and return with process notes."},
    {id:"CUT-0097",stoneId:"GEM-SAP-26-0147",kind:"Cutting",provider:"Saman Stones",status:"Returned",due:"2026-09-14",started:"2026-09-06",cost:32000,beforeWeight:3.67,afterWeight:3.42,notes:"Repolish completed."},
  ],
  sales: [
    {id:"RES-2026-0018",stoneId:"GEM-RUB-26-0146",buyer:"Nimal Perera",price:920000,paid:100000,status:"Reserved",date:"2026-09-18",disclosure:"Heated · dealer disclosed"},
    {id:"INV-2026-0037",stoneId:"GEM-SAP-26-0142",buyer:"Ayesha Fernando",price:1650000,paid:1650000,status:"Sold",date:"2026-09-17",disclosure:"No indication of heat · GIC report"},
  ],
  contacts: [
    {name:"Nimal Perera",role:"Buyer",phone:"+94 77 234 8910",locality:"Colombo"},
    {name:"Ayesha Fernando",role:"Buyer",phone:"+94 71 482 2301",locality:"Colombo"},
    {name:"R. Gunasekara",role:"Seller",phone:"+94 77 840 2188",locality:"Ratnapura"},
    {name:"Saman Stones",role:"Cutter",phone:"+94 45 228 3110",locality:"Ratnapura"},
    {name:"Lanka Heat Lab",role:"Laboratory",phone:"+94 11 269 4020",locality:"Colombo"},
  ],
};

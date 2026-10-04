export type StoneStatus =
  | "Available"
  | "With Salesman"
  | "In Cutting"
  | "In Treatment"
  | "Sold"
  | "On Hold";
export type Stone = {
  id: string;
  productId: string;
  qrToken: string;
  type: string;
  origin: string;
  weight: number;
  originalWeight: number;
  color: string;
  shape: string;
  cut: string;
  purchase: number;
  asking: number;
  status: StoneStatus;
  location: string;
  custodian: string;
  treatment: string;
  certificate: string;
  seller: string;
  sellerId: number | null;
  acquired: string;
  notes: string;
  version: number;
  images: Array<{ id: number; url: string; captured: boolean }>;
};
export type Event = {
  id: string;
  stoneId: string;
  at: string;
  title: string;
  detail: string;
  actor: string;
  category: string;
};
export type Job = {
  id: string;
  stoneId: string;
  kind: "Cutting" | "Treatment";
  provider: string;
  workshop: string;
  status: "Pending dispatch" | "With provider" | "Returned";
  handoverDate: string;
  due: string;
  started: string;
  cost: number;
  beforeWeight: number;
  afterWeight?: number;
  notes: string;
};
export type Workshop = {
  id: number;
  name: string;
  type: "CUTTING" | "TREATMENT" | "BOTH";
  phone: string;
  address: string;
};
export type Provider = {
  id: number;
  workshopId: number;
  name: string;
  specialty: "CUTTING" | "TREATMENT" | "BOTH";
  phone: string;
};
export type Seller = {
  id: number;
  name: string;
  phone: string;
  email: string;
  locality: string;
  notes: string;
};
export type Salesman = {
  id: number;
  name: string;
  phone: string;
  email: string;
  locality: string;
  notes: string;
};
export type SalesmanHandover = {
  id: string;
  stoneId: string;
  salesmanId: number;
  salesman: string;
  status: "With salesman" | "Returned" | "Sold";
  quotedPrice: number;
  handedOverAt: string;
  deadline: string;
  returnedAt: string;
  soldAt: string;
  finalPrice: number;
  returnNotes: string;
};
export type Sale = {
  id: string;
  stoneId: string;
  buyer: string;
  price: number;
  paid: number;
  status: "Reserved" | "Sold" | "Released" | "Converted";
  date: string;
  disclosure: string;
};
export type Contact = {
  name: string;
  role: string;
  phone: string;
  locality: string;
};
export type Ledger = {
  stones: Stone[];
  events: Event[];
  jobs: Job[];
  sales: Sale[];
  contacts: Contact[];
  workshops: Workshop[];
  providers: Provider[];
  sellers: Seller[];
  salesmen: Salesman[];
  salesmanHandovers: SalesmanHandover[];
};

export const emptyLedger: Ledger = {
  stones: [],
  events: [],
  jobs: [],
  sales: [],
  contacts: [],
  workshops: [],
  providers: [],
  sellers: [],
  salesmen: [],
  salesmanHandovers: [],
};
export const today = () => new Date().toISOString().slice(0, 10);
export const stamp = () =>
  new Date().toLocaleString("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
export const money = (n: number) =>
  `LKR ${new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(n)}`;

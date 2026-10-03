export type StoneStatus = "Available" | "Reserved" | "In Cutting" | "In Treatment" | "Sold" | "On Hold";
export type Stone = {
  id: string; type: string; origin: string; weight: number; originalWeight: number;
  color: string; shape: string; purchase: number; asking: number; status: StoneStatus;
  location: string; custodian: string; treatment: string; certificate: string;
  seller: string; acquired: string; notes: string; version: number;
};
export type Event = { id: string; stoneId: string; at: string; title: string; detail: string; actor: string; category: string };
export type Job = { id: string; stoneId: string; kind: "Cutting" | "Treatment"; provider: string; status: "Pending dispatch" | "With provider" | "Returned"; due: string; started: string; cost: number; beforeWeight: number; afterWeight?: number; notes: string };
export type Sale = { id: string; stoneId: string; buyer: string; price: number; paid: number; status: "Reserved" | "Sold" | "Released" | "Converted"; date: string; disclosure: string };
export type Contact = { name: string; role: string; phone: string; locality: string };
export type Ledger = { stones: Stone[]; events: Event[]; jobs: Job[]; sales: Sale[]; contacts: Contact[] };

export const emptyLedger: Ledger = { stones: [], events: [], jobs: [], sales: [], contacts: [] };
export const today = () => new Date().toISOString().slice(0, 10);
export const stamp = () => new Date().toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" });
export const money = (n: number) => `LKR ${new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(n)}`;

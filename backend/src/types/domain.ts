export const stoneStatuses = ["AVAILABLE", "RESERVED", "IN_CUTTING", "IN_TREATMENT", "SOLD", "ON_HOLD"] as const;
export type StoneStatus = (typeof stoneStatuses)[number];

export type StoneRow = {
  id: string;
  gemType: string;
  origin: string;
  currentWeight: number;
  intakeWeight: number;
  color: string | null;
  shape: string | null;
  purchaseCost: number;
  askingPrice: number | null;
  status: StoneStatus;
  locationId: number | null;
  custodianContactId: number | null;
  treatmentDisclosure: string;
  certificateReference: string | null;
  sellerContactId: number | null;
  acquiredOn: string;
  notes: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

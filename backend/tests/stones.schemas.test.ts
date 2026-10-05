import { describe, expect, it } from "vitest";
import { intakeStoneBatch } from "../src/modules/stones/stones.schemas.js";

const validStone = {
  gemType: "Ruby",
  origin: "Ratnapura",
  weight: 1.25,
  purchaseCost: 125000,
  treatmentDisclosure: "Not assessed",
  locationName: "Main vault · Intake",
  acquiredOn: "2026-10-06",
};

describe("multi-stone intake validation", () => {
  it("accepts an intake containing two valid stones", () => {
    const result = intakeStoneBatch.safeParse({
      stones: [validStone, { ...validStone, gemType: "Blue Sapphire" }],
    });

    expect(result.success).toBe(true);
  });

  it("requires at least two stones", () => {
    const result = intakeStoneBatch.safeParse({ stones: [validStone] });

    expect(result.success).toBe(false);
  });

  it("limits one intake to twenty stones", () => {
    const result = intakeStoneBatch.safeParse({
      stones: Array.from({ length: 21 }, () => validStone),
    });

    expect(result.success).toBe(false);
  });
});

/* global process, fetch, console */
import assert from "node:assert/strict";

const baseUrl = process.env.AUDIT_API_URL ?? "http://127.0.0.1:4010/api/v1";
const username = process.env.AUDIT_USERNAME ?? "audit-admin";
const password = process.env.AUDIT_PASSWORD ?? "AuditOnly-2026!";
let cookie = "";
const checks = [];

async function request(path, { method = "GET", body, expected = 200 } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = response.status === 204 ? null : await response.json();
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: expected ${expected}, received ${response.status}: ${JSON.stringify(payload)}`,
  );
  return { response, data: payload?.data, payload };
}

async function check(name, work) {
  await work();
  checks.push(name);
  console.log(`PASS ${name}`);
}

const command = (operation, stoneId, data) =>
  request("/commands", {
    method: "POST",
    expected: 201,
    body: { operation, stoneId, data },
  });
const ledger = async () => (await request("/ledger")).data;
const stone = (state, id) => {
  const found = state.stones.find((item) => item.id === id);
  assert.ok(found, `Stone ${id} is missing from the ledger`);
  return found;
};

await check("health and MySQL connectivity", async () => {
  assert.equal((await request("/health")).payload.status, "ok");
  assert.equal((await request("/health/database")).payload.database, "mysql");
});

await check("protected routes reject anonymous access", async () => {
  await request("/ledger", { expected: 401 });
});

await check("authentication and session persistence", async () => {
  await request("/auth/login", {
    method: "POST",
    expected: 401,
    body: { username, password: "incorrect-password" },
  });
  const login = await request("/auth/login", {
    method: "POST",
    body: { username, password },
  });
  cookie = login.response.headers.get("set-cookie")?.split(";")[0] ?? "";
  assert.ok(cookie.startsWith("origin_session="));
  assert.equal((await request("/auth/session")).data.role, "ADMIN");
});

let state = await ledger();
const seededSeller = state.sellers[0];
const cuttingWorkshop = state.workshops.find((item) =>
  ["CUTTING", "BOTH", "ALL"].includes(item.type),
);
const treatmentWorkshop = state.workshops.find((item) =>
  ["TREATMENT", "BOTH", "ALL"].includes(item.type),
);
const jewelleryWorkshop = state.workshops.find((item) =>
  ["JEWELLERY", "ALL"].includes(item.type),
);
const cuttingProvider = state.providers.find(
  (item) =>
    item.workshopId === cuttingWorkshop?.id &&
    ["CUTTING", "BOTH"].includes(item.specialty),
);
const treatmentProvider = state.providers.find(
  (item) =>
    item.workshopId === treatmentWorkshop?.id &&
    ["TREATMENT", "BOTH"].includes(item.specialty),
);
assert.ok(seededSeller && cuttingWorkshop && treatmentWorkshop && jewelleryWorkshop);
assert.ok(cuttingProvider && treatmentProvider);

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const acquiredOn = "2026-10-06";
const baseStone = (gemType, origin, weight, purchaseCost) => ({
  gemType,
  origin,
  weight,
  color: "Audit blue",
  shape: "Oval",
  cutStyle: "Brilliant",
  purchaseCost,
  treatmentDisclosure: "Not assessed",
  certificateReference: "AUDIT-CERT",
  sellerId: seededSeller.id,
  locationName: "Audit vault",
  acquiredOn,
  notes: "Automated isolated workflow audit",
});

let primaryId;
await check("single-stone intake with permanent identity and image", async () => {
  const result = await request("/stones", {
    method: "POST",
    expected: 201,
    body: {
      ...baseStone("Audit Sapphire", "Audit Ratnapura", 4.5, 400000),
      images: [{ dataUrl: tinyPng, captured: false }],
    },
  });
  primaryId = result.data.id;
  state = await ledger();
  const created = stone(state, primaryId);
  assert.match(created.productId, /^PRD-[A-Z0-9]{12}$/);
  assert.ok(created.qrToken);
  assert.equal(created.images.length, 1);
  assert.equal(created.status, "Available");
});

let batchIds;
await check("transactional multiple-stone intake", async () => {
  const result = await request("/stones/batch", {
    method: "POST",
    expected: 201,
    body: {
      stones: [
        baseStone("Audit Ruby", "Audit Elahera", 2.2, 220000),
        baseStone("Audit Spinel", "Audit Balangoda", 1.8, 180000),
        baseStone("Audit Zircon", "Audit Matale", 3.1, 150000),
      ],
    },
  });
  batchIds = result.data.ids;
  assert.equal(result.data.count, 3);
  assert.equal(new Set(batchIds).size, 3);
  state = await ledger();
  assert.ok(batchIds.every((id) => state.stones.some((item) => item.id === id)));
  const before = state.stones.length;
  await request("/stones/batch", {
    method: "POST",
    expected: 422,
    body: {
      stones: [
        baseStone("Rollback Test", "Audit location", 1, 10),
        { ...baseStone("Invalid Test", "Audit location", 1, 10), weight: 0 },
      ],
    },
  });
  assert.equal((await ledger()).stones.length, before);
});

await check("stone editing and optimistic version protection", async () => {
  state = await ledger();
  const current = stone(state, primaryId);
  await request(`/stones/${primaryId}`, {
    method: "PATCH",
    body: {
      ...baseStone("Audit Blue Sapphire", "Audit Ratnapura", 4.5, 410000),
      expectedVersion: current.version,
    },
  });
  await request(`/stones/${primaryId}`, {
    method: "PATCH",
    expected: 409,
    body: {
      ...baseStone("Stale write", "Audit Ratnapura", 4.5, 1),
      expectedVersion: current.version,
    },
  });
  assert.equal(stone(await ledger(), primaryId).purchase, 410000);
});

await check("hold, release, quality, custody and stocktake operations", async () => {
  let current = stone(await ledger(), batchIds[0]);
  await command("hold", current.id, {
    expectedVersion: current.version,
    reason: "Audit inspection",
  });
  current = stone(await ledger(), current.id);
  assert.equal(current.status, "On Hold");
  await command("clear-hold", current.id, {
    expectedVersion: current.version,
    reason: "Inspection passed",
  });
  current = stone(await ledger(), current.id);
  await command("quality", current.id, {
    expectedVersion: current.version,
    outcome: "No treatment detected",
    report: "AUDIT-LAB-001",
    notes: "Verified under audit",
  });
  current = stone(await ledger(), current.id);
  assert.equal(current.treatment, "No treatment detected");
  await command("custody", current.id, {
    expectedVersion: current.version,
    location: "Audit showroom",
    custodian: "Audit Custodian",
  });
  current = stone(await ledger(), current.id);
  assert.equal(current.location, "Audit showroom");
  assert.equal(current.custodian, "Audit Custodian");
  await command("stocktake", current.id, {
    expectedVersion: current.version,
    reason: "Physical identity confirmed",
  });
});

await check("cutting job issue, dispatch and weighted return", async () => {
  let current = stone(await ledger(), primaryId);
  await command("job", current.id, {
    expectedVersion: current.version,
    kind: "Cutting",
    workshopId: cuttingWorkshop.id,
    providerId: cuttingProvider.id,
    handoverDate: acquiredOn,
    due: "2026-10-10",
    cost: 25000,
    notes: "Audit oval recut",
  });
  current = stone(await ledger(), current.id);
  assert.equal(current.status, "In Cutting");
  await command("dispatch", current.id, {
    expectedVersion: current.version,
    handover: "Provider acknowledged receipt",
  });
  await command("return", current.id, {
    expectedVersion: current.version,
    weight: 4.1,
    cost: 27000,
    location: "Audit returns vault",
    notes: "Cut returned",
  });
  current = stone(await ledger(), current.id);
  assert.equal(current.status, "Available");
  assert.equal(current.weight, 4.1);
  assert.equal(current.location, "Audit returns vault");
});

await check("treatment job issue, dispatch, disclosure and return cost", async () => {
  let current = stone(await ledger(), primaryId);
  await command("job", current.id, {
    expectedVersion: current.version,
    kind: "Treatment",
    workshopId: treatmentWorkshop.id,
    providerId: treatmentProvider.id,
    handoverDate: acquiredOn,
    due: "2026-10-12",
    cost: 30000,
    notes: "Audit heat treatment",
  });
  current = stone(await ledger(), current.id);
  assert.equal(current.status, "In Treatment");
  await command("dispatch", current.id, {
    expectedVersion: current.version,
    handover: "Laboratory receipt signed",
  });
  await command("return", current.id, {
    expectedVersion: current.version,
    weight: 4.0,
    cost: 32000,
    treatment: "Heated · disclosed",
    notes: "Treatment completed",
  });
  current = stone(await ledger(), current.id);
  assert.equal(current.treatment, "Heated · disclosed");
  assert.equal(current.weight, 4);
});

let jewelleryId;
await check("jewellery handover, receipt, profile editing and images", async () => {
  let current = stone(await ledger(), batchIds[1]);
  await command("jewellery-handover", current.id, {
    expectedVersion: current.version,
    workshopId: jewelleryWorkshop.id,
    handedOverAt: "2026-10-06T10:00",
    deadline: "2026-10-20",
    notes: "Create audit ring",
  });
  current = stone(await ledger(), current.id);
  assert.equal(current.status, "In Jewellery");
  await command("jewellery-receive", current.id, {
    expectedVersion: current.version,
    itemType: "Ring",
    metalType: "Gold",
    metalPurity: "18K",
    metalWeight: 5.5,
    totalWeight: 5.86,
    settingStyle: "Halo",
    itemSize: "US 7",
    description: "Audit finished ring",
    receiveNotes: "Received in good condition",
  });
  state = await ledger();
  current = stone(state, current.id);
  assert.equal(current.status, "Jewellery");
  const profile = state.jewelleryProfiles.find((item) => item.stoneId === current.id);
  assert.ok(profile);
  jewelleryId = profile.id;
  await command("jewellery-edit", current.id, {
    expectedVersion: current.version,
    itemType: "Statement Ring",
    metalType: "Rose Gold",
    metalPurity: "18K",
    metalWeight: 5.6,
    totalWeight: 5.96,
    settingStyle: "Halo",
    itemSize: "US 7",
    description: "Updated audit ring",
  });
  await request(`/jewellery/${jewelleryId}/images`, {
    method: "POST",
    expected: 201,
    body: { images: [{ dataUrl: tinyPng, captured: true }] },
  });
  state = await ledger();
  const updated = state.jewelleryProfiles.find((item) => item.id === jewelleryId);
  assert.equal(updated.itemType, "Statement Ring");
  assert.equal(updated.images.length, 1);
});

await check("promotion handover and return", async () => {
  let current = stone(await ledger(), batchIds[1]);
  const company = (await ledger()).companies[0];
  await command("promotion-handover", current.id, {
    expectedVersion: current.version,
    companyId: company.id,
    handedOverAt: "2026-10-06T12:00",
    deadline: "2026-10-09",
    notes: "Audit campaign",
  });
  let latest = await ledger();
  assert.ok(
    latest.promotionHandovers.some(
      (item) => item.stoneId === current.id && item.status === "With company",
    ),
  );
  await request("/commands", {
    method: "POST",
    expected: 409,
    body: {
      operation: "jewellery-handover",
      stoneId: current.id,
      data: {
        expectedVersion: stone(latest, current.id).version,
        workshopId: jewelleryWorkshop.id,
        handedOverAt: "2026-10-06T12:30",
        deadline: "2026-10-20",
      },
    },
  });
  await command("promotion-return", current.id, {
    expectedVersion: stone(latest, current.id).version,
    returnNotes: "Returned before deadline",
  });
  latest = await ledger();
  assert.ok(
    latest.promotionHandovers.some(
      (item) => item.stoneId === current.id && item.status === "Returned",
    ),
  );
});

await check("salesman handover, unsold return and lower-price sale", async () => {
  const salesman = (await ledger()).salesmen[0];
  let current = stone(await ledger(), batchIds[0]);
  await command("sales-handover", current.id, {
    expectedVersion: current.version,
    salesman: salesman.name,
    price: 600000,
    handedOverAt: "2026-10-06T13:00",
    deadline: "2026-10-11",
  });
  current = stone(await ledger(), current.id);
  assert.equal(current.status, "With Salesman");
  await command("sales-return", current.id, {
    expectedVersion: current.version,
    notes: "Customer declined",
  });
  current = stone(await ledger(), current.id);
  assert.equal(current.status, "Available");
  await command("sales-handover", current.id, {
    expectedVersion: current.version,
    salesman: salesman.name,
    price: 600000,
    handedOverAt: "2026-10-06T15:00",
    deadline: "2026-10-13",
  });
  current = stone(await ledger(), current.id);
  await command("sales-complete", current.id, {
    expectedVersion: current.version,
    finalPrice: 570000,
  });
  state = await ledger();
  current = stone(state, current.id);
  assert.equal(current.status, "Sold");
  const completed = state.salesmanHandovers.find(
    (item) => item.stoneId === current.id && item.status === "Sold",
  );
  assert.equal(completed.finalPrice, 570000);
  assert.equal(completed.quotedPrice, 600000);
});

await check("direct sale with persisted buyer details", async () => {
  let current = stone(await ledger(), batchIds[2]);
  await command("direct-sale", current.id, {
    expectedVersion: current.version,
    buyerName: "Audit Direct Buyer",
    buyerPhone: "+94 77 000 0099",
    buyerEmail: "audit-buyer@example.com",
    buyerLocality: "Colombo",
    finalPrice: 390000,
    soldAt: "2026-10-06T16:00",
    notes: "Audit direct sale",
  });
  state = await ledger();
  current = stone(state, current.id);
  assert.equal(current.status, "Sold");
  const sale = state.directSales.find((item) => item.stoneId === current.id);
  assert.equal(sale.buyer, "Audit Direct Buyer");
  assert.equal(sale.buyerEmail, "audit-buyer@example.com");
  assert.equal(sale.finalPrice, 390000);
});

await check("legacy invoice, partial payment and outstanding balance", async () => {
  let current = stone(await ledger(), primaryId);
  await command("sale", current.id, {
    expectedVersion: current.version,
    buyer: "Audit Invoice Buyer",
    price: 900000,
    payment: 300000,
  });
  current = stone(await ledger(), current.id);
  assert.equal(current.status, "Sold");
  await command("payment", current.id, {
    expectedVersion: current.version,
    amount: 250000,
    method: "BANK TRANSFER",
    reference: "AUDIT-PAY-001",
  });
  state = await ledger();
  const sale = state.sales.find((item) => item.stoneId === current.id && item.status === "Sold");
  assert.equal(sale.price, 900000);
  assert.equal(sale.paid, 550000);
  assert.equal(sale.price - sale.paid, 350000);
  await request("/commands", {
    method: "POST",
    expected: 422,
    body: {
      operation: "payment",
      stoneId: current.id,
      data: {
        expectedVersion: current.version,
        amount: 350001,
        method: "CASH",
      },
    },
  });
});

await check("invalid state transitions are rejected by the server", async () => {
  const soldStone = stone(await ledger(), batchIds[2]);
  await request("/commands", {
    method: "POST",
    expected: 409,
    body: {
      operation: "job",
      stoneId: soldStone.id,
      data: {
        expectedVersion: soldStone.version,
        kind: "Cutting",
        workshopId: cuttingWorkshop.id,
        providerId: cuttingProvider.id,
        handoverDate: acquiredOn,
        due: "2026-10-20",
        cost: 1,
      },
    },
  });
});

await check("finance totals reconcile to sale and workshop records", async () => {
  state = await ledger();
  const completedSales = [
    ...state.salesmanHandovers
      .filter((item) => item.status === "Sold")
      .map((item) => ({ stoneId: item.stoneId, value: item.finalPrice })),
    ...state.directSales.map((item) => ({
      stoneId: item.stoneId,
      value: item.finalPrice,
    })),
  ];
  const revenue = completedSales.reduce((total, item) => total + item.value, 0);
  const cost = completedSales.reduce((total, item) => {
    const soldStone = stone(state, item.stoneId);
    const jobCost = state.jobs
      .filter((job) => job.stoneId === item.stoneId && job.status === "Returned")
      .reduce((sum, job) => sum + job.cost, 0);
    return total + soldStone.purchase + jobCost;
  }, 0);
  assert.ok(Number.isFinite(revenue) && revenue > 0);
  assert.ok(Number.isFinite(cost) && cost >= 0);
  assert.equal(revenue - cost, 590000);
  const invoice = state.sales.find((item) => item.stoneId === primaryId && item.status === "Sold");
  assert.equal(invoice.price - invoice.paid, 350000);
});

await check("complete lifecycle traceability", async () => {
  state = await ledger();
  const primaryEvents = state.events.filter((item) => item.stoneId === primaryId);
  for (const category of [
    "INTAKE",
    "RECORD_UPDATE",
    "JOB",
    "DISPATCH",
    "RETURN",
    "SALE",
    "PAYMENT",
  ]) {
    assert.ok(
      primaryEvents.some((item) => item.category === category),
      `Missing ${category} lifecycle event`,
    );
  }
  const jewelleryEvents = state.events.filter((item) => item.stoneId === batchIds[1]);
  for (const category of [
    "JEWELLERY_HANDOVER",
    "JEWELLERY_RECEIVE",
    "JEWELLERY_EDIT",
    "JEWELLERY_IMAGE_UPLOAD",
    "PROMOTION_HANDOVER",
    "PROMOTION_RETURN",
  ]) {
    assert.ok(
      jewelleryEvents.some((item) => item.category === category),
      `Missing ${category} lifecycle event`,
    );
  }
});

await check("logout invalidates the session", async () => {
  await request("/auth/logout", { method: "POST", expected: 204 });
  await request("/auth/session", { expected: 401 });
});

console.log(`\n${checks.length} workflow groups passed.`);

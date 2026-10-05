import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { pool, transaction } from "./pool.js";

type ContactRole = "BUYER" | "SELLER" | "CUTTER" | "LABORATORY" | "STAFF";
type LocationType = "VAULT" | "DISPLAY" | "WORKSHOP" | "LABORATORY" | "BUYER";

async function contact(
  connection: PoolConnection,
  name: string,
  role: ContactRole,
  phone: string,
  locality: string,
) {
  const [existing] = await connection.query<RowDataPacket[]>(
    "SELECT id FROM contacts WHERE display_name = ? AND role = ? LIMIT 1",
    [name, role],
  );
  if (existing[0]) return Number(existing[0].id);

  const [result] = await connection.execute<ResultSetHeader>(
    "INSERT INTO contacts (display_name, role, phone, locality) VALUES (?, ?, ?, ?)",
    [name, role, phone, locality],
  );
  return result.insertId;
}

async function location(
  connection: PoolConnection,
  name: string,
  type: LocationType,
  external = false,
) {
  await connection.execute(
    `INSERT INTO locations (name, location_type, is_external)
     VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [name, type, external],
  );
  const [rows] = await connection.query<RowDataPacket[]>(
    "SELECT id FROM locations WHERE name = ? LIMIT 1",
    [name],
  );
  return Number(rows[0]!.id);
}

async function workshop(
  connection: PoolConnection,
  name: string,
  type: "CUTTING" | "TREATMENT" | "BOTH",
  phone: string,
  address: string,
) {
  await connection.execute(
    `INSERT INTO workshops (name,workshop_type,phone,address) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE workshop_type=VALUES(workshop_type),phone=VALUES(phone),address=VALUES(address)`,
    [name, type, phone, address],
  );
  const [rows] = await connection.query<RowDataPacket[]>(
    "SELECT id FROM workshops WHERE name=? LIMIT 1",
    [name],
  );
  return Number(rows[0]!.id);
}

async function provider(
  connection: PoolConnection,
  workshopId: number,
  name: string,
  specialty: "CUTTING" | "TREATMENT" | "BOTH",
  phone: string,
) {
  await connection.execute(
    `INSERT INTO providers (workshop_id,display_name,specialty,phone) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE specialty=VALUES(specialty),phone=VALUES(phone)`,
    [workshopId, name, specialty, phone],
  );
  const [rows] = await connection.query<RowDataPacket[]>(
    "SELECT id FROM providers WHERE workshop_id=? AND display_name=? LIMIT 1",
    [workshopId, name],
  );
  return Number(rows[0]!.id);
}

async function seller(
  connection: PoolConnection,
  name: string,
  phone: string,
  locality: string,
) {
  await connection.execute(
    `INSERT INTO sellers (name,phone,locality) VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE phone=VALUES(phone),locality=VALUES(locality)`,
    [name, phone, locality],
  );
  const [rows] = await connection.query<RowDataPacket[]>(
    "SELECT id FROM sellers WHERE name=? LIMIT 1",
    [name],
  );
  return Number(rows[0]!.id);
}

async function salesman(
  connection: PoolConnection,
  name: string,
  phone: string,
  locality: string,
) {
  await connection.execute(
    `INSERT INTO salesmen (name,phone,locality) VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE phone=VALUES(phone),locality=VALUES(locality)`,
    [name, phone, locality],
  );
  const [rows] = await connection.query<RowDataPacket[]>(
    "SELECT id FROM salesmen WHERE name=? LIMIT 1",
    [name],
  );
  return Number(rows[0]!.id);
}

async function event(
  connection: PoolConnection,
  stoneId: string,
  type: string,
  title: string,
  detail: string,
  actorId: number,
  occurredAt: string,
) {
  await connection.execute(
    `INSERT INTO lifecycle_events
       (stone_id, event_type, title, details, actor_contact_id, occurred_at)
     SELECT ?, ?, ?, ?, ?, ?
     WHERE NOT EXISTS (
       SELECT 1 FROM lifecycle_events
       WHERE stone_id = ? AND event_type = ? AND title = ? AND occurred_at = ?
     )`,
    [
      stoneId,
      type,
      title,
      JSON.stringify({ detail }),
      actorId,
      occurredAt,
      stoneId,
      type,
      title,
      occurredAt,
    ],
  );
}

await transaction(async (connection) => {
  const staff = await contact(
    connection,
    "Kasun Jayasinghe",
    "STAFF",
    "+94 77 410 2288",
    "Colombo",
  );
  await contact(
    connection,
    "Nimal Gems",
    "SELLER",
    "+94 77 234 1188",
    "Ratnapura",
  );
  await contact(
    connection,
    "Sabaragamuwa Gem Traders",
    "SELLER",
    "+94 71 556 9032",
    "Pelmadulla",
  );
  await contact(
    connection,
    "Serendib Stones",
    "SELLER",
    "+94 76 882 1440",
    "Beruwala",
  );
  const cutter = await contact(
    connection,
    "Royal Gem Cutting House",
    "CUTTER",
    "+94 11 268 4412",
    "Colombo 04",
  );
  const laboratory = await contact(
    connection,
    "Lanka Gem Laboratory",
    "LABORATORY",
    "+94 11 257 9060",
    "Colombo 03",
  );
  const aanya = await contact(
    connection,
    "Aanya Perera",
    "BUYER",
    "+94 77 612 3098",
    "Colombo 07",
  );
  const blueCrown = await contact(
    connection,
    "Blue Crown Jewellery",
    "BUYER",
    "+94 11 291 7740",
    "Kandy",
  );
  const ishara = await contact(
    connection,
    "Ishara Fernando",
    "BUYER",
    "+94 71 309 5517",
    "Galle",
  );
  const nimalSeller = await seller(
    connection,
    "Nimal Gems",
    "+94 77 234 1188",
    "Ratnapura",
  );
  const sabaragamuwaSeller = await seller(
    connection,
    "Sabaragamuwa Gem Traders",
    "+94 71 556 9032",
    "Pelmadulla",
  );
  const serendibSeller = await seller(
    connection,
    "Serendib Stones",
    "+94 76 882 1440",
    "Beruwala",
  );
  const kasunSalesman = await salesman(
    connection,
    "Kasun Perera",
    "+94 77 412 8890",
    "Colombo",
  );
  await salesman(connection, "Mohamed Rizwan", "+94 76 330 1477", "Beruwala");
  await salesman(connection, "Tharindu Jayasekara", "+94 71 902 6631", "Kandy");

  const royalWorkshop = await workshop(
    connection,
    "Royal Gem Cutting House",
    "CUTTING",
    "+94 11 268 4412",
    "Colombo 04",
  );
  const lankaLab = await workshop(
    connection,
    "Lanka Gem Laboratory",
    "TREATMENT",
    "+94 11 257 9060",
    "Colombo 03",
  );
  const ceylonWorkshop = await workshop(
    connection,
    "Ceylon Precision Lapidary",
    "BOTH",
    "+94 77 401 8832",
    "Ratnapura",
  );
  const dilan = await provider(
    connection,
    royalWorkshop,
    "Dilan Perera",
    "CUTTING",
    "+94 77 611 2084",
  );
  await provider(
    connection,
    royalWorkshop,
    "Malith Silva",
    "CUTTING",
    "+94 71 842 0196",
  );
  const shenali = await provider(
    connection,
    lankaLab,
    "Dr. Shenali Jayawardena",
    "TREATMENT",
    "+94 76 530 7712",
  );
  await provider(
    connection,
    ceylonWorkshop,
    "Chamod Rathnayake",
    "BOTH",
    "+94 75 203 9918",
  );

  await location(connection, "Main Vault · Intake", "VAULT");
  const trayA = await location(connection, "Main Vault · Tray A", "VAULT");
  const trayB = await location(connection, "Main Vault · Tray B", "VAULT");
  const showroom = await location(
    connection,
    "Showroom · Colombo 03",
    "DISPLAY",
  );
  const cuttingHouse = await location(
    connection,
    "Royal Gem Cutting House",
    "WORKSHOP",
    true,
  );
  const lab = await location(
    connection,
    "Lanka Gem Laboratory",
    "LABORATORY",
    true,
  );
  const clientCustody = await location(
    connection,
    "Client custody",
    "BUYER",
    true,
  );

  const stones = [
    [
      "GEM-SAP-26-0001",
      "Blue Sapphire",
      "Ratnapura",
      3.42,
      3.42,
      "Royal blue",
      "Oval",
      980000,
      "AVAILABLE",
      trayA,
      staff,
      "No treatment declared",
      "GIA-LK-261842",
      nimalSeller,
      "2026-09-12",
      "Well-saturated centre with strong face-up colour.",
    ],
    [
      "GEM-RUB-26-0001",
      "Ruby",
      "Niwitigala",
      2.18,
      2.18,
      "Vivid red",
      "Rough",
      640000,
      "IN_CUTTING",
      cuttingHouse,
      cutter,
      "No treatment declared",
      "None",
      sabaragamuwaSeller,
      "2026-09-16",
      "Priority oval yield assessment requested.",
    ],
    [
      "GEM-SPI-26-0001",
      "Pink Spinel",
      "Balangoda",
      1.76,
      1.76,
      "Hot pink",
      "Cushion",
      310000,
      "RESERVED",
      showroom,
      staff,
      "No treatment declared",
      "LGL-26-0907",
      serendibSeller,
      "2026-09-18",
      "Reserved after showroom viewing.",
    ],
    [
      "GEM-SAP-26-0002",
      "Yellow Sapphire",
      "Elahera",
      4.05,
      4.05,
      "Golden yellow",
      "Cushion",
      720000,
      "SOLD",
      clientCustody,
      blueCrown,
      "Heated · dealer disclosed",
      "LGL-26-0821",
      nimalSeller,
      "2026-08-21",
      "Completed wholesale sale with disclosure supplied.",
    ],
    [
      "GEM-CHR-26-0001",
      "Chrysoberyl",
      "Rakwana",
      2.66,
      2.66,
      "Greenish yellow",
      "Oval",
      420000,
      "IN_TREATMENT",
      lab,
      laboratory,
      "Treatment assessment in progress",
      "None",
      sabaragamuwaSeller,
      "2026-09-22",
      "Submitted for treatment verification and report.",
    ],
    [
      "GEM-SAP-26-0003",
      "Blue Sapphire",
      "Pelmadulla",
      5.12,
      5.12,
      "Cornflower blue",
      "Emerald",
      1450000,
      "ON_HOLD",
      trayB,
      staff,
      "Heated · dealer disclosed",
      "LGL-26-0915",
      nimalSeller,
      "2026-09-24",
      "Held while certificate weight discrepancy is reviewed.",
    ],
    [
      "GEM-RUB-26-0002",
      "Ruby",
      "Ratnapura",
      1.34,
      1.34,
      "Pigeon blood red",
      "Round",
      485000,
      "AVAILABLE",
      trayA,
      staff,
      "Not assessed",
      "None",
      serendibSeller,
      "2026-09-27",
      "Strong fluorescence; laboratory assessment recommended.",
    ],
    [
      "GEM-SPI-26-0002",
      "Pink Spinel",
      "Okkampitiya",
      3.08,
      3.45,
      "Rose pink",
      "Oval",
      530000,
      "AVAILABLE",
      showroom,
      staff,
      "No treatment declared",
      "LGL-26-0924",
      sabaragamuwaSeller,
      "2026-09-20",
      "Returned from cutting with excellent symmetry.",
    ],
    [
      "GEM-SAP-26-0004",
      "Blue Sapphire",
      "Kahawatta",
      6.24,
      6.24,
      "Deep blue",
      "Cushion",
      1900000,
      "SOLD",
      clientCustody,
      ishara,
      "Heated · dealer disclosed",
      "GIA-LK-261903",
      nimalSeller,
      "2026-08-29",
      "Private client sale; final balance remains due.",
    ],
  ] as const;

  for (const stone of stones) {
    await connection.execute(
      `INSERT INTO stones
       (id, product_id, qr_token, gem_type, origin, current_weight, intake_weight, color, shape,
        purchase_cost, status, location_id, custodian_contact_id,
        treatment_disclosure, certificate_reference, seller_id, acquired_on, notes)
       VALUES (?, CONCAT('PRD-', UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 12))), UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, 'None'), ?, ?, ?)
       ON DUPLICATE KEY UPDATE seller_id = VALUES(seller_id)`,
      [...stone],
    );
  }

  await connection.execute(
    `INSERT INTO salesman_handovers
     (id,stone_id,salesman_id,status,quoted_price,handed_over_at,deadline_on)
     VALUES ('TRY-2026-001','GEM-RUB-26-0002',?,'WITH_SALESMAN',980000,'2026-10-04 15:30:00','2026-10-10')
     ON DUPLICATE KEY UPDATE salesman_id=VALUES(salesman_id)`,
    [kasunSalesman],
  );
  await connection.execute(
    "UPDATE stones SET status='RESERVED' WHERE id='GEM-RUB-26-0002' AND status='AVAILABLE'",
  );

  await connection.execute(
    `INSERT INTO workshop_jobs
     (id, stone_id, job_type, workshop_id, provider_id, provider_contact_id, status, handover_on, due_on, outgoing_weight,
      estimated_cost, instructions, dispatched_at)
     VALUES ('CUT-2026-001', 'GEM-RUB-26-0001', 'CUTTING', ?, ?, ?, 'WITH_PROVIDER', '2026-10-01', '2026-10-08', 2.180, 95000, 'Target an oval cut while preserving colour concentration.', '2026-10-01 10:20:00')
     ON DUPLICATE KEY UPDATE workshop_id=VALUES(workshop_id),provider_id=VALUES(provider_id),handover_on=VALUES(handover_on)`,
    [royalWorkshop, dilan, cutter],
  );
  await connection.execute(
    `INSERT INTO workshop_jobs
     (id, stone_id, job_type, workshop_id, provider_id, provider_contact_id, status, handover_on, due_on, outgoing_weight,
      estimated_cost, instructions, dispatched_at)
     VALUES ('TRT-2026-001', 'GEM-CHR-26-0001', 'TREATMENT', ?, ?, ?, 'WITH_PROVIDER', '2026-10-02', '2026-10-06', 2.660, 48000, 'Verify treatment status and issue a concise laboratory finding.', '2026-10-02 14:10:00')
     ON DUPLICATE KEY UPDATE workshop_id=VALUES(workshop_id),provider_id=VALUES(provider_id),handover_on=VALUES(handover_on)`,
    [lankaLab, shenali, laboratory],
  );
  await connection.execute(
    `INSERT INTO workshop_jobs
     (id, stone_id, job_type, workshop_id, provider_id, provider_contact_id, status, handover_on, due_on, outgoing_weight,
      returned_weight, estimated_cost, final_cost, instructions, return_notes,
      dispatched_at, returned_at)
     VALUES ('CUT-2026-002', 'GEM-SPI-26-0002', 'CUTTING', ?, ?, ?, 'RETURNED', '2026-09-25', '2026-09-29', 3.450,
      3.080, 82000, 79000, 'Produce a bright oval with balanced shoulders.',
      'Finished weight accepted; polish and symmetry checked.', '2026-09-25 09:30:00', '2026-09-29 16:45:00')
     ON DUPLICATE KEY UPDATE workshop_id=VALUES(workshop_id),provider_id=VALUES(provider_id),handover_on=VALUES(handover_on)`,
    [royalWorkshop, dilan, cutter],
  );

  await connection.execute(
    `DELETE p FROM providers p
     JOIN workshops w ON w.id=p.workshop_id AND w.name=p.display_name
     JOIN providers named ON named.workshop_id=p.workshop_id AND named.id<>p.id
     LEFT JOIN workshop_jobs j ON j.provider_id=p.id
     WHERE j.id IS NULL`,
  );

  await connection.execute(
    `INSERT INTO sales
     (id, stone_id, buyer_contact_id, status, agreed_price, disclosure_snapshot, reserved_at)
     VALUES ('RES-2026-001', 'GEM-SPI-26-0001', ?, 'RESERVED', 760000,
      'Natural pink spinel; no treatment declared; LGL-26-0907.', '2026-10-02 11:15:00')
     ON DUPLICATE KEY UPDATE id = VALUES(id)`,
    [aanya],
  );
  await connection.execute(
    `INSERT INTO sales
     (id, stone_id, buyer_contact_id, status, agreed_price, disclosure_snapshot, sold_at)
     VALUES ('INV-2026-001', 'GEM-SAP-26-0002', ?, 'SOLD', 1550000,
      'Yellow sapphire; heated as disclosed; report LGL-26-0821.', '2026-09-10 15:30:00')
     ON DUPLICATE KEY UPDATE id = VALUES(id)`,
    [blueCrown],
  );
  await connection.execute(
    `INSERT INTO sales
     (id, stone_id, buyer_contact_id, status, agreed_price, disclosure_snapshot, sold_at)
     VALUES ('INV-2026-002', 'GEM-SAP-26-0004', ?, 'SOLD', 3950000,
      'Blue sapphire; heated as disclosed; report GIA-LK-261903.', '2026-09-28 12:05:00')
     ON DUPLICATE KEY UPDATE id = VALUES(id)`,
    [ishara],
  );

  const payments = [
    [
      "RES-2026-001",
      150000,
      "BANK_TRANSFER",
      "DEP-RES-26001",
      "2026-10-02 11:20:00",
    ],
    [
      "INV-2026-001",
      1000000,
      "BANK_TRANSFER",
      "BCT-260910-01",
      "2026-09-10 15:35:00",
    ],
    [
      "INV-2026-001",
      550000,
      "BANK_TRANSFER",
      "BCT-260912-02",
      "2026-09-12 10:05:00",
    ],
    [
      "INV-2026-002",
      2500000,
      "BANK_TRANSFER",
      "IPF-260928-01",
      "2026-09-28 12:10:00",
    ],
  ] as const;
  for (const payment of payments) {
    await connection.execute(
      `INSERT INTO payments (sale_id, amount, method, reference, received_at)
       SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM payments WHERE reference = ?)`,
      [...payment, payment[3]],
    );
  }

  const events = [
    [
      "GEM-SAP-26-0001",
      "INTAKE",
      "Stone received",
      "Received from Nimal Gems at 3.42 ct.",
      "2026-09-12 09:15:00",
    ],
    [
      "GEM-SAP-26-0001",
      "QUALITY",
      "Laboratory report attached",
      "GIA-LK-261842 recorded; no treatment declared.",
      "2026-09-17 13:40:00",
    ],
    [
      "GEM-RUB-26-0001",
      "INTAKE",
      "Stone received",
      "Received from Sabaragamuwa Gem Traders at 2.18 ct.",
      "2026-09-16 10:00:00",
    ],
    [
      "GEM-RUB-26-0001",
      "CUTTING",
      "Cutting job dispatched",
      "CUT-2026-001 handed to Royal Gem Cutting House; due 8 October.",
      "2026-10-01 10:20:00",
    ],
    [
      "GEM-SPI-26-0001",
      "INTAKE",
      "Stone received",
      "Received from Serendib Stones at 1.76 ct.",
      "2026-09-18 14:25:00",
    ],
    [
      "GEM-SPI-26-0001",
      "SALE",
      "Stone reserved",
      "Reserved by Aanya Perera for LKR 760,000; LKR 150,000 deposit received.",
      "2026-10-02 11:15:00",
    ],
    [
      "GEM-SAP-26-0002",
      "SALE",
      "Sale completed",
      "Sold to Blue Crown Jewellery for LKR 1,550,000; paid in full.",
      "2026-09-10 15:30:00",
    ],
    [
      "GEM-CHR-26-0001",
      "TREATMENT",
      "Laboratory assessment dispatched",
      "Sent to Lanka Gem Laboratory for treatment verification; due 6 October.",
      "2026-10-02 14:10:00",
    ],
    [
      "GEM-SAP-26-0003",
      "EXCEPTION",
      "Stone placed on hold",
      "Certificate lists 5.10 ct while internal weight is 5.12 ct; review required.",
      "2026-10-03 09:45:00",
    ],
    [
      "GEM-RUB-26-0002",
      "INTAKE",
      "Stone received",
      "Received from Serendib Stones at 1.34 ct; treatment not yet assessed.",
      "2026-09-27 12:30:00",
    ],
    [
      "GEM-SPI-26-0002",
      "CUTTING",
      "Cutting job returned",
      "Returned at 3.08 ct; LKR 79,000 final cutting cost recorded.",
      "2026-09-29 16:45:00",
    ],
    [
      "GEM-SPI-26-0002",
      "QUALITY",
      "Post-cut inspection completed",
      "Polish, symmetry and finished weight accepted.",
      "2026-09-30 10:10:00",
    ],
    [
      "GEM-SAP-26-0004",
      "SALE",
      "Sale completed",
      "Sold to Ishara Fernando for LKR 3,950,000; LKR 1,450,000 remains due.",
      "2026-09-28 12:05:00",
    ],
    [
      "GEM-SAP-26-0004",
      "PAYMENT",
      "Part payment received",
      "Bank transfer of LKR 2,500,000 recorded against INV-2026-002.",
      "2026-09-28 12:10:00",
    ],
    [
      "GEM-SAP-26-0003",
      "STOCKTAKE",
      "Stocktake discrepancy recorded",
      "Stone present in Tray B; weight variance remains under review.",
      "2026-10-03 10:05:00",
    ],
  ] as const;
  for (const [stoneId, type, title, detail, occurredAt] of events) {
    await event(connection, stoneId, type, title, detail, staff, occurredAt);
  }

  for (const [code, lastNumber] of [
    ["SAP", 4],
    ["RUB", 2],
    ["SPI", 2],
    ["CHR", 1],
  ] as const) {
    await connection.execute(
      `INSERT INTO stone_sequences (year_number, gem_code, last_number)
       VALUES (2026, ?, ?) ON DUPLICATE KEY UPDATE last_number = GREATEST(last_number, VALUES(last_number))`,
      [code, lastNumber],
    );
  }
});

const [[counts]] = await pool.query<RowDataPacket[]>(
  `SELECT
    (SELECT COUNT(*) FROM stones) AS stones,
    (SELECT COUNT(*) FROM workshop_jobs) AS jobs,
    (SELECT COUNT(*) FROM sales) AS sales,
    (SELECT COUNT(*) FROM payments) AS payments,
    (SELECT COUNT(*) FROM lifecycle_events) AS events,
    (SELECT COUNT(*) FROM contacts) AS contacts`,
);

console.log("Client review data is ready:", counts);
await pool.end();

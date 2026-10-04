"use client";

import Image from "next/image";
import { useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  ClipboardCheck,
  Download,
  Gem,
  History,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Truck,
  Trash2,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  emptyLedger,
  money,
  today,
  type Event,
  type Ledger,
  type Stone,
} from "./demo-data";
import { api } from "./api";

type Page =
  | "dashboard"
  | "inventory"
  | "stone"
  | "intake"
  | "workshop"
  | "custody"
  | "stocktake"
  | "quality"
  | "sales"
  | "reports"
  | "contacts";
type Operation =
  | "job"
  | "dispatch"
  | "return"
  | "custody"
  | "quality"
  | "reserve"
  | "release"
  | "sale"
  | "payment"
  | "hold"
  | "clear-hold"
  | "price"
  | "sales-handover"
  | "sales-return"
  | "sales-complete";
type PhotoDraft = {
  id?: number;
  dataUrl: string;
  captured: boolean;
};
const nav = [
  ["dashboard", "Command centre", LayoutDashboard],
  ["inventory", "Stone register", Gem],
  ["intake", "New intake", Plus],
  ["workshop", "Cutting & treatment", WandSparkles],
  ["custody", "Custody & locations", Truck],
  ["stocktake", "Stocktake", ClipboardCheck],
  ["quality", "Quality & exceptions", ClipboardCheck],
  ["sales", "Salesman trials", ShoppingBag],
  ["reports", "Reports", TrendingUp],
  ["contacts", "Directory", Users],
] as const;

function Brand() {
  return (
    <div className="mark">
      <Gem size={21} strokeWidth={1.7} />
      <span>ORIGIN</span>
    </div>
  );
}
function Badge({ value }: { value: string }) {
  return (
    <span
      className={`status status-${value.toLowerCase().replaceAll(" ", "-")}`}
    >
      <i />
      {value}
    </span>
  );
}
function Login({
  enter,
  error,
}: {
  enter: (username: string, password: string) => Promise<void>;
  error: string;
}) {
  return (
    <main className="login-shell">
      <section className="login-story">
        <Brand />
        <div className="story-copy">
          <p className="eyebrow light">GEMSTONE OPERATIONS</p>
          <h1>
            Every stone.
            <br />
            <em>Every chapter.</em>
          </h1>
          <p>
            Trace custody, processes and commercial decisions from first receipt
            through final sale.
          </p>
        </div>
        <div className="story-stat">
          <ShieldCheck size={23} />
          <div>
            <strong>One permanent stone identity</strong>
            <span>Inspect every movement and event in a single record.</span>
          </div>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-mobile-brand">
          <Brand />
        </div>
        <div className="login-card">
          <p className="eyebrow">SECURE WORKSPACE</p>
          <h2>Welcome back</h2>
          <p className="muted">
            Sign in to the database-backed gemstone operations workspace.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void enter(txt(form.get("username")), txt(form.get("password")));
            }}
          >
            <label>
              Username
              <input name="username" autoComplete="username" required />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            {error && <div className="ops-form-error">{error}</div>}
            <button className="primary-button login-button">
              Sign in <ArrowRight size={18} />
            </button>
          </form>
          <p className="demo-note">
            Operational records are protected and stored in MySQL
          </p>
        </div>
        <p className="login-footer">Origin · Gemstone operations</p>
      </section>
    </main>
  );
}

function download(
  name: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function number(v: FormDataEntryValue | null) {
  return Number(v || 0);
}
function txt(v: FormDataEntryValue | null) {
  return String(v || "").trim();
}
export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false),
    [page, setPage] = useState<Page>("dashboard"),
    [ledger, setLedger] = useState<Ledger>(emptyLedger),
    [selected, setSelected] = useState(""),
    [operation, setOperation] = useState<Operation | null>(null),
    [target, setTarget] = useState(""),
    [notice, setNotice] = useState(""),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState(""),
    [counted, setCounted] = useState<string[]>([]),
    [editing, setEditing] = useState<string | null>(null);
  const stone =
    ledger.stones.find((s) => s.id === selected) || ledger.stones[0];
  const fail = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback;
    setNotice(message);
    toast.error(message);
  };
  const refresh = async () => {
    try {
      const data = await api.ledger();
      setLedger(data);
      setSelected((current) => current || data.stones[0]?.id || "");
    } catch (error) {
      fail(error, "Could not load the database");
    }
  };
  const navigate = (p: Page, id?: string) => {
    if (id) setSelected(id);
    setPage(p);
    setMenu(false);
    setSearch("");
    setEditing(null);
  };
  const edit = (id: string) => {
    setSelected(id);
    setEditing(id);
    setPage("intake");
    setMenu(false);
    setSearch("");
  };
  const open = (op: Operation, id?: string) => {
    const stoneId = id || stone?.id;
    if (!stoneId) {
      fail(
        new Error("Receive a stone before starting this operation."),
        "Operation unavailable",
      );
      return;
    }
    setTarget(stoneId);
    setNotice("");
    setOperation(op);
  };
  const flash = (message: string) => {
    setNotice("");
    toast.success(message);
  };
  const submitOperation = async (form: FormData) => {
    const op = operation;
    if (!op) return;
    const id = txt(form.get("stoneId")) || target;
    const s = ledger.stones.find((item) => item.id === id);
    if (!s) return;
    try {
      await api.command(op, id, {
        ...Object.fromEntries(form),
        expectedVersion: s.version,
      });
      setOperation(null);
      await refresh();
      flash("Operation saved to the database.");
    } catch (error) {
      fail(error, "Operation failed");
    }
  };
  const saveStone = async (
    form: FormData,
    photos: PhotoDraft[],
    removedImageIds: number[],
  ) => {
    const type = txt(form.get("type")),
      origin = txt(form.get("origin")),
      weight = number(form.get("weight")),
      purchase = number(form.get("purchase"));
    if (!type || !origin || weight <= 0 || purchase < 0) {
      fail(
        new Error("Gem type, origin and positive carat weight are required."),
        "Stone details are incomplete",
      );
      return;
    }
    try {
      const payload = {
        gemType: type,
        origin,
        weight,
        color: txt(form.get("color")),
        shape: txt(form.get("shape")),
        cutStyle: txt(form.get("cut")),
        purchaseCost: purchase,
        treatmentDisclosure: txt(form.get("treatment")) || "Not assessed",
        certificateReference: txt(form.get("certificate")) || null,
        sellerId: number(form.get("sellerId")) || null,
        sellerName: txt(form.get("newSellerName")) || null,
        sellerPhone: txt(form.get("newSellerPhone")) || null,
        sellerEmail: txt(form.get("newSellerEmail")) || null,
        sellerLocality: txt(form.get("newSellerLocality")) || null,
        locationName: txt(form.get("location")) || "Main vault · Intake",
        acquiredOn: txt(form.get("date")) || today(),
        notes: txt(form.get("notes")),
      };
      const current = editing
        ? ledger.stones.find((item) => item.id === editing)
        : undefined;
      const result = current
        ? await api.updateStone(current.id, {
            ...payload,
            expectedVersion: current.version,
          })
        : await api.intake(payload);
      for (const imageId of removedImageIds) {
        await api.deleteStoneImage(result.id, imageId);
      }
      const newImages = photos
        .filter((photo) => !photo.id)
        .map((photo) => ({
          dataUrl: photo.dataUrl,
          captured: photo.captured,
        }));
      if (newImages.length) await api.addStoneImages(result.id, newImages);
      await refresh();
      navigate("stone", result.id);
      flash(
        current
          ? `${result.id} updated and recorded in its lifecycle history.`
          : `${result.id} registered in MySQL.`,
      );
    } catch (error) {
      fail(error, "Intake failed");
    }
  };
  const stocktake = (id: string, missing: boolean) => {
    const current = ledger.stones.find((s) => s.id === id);
    void api
      .command(missing ? "hold" : "stocktake", id, {
        reason: "Stocktake discrepancy",
        expectedVersion: current?.version,
      })
      .then(async () => {
        if (!missing) setCounted([...counted, id]);
        await refresh();
        flash(
          missing
            ? `${id} marked as missing and placed on hold.`
            : `${id} verified in the stocktake.`,
        );
      })
      .catch((error) => fail(error, "Stocktake failed"));
  };
  if (!loggedIn)
    return (
      <Login
        error={notice}
        enter={async (username, password) => {
          try {
            await api.login(username, password);
            await refresh();
            setNotice("");
            setLoggedIn(true);
            toast.success("Welcome back. The workspace is ready.");
          } catch (error) {
            fail(error, "Sign in failed");
          }
        }}
      />
    );
  const signOut = async () => {
    try {
      await api.logout();
      setLedger(emptyLedger);
      setLoggedIn(false);
      toast.success("Signed out safely.");
    } catch (error) {
      fail(error, "Sign out failed");
    }
  };
  const actions = { navigate, open, edit, saveStone, download, flash };
  return (
    <div className="app-shell ops-shell">
      {menu && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "sidebar-open" : ""}`}>
        <div className="side-head">
          <Brand />
          <button onClick={() => setMenu(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>
        <nav>
          <p>OPERATIONS</p>
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              className={
                page === key || (page === "stone" && key === "inventory")
                  ? "active"
                  : ""
              }
              onClick={() => navigate(key)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {key === "workshop" && (
                <b>
                  {ledger.jobs.filter((j) => j.status !== "Returned").length}
                </b>
              )}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="demo-flag">
            DATABASE CONNECTED<span>MySQL is the source of truth</span>
          </div>
          <div className="profile">
            <div className="avatar">AD</div>
            <div>
              <strong>Administrator</strong>
              <span>System administrator</span>
            </div>
            <button
              onClick={() => void signOut()}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <button
            className="mobile-wordmark"
            onClick={() => navigate("dashboard")}
            aria-label="Go to command centre"
          >
            <Gem size={20} />
            <span>ORIGIN</span>
          </button>
          <button
            className="menu-button"
            onClick={() => setMenu(true)}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
          <div className="global-search">
            <Search size={17} />
            <input
              aria-label="Search stones"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product ID, stone ID or gem type"
            />
          </div>
          <div className="top-actions">
            <span className="sync-state">
              <i /> MySQL connected
            </span>
            <button
              className="mini-avatar"
              onClick={() => navigate("dashboard")}
            >
              AD
            </button>
          </div>
        </header>
        <div className="page-wrap">
          {search ? (
            <SearchResults ledger={ledger} query={search} navigate={navigate} />
          ) : page === "dashboard" ? (
            <Dashboard ledger={ledger} actions={actions} />
          ) : page === "inventory" ? (
            <Inventory ledger={ledger} actions={actions} />
          ) : page === "stone" && stone ? (
            <StoneDetail ledger={ledger} stone={stone} actions={actions} />
          ) : page === "intake" ? (
            <Intake
              key={editing ?? "new-stone"}
              saveStone={saveStone}
              navigate={navigate}
              sellers={ledger.sellers}
              stone={
                editing
                  ? ledger.stones.find((item) => item.id === editing)
                  : undefined
              }
            />
          ) : page === "workshop" ? (
            <Workshop ledger={ledger} actions={actions} />
          ) : page === "custody" ? (
            <Custody ledger={ledger} actions={actions} />
          ) : page === "stocktake" ? (
            <Stocktake
              ledger={ledger}
              counted={counted}
              mark={stocktake}
              actions={actions}
            />
          ) : page === "quality" ? (
            <Quality ledger={ledger} actions={actions} />
          ) : page === "sales" ? (
            <Sales ledger={ledger} actions={actions} />
          ) : page === "reports" ? (
            <Reports ledger={ledger} actions={actions} />
          ) : (
            <Directory ledger={ledger} />
          )}
        </div>
      </main>
      <MobileNav
        page={page}
        navigate={navigate}
        openMenu={() => setMenu(true)}
      />
      {stone && (
        <OperationDialog
          operation={operation}
          close={() => {
            setOperation(null);
            setNotice("");
          }}
          stone={ledger.stones.find((s) => s.id === target) || stone}
          ledger={ledger}
          submit={submitOperation}
          error={operation ? notice : ""}
        />
      )}
    </div>
  );
}

type Actions = {
  navigate: (p: Page, id?: string) => void;
  open: (o: Operation, id?: string) => void;
  edit: (id: string) => void;
  saveStone: (
    form: FormData,
    photos: PhotoDraft[],
    removedImageIds: number[],
  ) => void;
  download: typeof download;
  flash: (m: string) => void;
};
function MobileNav({
  page,
  navigate,
  openMenu,
}: {
  page: Page;
  navigate: Actions["navigate"];
  openMenu: () => void;
}) {
  const item = (target: Page, label: string, Icon: typeof LayoutDashboard) => (
    <button
      className={
        page === target || (page === "stone" && target === "inventory")
          ? "active"
          : ""
      }
      onClick={() => navigate(target)}
    >
      <Icon size={20} strokeWidth={1.9} />
      <span>{label}</span>
    </button>
  );
  return (
    <nav className="mobile-dock" aria-label="Primary mobile navigation">
      {item("dashboard", "Home", LayoutDashboard)}
      {item("inventory", "Stones", Gem)}
      <button className="mobile-create" onClick={() => navigate("intake")}>
        <span>
          <Plus size={24} />
        </span>
        <small>Receive</small>
      </button>
      {item("workshop", "Work", WandSparkles)}
      <button onClick={openMenu}>
        <Menu size={20} strokeWidth={1.9} />
        <span>More</span>
      </button>
    </nav>
  );
}
function Heading({
  kicker,
  title,
  sub,
  button,
  onClick,
}: {
  kicker: string;
  title: string;
  sub?: string;
  button?: string;
  onClick?: () => void;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {button && (
        <button className="primary-button" onClick={onClick}>
          <Plus size={17} />
          {button}
        </button>
      )}
    </div>
  );
}
function Panel({
  title,
  sub,
  children,
  aside,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
function Action({
  children,
  onClick,
  sub,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  sub?: string;
  disabled?: boolean;
}) {
  return (
    <button className="ops-action" onClick={onClick} disabled={disabled}>
      <strong>{children}</strong>
      {sub && <small>{sub}</small>}
      <ArrowRight size={16} />
    </button>
  );
}
function StoneLink({
  stone,
  navigate,
}: {
  stone: Stone;
  navigate: Actions["navigate"];
}) {
  return (
    <button
      className="ops-stone-link"
      onClick={() => navigate("stone", stone.id)}
    >
      <span
        className={`gem-swatch ${stone.type.toLowerCase().replaceAll(" ", "-")}`}
      >
        <Gem size={23} />
      </span>
      <span>
        <strong>{stone.type}</strong>
        <small>
          {stone.productId} · {stone.id}
        </small>
      </span>
    </button>
  );
}

function Dashboard({ ledger, actions }: { ledger: Ledger; actions: Actions }) {
  const active = ledger.stones.filter((s) => s.status !== "Sold"),
    openJobs = ledger.jobs.filter((j) => j.status !== "Returned"),
    salesmanRevenue = ledger.salesmanHandovers
      .filter((handover) => handover.status === "Sold")
      .reduce((total, handover) => total + handover.finalPrice, 0);
  return (
    <>
      <Heading
        kicker="OPERATIONS SNAPSHOT"
        title="Command centre"
        sub="Your live operations, priorities and next actions."
        button="Receive new stone"
        onClick={() => actions.navigate("intake")}
      />
      <div className="ops-metrics">
        <div className="metric accent">
          <span>Stones in custody</span>
          <strong>{active.length}</strong>
          <small>
            {active.reduce((n, s) => n + s.weight, 0).toFixed(2)} total carats
          </small>
        </div>
        <div className="metric">
          <span>Active workshop jobs</span>
          <strong>{openJobs.length}</strong>
          <small>
            {openJobs.filter((j) => j.status === "With provider").length} with
            external providers
          </small>
        </div>
        <div className="metric">
          <span>With salesmen / held</span>
          <strong>
            {
              ledger.stones.filter((s) =>
                ["With Salesman", "On Hold"].includes(s.status),
              ).length
            }
          </strong>
          <small>Not available for sale</small>
        </div>
        <div className="metric">
          <span>Salesman sales</span>
          <strong>{money(salesmanRevenue)}</strong>
          <small>Final recorded selling prices</small>
        </div>
      </div>
      <div className="ops-two">
        <Panel
          title="Today’s work queue"
          sub="Resolve the next operational handoffs"
        >
          <div className="ops-queue">
            {openJobs.map((job) => {
              const stone = ledger.stones.find((s) => s.id === job.stoneId)!;
              return (
                <div className="ops-queue-row" key={job.id}>
                  <div>
                    <strong>
                      {job.id} · {stone.type}
                    </strong>
                    <small>
                      {job.status} · handed over {job.handoverDate} · due{" "}
                      {job.due}
                    </small>
                  </div>
                  <button
                    onClick={() =>
                      actions.open(
                        job.status === "Pending dispatch"
                          ? "dispatch"
                          : "return",
                        job.stoneId,
                      )
                    }
                  >
                    {job.status === "Pending dispatch" ? "Dispatch" : "Receive"}{" "}
                    <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
            {!openJobs.length && <p className="ops-empty">No open jobs.</p>}
            <div className="ops-queue-row">
              <div>
                <strong>Salesman handovers</strong>
                <small>
                  {
                    ledger.salesmanHandovers.filter(
                      (handover) => handover.status === "With salesman",
                    ).length
                  }{" "}
                  awaiting sale or return
                </small>
              </div>
              <button onClick={() => actions.navigate("sales")}>
                Review <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </Panel>
        <Panel title="Quick operations" sub="Common actions from the floor">
          <div className="ops-action-grid">
            <Action
              onClick={() => actions.navigate("intake")}
              sub="Assign permanent Stone ID"
            >
              Receive stone
            </Action>
            <Action
              onClick={() => actions.navigate("workshop")}
              sub="Cutting or treatment"
            >
              Start workshop job
            </Action>
            <Action
              onClick={() => actions.navigate("custody")}
              sub="Location and responsibility"
            >
              Record custody
            </Action>
            <Action
              onClick={() => actions.navigate("quality")}
              sub="Assessments and holds"
            >
              Quality review
            </Action>
          </div>
        </Panel>
      </div>
      <Panel
        title="Latest lifecycle events"
        sub="The latest permanent lifecycle activity"
        aside={
          <button
            className="ops-link"
            onClick={() => actions.navigate("inventory")}
          >
            All stones <ArrowRight size={15} />
          </button>
        }
      >
        <EventRows events={ledger.events.slice(0, 5)} actions={actions} />
      </Panel>
    </>
  );
}
function EventRows({ events, actions }: { events: Event[]; actions: Actions }) {
  return (
    <div className="ops-events">
      {events.map((e) => (
        <button
          className="ops-event"
          key={e.id}
          onClick={() => actions.navigate("stone", e.stoneId)}
        >
          <span className="ops-event-mark">
            <History size={16} />
          </span>
          <span>
            <strong>{e.title}</strong>
            <small>
              {e.stoneId} · {e.detail}
            </small>
          </span>
          <time>{e.at}</time>
        </button>
      ))}
      {events.length === 0 && (
        <p className="ops-empty">No events recorded yet.</p>
      )}
    </div>
  );
}
function SearchResults({
  ledger,
  query,
  navigate,
}: {
  ledger: Ledger;
  query: string;
  navigate: Actions["navigate"];
}) {
  const found = ledger.stones.filter((s) =>
    `${s.productId} ${s.qrToken} ${s.id} ${s.type} ${s.origin} ${s.seller}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <Heading
        kicker="SEARCH"
        title="Stone search"
        sub={`${found.length} matching records for “${query}”`}
      />
      <Panel title="Results">
        {found.map((s) => (
          <div className="ops-row" key={s.id}>
            <StoneLink stone={s} navigate={navigate} />
            <span>{s.origin}</span>
            <Badge value={s.status} />
            <button
              className="ops-link"
              onClick={() => navigate("stone", s.id)}
              aria-label={`Open ${s.id}`}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        ))}
        {!found.length && (
          <p className="ops-empty">
            No stone matches. Try a Product ID, Stone ID, gem type or locality.
          </p>
        )}
      </Panel>
    </>
  );
}
function Inventory({ ledger, actions }: { ledger: Ledger; actions: Actions }) {
  const [filter, setFilter] = useState("All"),
    [query, setQuery] = useState("");
  const shown = ledger.stones.filter(
    (s) =>
      (filter === "All" || s.status === filter) &&
      `${s.productId} ${s.id} ${s.type} ${s.origin}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <Heading
        kicker="PERMANENT REGISTER"
        title="Stone register"
        sub="Trace the current state, location and identity of each stone."
        button="Receive stone"
        onClick={() => actions.navigate("intake")}
      />
      <div className="ops-toolbar">
        <div className="ops-filters">
          {[
            "All",
            "Available",
            "In Cutting",
            "In Treatment",
            "With Salesman",
            "On Hold",
            "Sold",
          ].map((f) => (
            <button
              key={f}
              className={filter === f ? "selected" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="ops-tools">
          <label>
            <Search size={16} />
            <input
              aria-label="Filter register"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter stones"
            />
          </label>
          <button
            onClick={() =>
              actions.download(
                "stone-register.csv",
                [
                  "Product ID",
                  "Stone ID",
                  "Gem type",
                  "Origin",
                  "Carats",
                  "Status",
                  "Location",
                  "Custodian",
                  "Purchase LKR",
                  "Asking LKR",
                ],
                shown.map((s) => [
                  s.productId,
                  s.id,
                  s.type,
                  s.origin,
                  s.weight,
                  s.status,
                  s.location,
                  s.custodian,
                  s.purchase,
                  s.asking,
                ]),
              )
            }
          >
            <Download size={16} /> CSV
          </button>
        </div>
      </div>
      <Panel
        title={`${shown.length} stones`}
        sub="Sold records remain searchable for traceability"
      >
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Stone</th>
                <th>Origin</th>
                <th>Weight</th>
                <th>Location / custodian</th>
                <th>Status</th>
                <th>Asking</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id} onClick={() => actions.navigate("stone", s.id)}>
                  <td>
                    <StoneLink stone={s} navigate={actions.navigate} />
                  </td>
                  <td>{s.origin}</td>
                  <td>{s.weight.toFixed(2)} ct</td>
                  <td>
                    {s.location}
                    <small>{s.custodian}</small>
                  </td>
                  <td>
                    <Badge value={s.status} />
                  </td>
                  <td>{s.asking ? money(s.asking) : "Not listed"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && (
            <p className="ops-empty">No stones match this filter.</p>
          )}
        </div>
      </Panel>
    </>
  );
}

function StoneDetail({
  ledger,
  stone,
  actions,
}: {
  ledger: Ledger;
  stone: Stone;
  actions: Actions;
}) {
  const events = ledger.events.filter((e) => e.stoneId === stone.id),
    jobs = ledger.jobs.filter((j) => j.stoneId === stone.id),
    salesmanHandovers = ledger.salesmanHandovers.filter(
      (handover) => handover.stoneId === stone.id,
    ),
    cost =
      stone.purchase +
      jobs
        .filter((j) => j.status === "Returned")
        .reduce((n, j) => n + j.cost, 0);
  return (
    <>
      <button
        className="back-button"
        onClick={() => actions.navigate("inventory")}
      >
        <ArrowLeft size={17} />
        Stone register
      </button>
      <div className="stone-hero ops-hero">
        <div className="gem-visual">
          {stone.images[0] ? (
            <Image
              unoptimized
              width={1000}
              height={1000}
              src={stone.images[0].url}
              alt={`${stone.type} ${stone.id}`}
            />
          ) : (
            <Gem size={65} strokeWidth={1} />
          )}
        </div>
        <div className="stone-title">
          <div>
            <Badge value={stone.status} />
            <span className="stone-id">{stone.id}</span>
          </div>
          <h1>{stone.type}</h1>
          <strong className="product-id">{stone.productId}</strong>
          <p>
            {stone.color} · {stone.shape} · {stone.origin}
          </p>
        </div>
        <div className="stone-hero-actions">
          <button
            className="ops-secondary"
            onClick={() => actions.edit(stone.id)}
          >
            <Pencil size={17} /> Edit details
          </button>
          <button className="ops-secondary" onClick={() => window.print()}>
            <QrCode size={17} /> Print record
          </button>
        </div>
      </div>
      <div className="ops-detail-grid">
        <div className="ops-detail-main">
          <Panel
            title="Stone specification"
            sub="Latest measured state; prior values remain in history"
          >
            <div className="fact-grid">
              {[
                ["Product ID", stone.productId],
                ["Stone ID", stone.id],
                ["Current weight", `${stone.weight.toFixed(2)} ct`],
                ["Intake weight", `${stone.originalWeight.toFixed(2)} ct`],
                ["Shape", stone.shape],
                ["Cut", stone.cut],
                ["Colour", stone.color],
                ["Origin", stone.origin],
                ["Treatment statement", stone.treatment],
                ["Certificate reference", stone.certificate],
                ["Acquired", stone.acquired],
              ].map(([k, v]) => (
                <div key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          </Panel>
          {stone.images.length > 0 && (
            <Panel
              title="Stone images"
              sub="Square reference images stored with this stone"
            >
              <div className="stone-gallery">
                {stone.images.map((image, index) => (
                  <Image
                    unoptimized
                    width={1000}
                    height={1000}
                    key={image.id}
                    src={image.url}
                    alt={`${stone.type} view ${index + 1}`}
                  />
                ))}
              </div>
            </Panel>
          )}
          <Panel
            title="Chain of custody & lifecycle"
            sub={`${events.length} permanent lifecycle entries`}
          >
            {events.map((e) => (
              <div className="ops-timeline-row" key={e.id}>
                <span className="ops-timeline-icon">
                  <History size={16} />
                </span>
                <div>
                  <div>
                    <strong>{e.title}</strong>
                    <Badge value={e.category} />
                  </div>
                  <p>{e.detail}</p>
                  <small>
                    {e.at} · {e.actor}
                  </small>
                </div>
              </div>
            ))}
          </Panel>
          <Panel title="Jobs and commercial records">
            <div className="ops-record-list">
              {jobs.map((j) => (
                <div key={j.id}>
                  <span>
                    <strong>
                      {j.id} · {j.kind}
                    </strong>
                    <small>
                      {j.workshop} · {j.provider} · {j.status}
                    </small>
                  </span>
                  <span>
                    {j.beforeWeight.toFixed(2)} →{" "}
                    {j.afterWeight?.toFixed(2) || "—"} ct
                  </span>
                </div>
              ))}
              {salesmanHandovers.map((handover) => (
                <div key={handover.id}>
                  <span>
                    <strong>
                      {handover.id} · {handover.status}
                    </strong>
                    <small>
                      {handover.salesman} · quoted {money(handover.quotedPrice)}
                    </small>
                  </span>
                  <span>
                    {handover.status === "Sold"
                      ? money(handover.finalPrice)
                      : handover.deadline}
                  </span>
                </div>
              ))}
              {jobs.length + salesmanHandovers.length === 0 && (
                <p>No jobs or transactions yet.</p>
              )}
            </div>
          </Panel>
        </div>
        <aside className="ops-detail-aside">
          <Panel
            title="Product identity"
            sub="Unique QR identity for this stone"
          >
            <div className="qr-identity">
              <div
                className="qr-code"
                aria-label={`QR code for ${stone.productId}`}
              >
                <QRCode
                  value={JSON.stringify({
                    system: "ORIGIN",
                    productId: stone.productId,
                    stoneId: stone.id,
                    token: stone.qrToken,
                  })}
                  size={168}
                  level="H"
                  title={`Product ${stone.productId}`}
                />
              </div>
              <strong>{stone.productId}</strong>
              <span>{stone.id}</span>
              <small>Scan to identify this exact stone record.</small>
            </div>
          </Panel>
          <Panel title="Current custody">
            <div className="ops-aside-data">
              <span>LOCATION</span>
              <strong>{stone.location}</strong>
              <span>CUSTODIAN</span>
              <strong>{stone.custodian}</strong>
              <span>SELLER / SOURCE</span>
              <strong>{stone.seller}</strong>
            </div>
          </Panel>
          <Panel title="Commercial position">
            <div className="ops-aside-data">
              <span>PURCHASE COST</span>
              <strong>{money(stone.purchase)}</strong>
              <span>COMPLETED JOB COST</span>
              <strong>{money(cost - stone.purchase)}</strong>
              <span>ASKING PRICE</span>
              <strong>
                {stone.asking ? money(stone.asking) : "Not listed"}
              </strong>
              <span>INDICATIVE MARGIN</span>
              <strong>{stone.asking ? money(stone.asking - cost) : "—"}</strong>
            </div>
          </Panel>
          <Panel title="Available operations">
            <div className="ops-side-actions">
              {stone.status === "Available" && (
                <>
                  <Action onClick={() => actions.open("job", stone.id)}>
                    Start cutting / treatment
                  </Action>
                  <Action
                    onClick={() => actions.open("sales-handover", stone.id)}
                  >
                    Hand to salesman
                  </Action>
                  <Action onClick={() => actions.open("sale", stone.id)}>
                    Complete sale
                  </Action>
                  <Action onClick={() => actions.open("price", stone.id)}>
                    Set asking price
                  </Action>
                  <Action onClick={() => actions.open("hold", stone.id)}>
                    Place on hold
                  </Action>
                </>
              )}
              {stone.status === "With Salesman" && (
                <>
                  <Action
                    onClick={() => actions.open("sales-complete", stone.id)}
                  >
                    Record salesman sale
                  </Action>
                  <Action
                    onClick={() => actions.open("sales-return", stone.id)}
                  >
                    Receive from salesman
                  </Action>
                </>
              )}
              {stone.status === "On Hold" && (
                <Action onClick={() => actions.open("clear-hold", stone.id)}>
                  Clear hold
                </Action>
              )}
              {["In Cutting", "In Treatment"].includes(stone.status) && (
                <Action onClick={() => actions.navigate("workshop")}>
                  Review active job
                </Action>
              )}
              {stone.status !== "Sold" && (
                <Action
                  onClick={() => actions.open("custody", stone.id)}
                  disabled={
                    !!jobs.find(
                      (j) => j.stoneId === stone.id && j.status !== "Returned",
                    )
                  }
                >
                  Transfer custody
                </Action>
              )}
              <Action onClick={() => actions.open("quality", stone.id)}>
                Record assessment
              </Action>
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
}

const gemTypes = [
  "Blue Sapphire",
  "Yellow Sapphire",
  "Padparadscha Sapphire",
  "White Sapphire",
  "Star Sapphire",
  "Ruby",
  "Pink Spinel",
  "Red Spinel",
  "Blue Spinel",
  "Chrysoberyl",
  "Cat's Eye Chrysoberyl",
  "Alexandrite",
  "Emerald",
  "Aquamarine",
  "Tourmaline",
  "Garnet",
  "Topaz",
  "Zircon",
  "Moonstone",
  "Quartz",
];
const stoneShapes = [
  "Rough",
  "Round",
  "Oval",
  "Cushion",
  "Emerald",
  "Pear",
  "Marquise",
  "Princess",
  "Asscher",
  "Radiant",
  "Heart",
  "Trillion",
  "Baguette",
  "Kite",
  "Shield",
  "Hexagon",
  "Octagon",
  "Cabochon",
  "Freeform",
];
const cutStyles = ["Rough", "Oval", "Cushion", "Emerald", "Round"];

function editable(value: string) {
  return ["Not recorded", "None", "Not assigned"].includes(value) ? "" : value;
}

async function squarePhoto(file: File) {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The image could not be read"));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = document.createElement("img");
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("The image could not be opened"));
    element.src = source;
  });
  const size = Math.min(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 1000;
  canvas
    .getContext("2d")
    ?.drawImage(
      image,
      (image.naturalWidth - size) / 2,
      (image.naturalHeight - size) / 2,
      size,
      size,
      0,
      0,
      1000,
      1000,
    );
  return canvas.toDataURL("image/jpeg", 0.84);
}

function Intake({
  saveStone,
  navigate,
  stone,
  sellers,
}: {
  saveStone: Actions["saveStone"];
  navigate: Actions["navigate"];
  stone?: Stone;
  sellers: Ledger["sellers"];
}) {
  const [photos, setPhotos] = useState<PhotoDraft[]>(
    () =>
      stone?.images.map((image) => ({
        id: image.id,
        dataUrl: image.url,
        captured: image.captured,
      })) ?? [],
  );
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [selectedSeller, setSelectedSeller] = useState(
    stone?.sellerId ? String(stone.sellerId) : "",
  );
  const addPhotos = async (files: FileList | null, captured: boolean) => {
    if (!files?.length) return;
    const remaining = 4 - photos.length;
    if (remaining <= 0) {
      const message = "A stone can have up to four square images.";
      setPhotoError(message);
      toast.error(message);
      return;
    }
    try {
      const prepared = await Promise.all(
        Array.from(files)
          .slice(0, remaining)
          .map(async (file) => ({
            dataUrl: await squarePhoto(file),
            captured,
          })),
      );
      setPhotos((current) => [...current, ...prepared]);
      const limitedMessage =
        files.length > remaining
          ? `Only the first ${remaining} image${remaining === 1 ? "" : "s"} was added.`
          : "";
      setPhotoError(limitedMessage);
      if (limitedMessage) toast.warning(limitedMessage);
      else
        toast.success(
          `${prepared.length} stone image${prepared.length === 1 ? "" : "s"} added.`,
        );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The image could not be prepared";
      setPhotoError(message);
      toast.error(message);
    }
  };
  const removePhoto = (photo: PhotoDraft) => {
    setPhotos((current) => current.filter((item) => item !== photo));
    if (photo.id) setRemovedImageIds((current) => [...current, photo.id!]);
  };
  return (
    <>
      <Heading
        kicker="PURCHASE & INTAKE"
        title={stone ? `Edit ${stone.id}` : "Receive a new stone"}
        sub={
          stone
            ? "Update the working record without changing its permanent Stone ID or earlier history."
            : "Confirm the physical item, source and initial characteristics before assigning its permanent ID."
        }
      />
      <form
        className="panel ops-form-card"
        action={(form) => saveStone(form, photos, removedImageIds)}
      >
        <div className="ops-section-head">
          <h2>01 · Identity & source</h2>
          <p>
            {stone
              ? "The permanent Stone ID remains unchanged."
              : "A unique Stone ID is generated when this record is saved."}
          </p>
        </div>
        <div className="ops-fields">
          <label>
            Gem type *
            <input
              name="type"
              list="gem-type-options"
              required
              defaultValue={stone?.type ?? ""}
              placeholder="Select or type a gem type"
            />
            <datalist id="gem-type-options">
              {gemTypes.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <small>Select a suggestion or type a new gem type.</small>
          </label>
          <label>
            Origin / locality *
            <input
              name="origin"
              required
              defaultValue={stone?.origin}
              placeholder="e.g. Ratnapura"
            />
          </label>
          <label>
            Seller / source
            <select
              name="sellerId"
              value={selectedSeller}
              onChange={(event) => setSelectedSeller(event.target.value)}
            >
              <option value="">No seller selected</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                  {seller.locality ? ` · ${seller.locality}` : ""}
                </option>
              ))}
              <option value="__new__">＋ Add a new seller</option>
            </select>
          </label>
          <label>
            Purchase date
            <input
              name="date"
              type="date"
              defaultValue={stone?.acquired ?? today()}
            />
          </label>
          {selectedSeller === "__new__" && (
            <div className="new-seller-fields ops-full">
              <div className="inline-form-heading">
                <Plus size={17} />
                <span>
                  <strong>New seller details</strong>
                  <small>
                    This seller will be saved to the seller directory.
                  </small>
                </span>
              </div>
              <label>
                Seller name *
                <input
                  name="newSellerName"
                  required
                  placeholder="Person or business name"
                />
              </label>
              <label>
                Phone
                <input
                  name="newSellerPhone"
                  type="tel"
                  placeholder="Contact number"
                />
              </label>
              <label>
                Email
                <input
                  name="newSellerEmail"
                  type="email"
                  placeholder="Email address"
                />
              </label>
              <label>
                Locality
                <input
                  name="newSellerLocality"
                  placeholder="Town or district"
                />
              </label>
            </div>
          )}
        </div>
        <div className="ops-section-head">
          <h2>02 · Physical characteristics</h2>
          <p>
            Use the weight recorded at intake as the baseline for future
            processing.
          </p>
        </div>
        <div className="ops-fields">
          <label>
            Weight in carats *
            <input
              name="weight"
              type="number"
              min="0.001"
              step="0.001"
              required
              defaultValue={stone?.originalWeight}
              placeholder="0.000"
            />
          </label>
          <label>
            Shape
            <input
              name="shape"
              list="shape-options"
              defaultValue={stone ? editable(stone.shape) : ""}
              placeholder="Select or type a shape"
            />
            <datalist id="shape-options">
              {stoneShapes.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <small>
              Common 1 ct store shapes are included; custom shapes are accepted.
            </small>
          </label>
          <label>
            Cut
            <input
              name="cut"
              list="cut-options"
              defaultValue={stone ? editable(stone.cut) : ""}
              placeholder="Select or type a cut"
            />
            <datalist id="cut-options">
              {cutStyles.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <small>
              The original choices remain available, and new cuts can be typed.
            </small>
          </label>
          <label>
            Colour
            <input
              name="color"
              defaultValue={stone ? editable(stone.color) : ""}
              placeholder="Hue, tone and saturation"
            />
          </label>
          <label>
            Treatment declaration
            <select
              name="treatment"
              defaultValue={stone?.treatment ?? "Not assessed"}
            >
              <option>Not assessed</option>
              <option>No treatment declared</option>
              <option>Heated · dealer disclosed</option>
              <option>Other treatment disclosed</option>
            </select>
          </label>
          <label>
            Existing lab reference
            <input
              name="certificate"
              defaultValue={stone ? editable(stone.certificate) : ""}
              placeholder="Optional certificate number"
            />
          </label>
          <label>
            Receiving location
            <input
              name="location"
              defaultValue={stone ? editable(stone.location) : ""}
              placeholder="Main vault · Intake"
            />
          </label>
        </div>
        <div className="ops-section-head">
          <h2>03 · Stone images</h2>
          <p>
            Add up to four images. Every image is centre-cropped to a consistent
            1:1 square and stored in MySQL.
          </p>
        </div>
        <div className="photo-capture">
          <div className="photo-grid">
            {photos.map((photo, index) => (
              <div
                className="photo-tile"
                key={photo.id ?? `${photo.dataUrl.slice(-18)}-${index}`}
              >
                <Image
                  unoptimized
                  width={1000}
                  height={1000}
                  src={photo.dataUrl}
                  alt={`Stone preview ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(photo)}
                  aria-label={`Remove image ${index + 1}`}
                >
                  <Trash2 size={16} />
                </button>
                {photo.captured && <span>CAMERA</span>}
              </div>
            ))}
            {photos.length < 4 && (
              <div className="photo-placeholder">
                <Gem size={28} />
                <span>{4 - photos.length} image slots</span>
              </div>
            )}
          </div>
          <div className="photo-actions">
            <label className="ops-secondary photo-button">
              <ImagePlus size={18} /> Upload images
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={(event) => void addPhotos(event.target.files, false)}
              />
            </label>
            <label className="ops-secondary photo-button">
              <Camera size={18} /> Take photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(event) => void addPhotos(event.target.files, true)}
              />
            </label>
          </div>
          {photoError && <p className="field-error">{photoError}</p>}
        </div>
        <div className="ops-section-head">
          <h2>04 · Commercial intake</h2>
        </div>
        <div className="ops-fields">
          <label>
            Purchase cost · LKR
            <input
              name="purchase"
              type="number"
              min="0"
              step="1"
              defaultValue={stone?.purchase ?? 0}
            />
          </label>
          <label className="ops-full">
            Inspection notes
            <textarea
              name="notes"
              rows={3}
              defaultValue={stone?.notes}
              placeholder="Inclusions, condition, parcel references and other observations"
            />
          </label>
        </div>
        <div className="ops-form-footer">
          <button
            type="button"
            className="ops-secondary"
            onClick={() => navigate("inventory")}
          >
            Cancel
          </button>
          <button className="primary-button" type="submit">
            {stone ? "Save changes" : "Register stone"} <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </>
  );
}

function Workshop({ ledger, actions }: { ledger: Ledger; actions: Actions }) {
  const [filter, setFilter] = useState("Open");
  const jobs = ledger.jobs.filter(
    (j) =>
      filter === "All" ||
      (filter === "Open" ? j.status !== "Returned" : j.status === filter),
  );
  return (
    <>
      <Heading
        kicker="PROCESS CONTROL"
        title="Cutting & treatment"
        sub="Issue jobs, acknowledge dispatch, receive stones and reconcile carat loss."
        button="Start a job"
        onClick={() =>
          actions.open(
            "job",
            ledger.stones.find((s) => s.status === "Available")?.id,
          )
        }
      />
      <div className="ops-process-strip">
        <div>
          <strong>1</strong>
          <span>Issue job</span>
        </div>
        <ArrowRight />
        <div>
          <strong>2</strong>
          <span>Transfer custody</span>
        </div>
        <ArrowRight />
        <div>
          <strong>3</strong>
          <span>Receive & weigh</span>
        </div>
        <ArrowRight />
        <div>
          <strong>4</strong>
          <span>Release to stock</span>
        </div>
      </div>
      <div className="ops-filters">
        {["Open", "Pending dispatch", "With provider", "Returned", "All"].map(
          (f) => (
            <button
              className={filter === f ? "selected" : ""}
              onClick={() => setFilter(f)}
              key={f}
            >
              {f}
            </button>
          ),
        )}
      </div>
      <div className="ops-job-grid">
        {jobs.map((j) => {
          const stone = ledger.stones.find((s) => s.id === j.stoneId)!;
          return (
            <article className="panel ops-job" key={j.id}>
              <div className="ops-job-top">
                <span className="eyebrow">
                  {j.id} · {j.kind.toUpperCase()}
                </span>
                <Badge value={j.status} />
              </div>
              <StoneLink stone={stone} navigate={actions.navigate} />
              <div className="ops-job-facts">
                <div>
                  <span>Workshop / provider</span>
                  <strong>
                    {j.workshop} · {j.provider}
                  </strong>
                </div>
                <div>
                  <span>Handover / due back</span>
                  <strong>
                    {j.handoverDate} → {j.due}
                  </strong>
                </div>
                <div>
                  <span>Outgoing weight</span>
                  <strong>{j.beforeWeight.toFixed(2)} ct</strong>
                </div>
                <div>
                  <span>Job cost</span>
                  <strong>{money(j.cost)}</strong>
                </div>
              </div>
              <p>{j.notes}</p>
              {j.status !== "Returned" && (
                <button
                  className="primary-button"
                  onClick={() =>
                    actions.open(
                      j.status === "Pending dispatch" ? "dispatch" : "return",
                      j.stoneId,
                    )
                  }
                >
                  {j.status === "Pending dispatch"
                    ? "Dispatch & sign out"
                    : "Receive & reconcile"}
                  <ArrowRight size={16} />
                </button>
              )}
              {j.status === "Returned" && (
                <div className="ops-job-complete">
                  <ShieldCheck size={17} /> Received at{" "}
                  {j.afterWeight?.toFixed(2)} ct
                </div>
              )}
            </article>
          );
        })}
        {!jobs.length && <p className="ops-empty">No jobs in this stage.</p>}
      </div>
    </>
  );
}
function Custody({ ledger, actions }: { ledger: Ledger; actions: Actions }) {
  return (
    <>
      <Heading
        kicker="PHYSICAL CONTROL"
        title="Custody & locations"
        sub="Know where each stone is and who is responsible for it."
      />
      <div className="ops-metrics">
        <div className="metric accent">
          <span>With the dealer</span>
          <strong>
            {
              ledger.stones.filter((s) => !s.location.includes("external"))
                .length
            }
          </strong>
          <small>Vault and display</small>
        </div>
        <div className="metric">
          <span>External custodians</span>
          <strong>
            {
              ledger.stones.filter((s) => s.location.includes("external"))
                .length
            }
          </strong>
          <small>Cutters or laboratories</small>
        </div>
        <div className="metric">
          <span>Sold through salesmen</span>
          <strong>
            {ledger.stones.filter((s) => s.status === "Sold").length}
          </strong>
          <small>History remains searchable</small>
        </div>
      </div>
      <Panel
        title="Custody register"
        sub="A transfer creates a new timeline entry"
      >
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Stone</th>
                <th>Physical location</th>
                <th>Current custodian</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {ledger.stones.map((s) => (
                <tr key={s.id}>
                  <td>
                    <StoneLink stone={s} navigate={actions.navigate} />
                  </td>
                  <td>{s.location}</td>
                  <td>{s.custodian}</td>
                  <td>
                    <Badge value={s.status} />
                  </td>
                  <td>
                    <button
                      className="ops-link"
                      disabled={
                        s.status === "Sold" ||
                        ledger.jobs.some(
                          (j) => j.stoneId === s.id && j.status !== "Returned",
                        )
                      }
                      onClick={() => actions.open("custody", s.id)}
                    >
                      Transfer <ArrowRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Recent handovers" sub="Recorded custody events">
        <EventRows
          events={ledger.events
            .filter((e) => e.category === "Custody")
            .slice(0, 6)}
          actions={actions}
        />
      </Panel>
    </>
  );
}
function Stocktake({
  ledger,
  counted,
  mark,
  actions,
}: {
  ledger: Ledger;
  counted: string[];
  mark: (id: string, missing: boolean) => void;
  actions: Actions;
}) {
  const [query, setQuery] = useState("");
  const local = ledger.stones.filter(
      (s) => s.status !== "Sold" && !s.location.includes("external"),
    ),
    shown = local.filter((s) =>
      `${s.id} ${s.type} ${s.location}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  return (
    <>
      <Heading
        kicker="INVENTORY ASSURANCE"
        title="Stocktake"
        sub="Verify physical stones against the live register. External items remain in the custody register."
      />
      <div className="ops-metrics">
        <div className="metric accent">
          <span>Expected on premises</span>
          <strong>{local.length}</strong>
          <small>Excludes external jobs and sold stones</small>
        </div>
        <div className="metric">
          <span>Verified this session</span>
          <strong>
            {counted.filter((id) => local.some((s) => s.id === id)).length}
          </strong>
          <small>Identity and location checked</small>
        </div>
        <div className="metric">
          <span>Discrepancies on hold</span>
          <strong>{local.filter((s) => s.status === "On Hold").length}</strong>
          <small>Blocked from sale pending investigation</small>
        </div>
      </div>
      <div className="ops-toolbar">
        <p className="ops-stock-instruction">
          Compare the physical tag, weight and storage location, then verify or
          flag the item.
        </p>
        <div className="ops-tools">
          <label>
            <Search size={16} />
            <input
              aria-label="Search stocktake"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Scan / enter Stone ID"
            />
          </label>
        </div>
      </div>
      <Panel
        title="Physical count sheet"
        sub="Each verification creates a lifecycle event"
      >
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Stone</th>
                <th>Expected location</th>
                <th>Weight</th>
                <th>Count status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id}>
                  <td>
                    <StoneLink stone={s} navigate={actions.navigate} />
                  </td>
                  <td>{s.location}</td>
                  <td>{s.weight.toFixed(2)} ct</td>
                  <td>
                    <Badge
                      value={
                        counted.includes(s.id)
                          ? "Verified"
                          : s.status === "On Hold"
                            ? "On Hold"
                            : "Uncounted"
                      }
                    />
                  </td>
                  <td>
                    <div className="ops-count-actions">
                      <button
                        disabled={
                          counted.includes(s.id) || s.status === "On Hold"
                        }
                        onClick={() => mark(s.id, false)}
                      >
                        Verify
                      </button>
                      <button
                        disabled={s.status === "On Hold"}
                        onClick={() => mark(s.id, true)}
                      >
                        Flag missing
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && (
            <p className="ops-empty">
              No on-premises stone matches this search.
            </p>
          )}
        </div>
      </Panel>
      <Panel
        title="Stocktake event log"
        sub="Confirmed counts and discrepancies"
      >
        <EventRows
          events={ledger.events.filter((e) => e.category === "Stocktake")}
          actions={actions}
        />
      </Panel>
    </>
  );
}
function Quality({ ledger, actions }: { ledger: Ledger; actions: Actions }) {
  const held = ledger.stones.filter((s) => s.status === "On Hold");
  return (
    <>
      <Heading
        kicker="QUALITY ASSURANCE"
        title="Quality & exceptions"
        sub="Record findings, treatment disclosure and reasons for blocking a stone."
      />
      <div className="ops-two">
        <Panel
          title="Exceptions requiring review"
          sub="Held stones cannot be reserved or sold"
        >
          <div className="ops-queue">
            {held.map((s) => (
              <div className="ops-queue-row" key={s.id}>
                <StoneLink stone={s} navigate={actions.navigate} />
                <button onClick={() => actions.open("clear-hold", s.id)}>
                  Clear hold <ArrowRight size={14} />
                </button>
              </div>
            ))}
            {!held.length && (
              <p className="ops-empty">No stones currently on hold.</p>
            )}
          </div>
        </Panel>
        <Panel title="Assessment queue" sub="Treatment and lab evidence">
          <div className="ops-queue">
            {ledger.stones
              .filter((s) => s.status !== "Sold")
              .slice(0, 5)
              .map((s) => (
                <div className="ops-queue-row" key={s.id}>
                  <div>
                    <strong>
                      {s.type} · {s.id}
                    </strong>
                    <small>
                      {s.treatment} · {s.certificate}
                    </small>
                  </div>
                  <button onClick={() => actions.open("quality", s.id)}>
                    Assess <ArrowRight size={14} />
                  </button>
                </div>
              ))}
          </div>
        </Panel>
      </div>
      <Panel title="Recent quality and exception events">
        <EventRows
          events={ledger.events
            .filter((e) =>
              ["Quality", "Exception", "Treatment"].includes(e.category),
            )
            .slice(0, 8)}
          actions={actions}
        />
      </Panel>
    </>
  );
}
function Sales({ ledger, actions }: { ledger: Ledger; actions: Actions }) {
  const active = ledger.salesmanHandovers.filter(
      (handover) => handover.status === "With salesman",
    ),
    returned = ledger.salesmanHandovers.filter(
      (handover) => handover.status === "Returned",
    ),
    sold = ledger.salesmanHandovers.filter(
      (handover) => handover.status === "Sold",
    );
  return (
    <>
      <Heading
        kicker="SALESMAN CUSTODY"
        title="Salesman trials"
        sub="Hand stones to salesmen, monitor deadlines, receive returns or record a completed sale."
        button="New handover"
        onClick={() =>
          actions.open(
            "sales-handover",
            ledger.stones.find((s) => s.status === "Available")?.id,
          )
        }
      />
      <div className="ops-metrics">
        <div className="metric accent">
          <span>With salesmen</span>
          <strong>{active.length}</strong>
          <small>
            {money(active.reduce((n, h) => n + h.quotedPrice, 0))} quoted
          </small>
        </div>
        <div className="metric">
          <span>Returned unsold</span>
          <strong>{returned.length}</strong>
          <small>Received back into custody</small>
        </div>
        <div className="metric">
          <span>Sales completed</span>
          <strong>{money(sold.reduce((n, h) => n + h.finalPrice, 0))}</strong>
          <small>{sold.length} salesman sales</small>
        </div>
      </div>
      <Panel
        title="Active handovers"
        sub="Stones currently held by salesmen for a sales attempt"
      >
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Reference / stone</th>
                <th>Salesman</th>
                <th>Quoted price</th>
                <th>Handed over</th>
                <th>Deadline</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {active.map((handover) => {
                const stone = ledger.stones.find(
                  (s) => s.id === handover.stoneId,
                );
                return (
                  <tr key={handover.id}>
                    <td>
                      <strong>{stone?.type ?? handover.stoneId}</strong>
                      <small>
                        {handover.stoneId} · {handover.id}
                      </small>
                    </td>
                    <td>{handover.salesman}</td>
                    <td>{money(handover.quotedPrice)}</td>
                    <td>
                      {new Date(handover.handedOverAt).toLocaleString("en-LK", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td>{handover.deadline}</td>
                    <td>
                      <div className="ops-count-actions">
                        <button
                          onClick={() =>
                            actions.open("sales-return", handover.stoneId)
                          }
                        >
                          Receive
                        </button>
                        <button
                          onClick={() =>
                            actions.open("sales-complete", handover.stoneId)
                          }
                        >
                          Sold
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!active.length && (
            <p className="ops-empty">No stones are currently with salesmen.</p>
          )}
        </div>
      </Panel>
      <Panel
        title="Handover history"
        sub="Returned and sold outcomes remain permanently recorded"
      >
        <div className="ops-queue">
          {[...sold, ...returned].map((handover) => (
            <div className="ops-queue-row" key={handover.id}>
              <div>
                <strong>
                  {handover.stoneId} · {handover.salesman}
                </strong>
                <small>
                  {handover.status} · quoted {money(handover.quotedPrice)}
                  {handover.status === "Sold"
                    ? ` · sold ${money(handover.finalPrice)}`
                    : ""}
                </small>
              </div>
              <Badge value={handover.status} />
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
function Reports({ ledger, actions }: { ledger: Ledger; actions: Actions }) {
  const sold = ledger.salesmanHandovers.filter(
      (handover) => handover.status === "Sold",
    ),
    revenue = sold.reduce((n, handover) => n + handover.finalPrice, 0),
    cost = sold.reduce(
      (n, handover) =>
        n +
        (ledger.stones.find((x) => x.id === handover.stoneId)?.purchase || 0) +
        ledger.jobs
          .filter(
            (j) => j.stoneId === handover.stoneId && j.status === "Returned",
          )
          .reduce((a, j) => a + j.cost, 0),
      0,
    );
  return (
    <>
      <Heading
        kicker="OPERATIONAL INTELLIGENCE"
        title="Reports"
        sub="Calculated from your transaction and lifecycle records."
      />
      <div className="ops-metrics">
        <div className="metric accent">
          <span>Revenue</span>
          <strong>{money(revenue)}</strong>
          <small>{sold.length} completed sales</small>
        </div>
        <div className="metric">
          <span>Gross profit</span>
          <strong>{money(revenue - cost)}</strong>
          <small>Sale less purchase and completed jobs</small>
        </div>
        <div className="metric">
          <span>Workshop spend</span>
          <strong>
            {money(
              ledger.jobs
                .filter((j) => j.status === "Returned")
                .reduce((n, j) => n + j.cost, 0),
            )}
          </strong>
          <small>Completed jobs only</small>
        </div>
        <div className="metric">
          <span>Active stock cost</span>
          <strong>
            {money(
              ledger.stones
                .filter((s) => s.status !== "Sold")
                .reduce((n, s) => n + s.purchase, 0),
            )}
          </strong>
          <small>Purchase cost basis</small>
        </div>
      </div>
      <div className="ops-two">
        <Panel title="Status distribution" sub="Current register totals">
          <div className="ops-bars">
            {[
              "Available",
              "With Salesman",
              "In Cutting",
              "In Treatment",
              "On Hold",
              "Sold",
            ].map((status) => {
              const count = ledger.stones.filter(
                (s) => s.status === status,
              ).length;
              return (
                <div key={status}>
                  <span>{status}</span>
                  <div>
                    <i
                      style={{
                        width: `${ledger.stones.length ? (count / ledger.stones.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel
          title="Data extracts"
          sub="Download the current presentation ledger"
        >
          <div className="ops-action-grid">
            <Action
              onClick={() =>
                actions.download(
                  "origin-stones.csv",
                  [
                    "Product ID",
                    "ID",
                    "Type",
                    "Origin",
                    "Weight ct",
                    "Status",
                    "Location",
                    "Purchase LKR",
                    "Asking LKR",
                  ],
                  ledger.stones.map((s) => [
                    s.productId,
                    s.id,
                    s.type,
                    s.origin,
                    s.weight,
                    s.status,
                    s.location,
                    s.purchase,
                    s.asking,
                  ]),
                )
              }
            >
              Stone register CSV
            </Action>
            <Action
              onClick={() =>
                actions.download(
                  "origin-lifecycle.csv",
                  [
                    "Stone ID",
                    "Date and time",
                    "Event",
                    "Detail",
                    "Actor",
                    "Category",
                  ],
                  ledger.events.map((e) => [
                    e.stoneId,
                    e.at,
                    e.title,
                    e.detail,
                    e.actor,
                    e.category,
                  ]),
                )
              }
            >
              Lifecycle audit CSV
            </Action>
            <Action
              onClick={() =>
                actions.download(
                  "origin-jobs.csv",
                  [
                    "Job",
                    "Stone",
                    "Type",
                    "Workshop",
                    "Provider",
                    "Status",
                    "Handover date",
                    "Due",
                    "Before ct",
                    "After ct",
                    "Cost LKR",
                  ],
                  ledger.jobs.map((j) => [
                    j.id,
                    j.stoneId,
                    j.kind,
                    j.workshop,
                    j.provider,
                    j.status,
                    j.handoverDate,
                    j.due,
                    j.beforeWeight,
                    j.afterWeight || "",
                    j.cost,
                  ]),
                )
              }
            >
              Workshop CSV
            </Action>
            <Action
              onClick={() =>
                actions.download(
                  "origin-salesman-handovers.csv",
                  [
                    "Reference",
                    "Stone",
                    "Salesman",
                    "Status",
                    "Quoted LKR",
                    "Final LKR",
                    "Handed over",
                    "Deadline",
                  ],
                  ledger.salesmanHandovers.map((handover) => [
                    handover.id,
                    handover.stoneId,
                    handover.salesman,
                    handover.status,
                    handover.quotedPrice,
                    handover.finalPrice,
                    handover.handedOverAt,
                    handover.deadline,
                  ]),
                )
              }
            >
              Salesman handovers CSV
            </Action>
          </div>
        </Panel>
      </div>
      <Panel title="Stone-level commercial performance">
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Stone</th>
                <th>Purchase</th>
                <th>Completed job cost</th>
                <th>Sale</th>
                <th>Gross result</th>
              </tr>
            </thead>
            <tbody>
              {ledger.stones.map((s) => {
                const sale = sold.find((x) => x.stoneId === s.id),
                  jobs = ledger.jobs
                    .filter(
                      (j) => j.stoneId === s.id && j.status === "Returned",
                    )
                    .reduce((n, j) => n + j.cost, 0);
                return (
                  <tr key={s.id}>
                    <td>
                      <button
                        className="ops-link"
                        onClick={() => actions.navigate("stone", s.id)}
                      >
                        {s.type} · {s.id}
                      </button>
                    </td>
                    <td>{money(s.purchase)}</td>
                    <td>{money(jobs)}</td>
                    <td>{sale ? money(sale.finalPrice) : "—"}</td>
                    <td>
                      {sale
                        ? money(sale.finalPrice - s.purchase - jobs)
                        : "Not sold"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
function Directory({ ledger }: { ledger: Ledger }) {
  return (
    <>
      <Heading
        kicker="TRADE NETWORK"
        title="Directory"
        sub="Salesmen, sellers and external providers linked to your operation."
      />
      <div className="contact-grid ops-contacts">
        {[
          ...ledger.salesmen.map((salesman) => ({
            name: salesman.name,
            role: "Salesman",
            phone: salesman.phone,
            locality: salesman.locality,
          })),
          ...ledger.contacts.filter((contact) => contact.role !== "Buyer"),
        ].map((c, i) => (
          <article className="panel contact-card" key={c.name}>
            <div className={`contact-avatar tone-${i % 4}`}>
              {c.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <h2>{c.name}</h2>
              <Badge value={c.role} />
            </div>
            <hr />
            <span>{c.locality}</span>
            <small>{c.phone}</small>
          </article>
        ))}
      </div>
    </>
  );
}

function OperationDialog({
  operation,
  close,
  stone,
  ledger,
  submit,
  error,
}: {
  operation: Operation | null;
  close: () => void;
  stone: Stone;
  ledger: Ledger;
  submit: (f: FormData) => void;
  error: string;
}) {
  const [jobKind, setJobKind] = useState<"Cutting" | "Treatment">("Cutting");
  const [jobWorkshop, setJobWorkshop] = useState("");
  const titles: Record<Operation, string> = {
    job: "Create workshop job",
    dispatch: "Dispatch to provider",
    return: "Receive and reconcile",
    custody: "Transfer custody",
    quality: "Record quality assessment",
    reserve: "Reserve stone",
    release: "Release reservation",
    sale: "Complete sale",
    payment: "Receive payment",
    hold: "Place stone on hold",
    "clear-hold": "Clear exception hold",
    price: "Set asking price",
    "sales-handover": "Hand stone to salesman",
    "sales-return": "Receive stone from salesman",
    "sales-complete": "Record salesman sale",
  };
  const openJobs = ledger.jobs.filter(
      (j) => j.stoneId === stone.id && j.status !== "Returned",
    ),
    reservation = ledger.sales.find(
      (s) => s.stoneId === stone.id && s.status === "Reserved",
    ),
    sold = ledger.sales.find(
      (s) => s.stoneId === stone.id && s.status === "Sold",
    ),
    activeSalesmanHandover = ledger.salesmanHandovers.find(
      (handover) =>
        handover.stoneId === stone.id && handover.status === "With salesman",
    );
  const allowed =
    operation === "job" ||
    operation === "reserve" ||
    operation === "sale" ||
    operation === "sales-handover";
  const kindCode = jobKind === "Cutting" ? "CUTTING" : "TREATMENT";
  const eligibleWorkshops = ledger.workshops.filter(
    (workshop) => workshop.type === "BOTH" || workshop.type === kindCode,
  );
  const selectedWorkshop = eligibleWorkshops.some(
    (workshop) => String(workshop.id) === jobWorkshop,
  )
    ? jobWorkshop
    : String(eligibleWorkshops[0]?.id ?? "");
  const eligibleProviders = ledger.providers.filter(
    (provider) =>
      String(provider.workshopId) === selectedWorkshop &&
      (provider.specialty === "BOTH" || provider.specialty === kindCode),
  );
  return (
    <Dialog
      open={!!operation}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className="ops-dialog">
        <DialogHeader>
          <DialogTitle>
            {operation ? titles[operation] : "Operation"}
          </DialogTitle>
          <DialogDescription>
            {stone.id} · {stone.type} · {stone.status}
          </DialogDescription>
        </DialogHeader>
        {operation && (
          <form
            key={`${operation}-${stone.id}`}
            onSubmit={(e) => {
              e.preventDefault();
              submit(new FormData(e.currentTarget));
            }}
          >
            <div className="ops-dialog-fields">
              {allowed && (
                <div className="ops-warning">
                  <ShieldCheck size={16} /> Start this operation for the
                  selected stone. Its current status will be checked before
                  recording.
                </div>
              )}
              {allowed && operation !== "sales-handover" && (
                <label>
                  Stone
                  <input value={`${stone.id} · ${stone.type}`} readOnly />
                </label>
              )}
              {operation === "sales-handover" && (
                <>
                  <label className="ops-full">
                    Stone details
                    <select name="stoneId" defaultValue={stone.id} required>
                      {ledger.stones
                        .filter((item) => item.status === "Available")
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.productId} · {item.id} · {item.type} ·{" "}
                            {item.weight.toFixed(2)} ct
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Salesman
                    <input
                      name="salesman"
                      list="salesman-options"
                      required
                      placeholder="Search salesman"
                      autoComplete="off"
                    />
                    <datalist id="salesman-options">
                      {ledger.salesmen.map((salesman) => (
                        <option key={salesman.id} value={salesman.name}>
                          {[salesman.locality, salesman.phone]
                            .filter(Boolean)
                            .join(" · ")}
                        </option>
                      ))}
                    </datalist>
                  </label>
                  <label>
                    Quoted price · LKR
                    <input
                      name="price"
                      type="number"
                      min="1"
                      defaultValue={stone.asking || ""}
                      required
                    />
                  </label>
                  <label>
                    Deadline date
                    <input name="deadline" type="date" required />
                  </label>
                  <label>
                    Handover date and time
                    <input name="handedOverAt" type="datetime-local" required />
                  </label>
                </>
              )}
              {operation === "sales-return" && (
                <>
                  <div className="ops-context ops-full">
                    {activeSalesmanHandover?.salesman} · quoted{" "}
                    {money(activeSalesmanHandover?.quotedPrice || 0)} · deadline{" "}
                    {activeSalesmanHandover?.deadline}
                  </div>
                  <label className="ops-full">
                    Receiving notes
                    <textarea
                      name="notes"
                      rows={3}
                      placeholder="Condition and acknowledgement when received"
                    />
                  </label>
                </>
              )}
              {operation === "sales-complete" && (
                <>
                  <div className="ops-context ops-full">
                    {activeSalesmanHandover?.salesman} · quoted{" "}
                    {money(activeSalesmanHandover?.quotedPrice || 0)}
                  </div>
                  <label>
                    Final selling price · LKR
                    <input
                      name="finalPrice"
                      type="number"
                      min="1"
                      defaultValue={activeSalesmanHandover?.quotedPrice || ""}
                      required
                    />
                  </label>
                  <div className="ops-context">
                    The final price may be lower or higher than the quoted
                    price.
                  </div>
                </>
              )}
              {operation === "job" && (
                <>
                  <label>
                    Process
                    <select
                      name="kind"
                      value={jobKind}
                      onChange={(event) =>
                        setJobKind(
                          event.target.value as "Cutting" | "Treatment",
                        )
                      }
                    >
                      <option>Cutting</option>
                      <option>Treatment</option>
                    </select>
                  </label>
                  <label>
                    Workshop
                    <select
                      name="workshopId"
                      required
                      value={selectedWorkshop}
                      onChange={(event) => setJobWorkshop(event.target.value)}
                    >
                      {eligibleWorkshops.map((workshop) => (
                        <option key={workshop.id} value={workshop.id}>
                          {workshop.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Provider
                    <select
                      key={`${jobKind}-${selectedWorkshop}`}
                      name="providerId"
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select provider
                      </option>
                      {eligibleProviders.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Handover date
                    <input
                      type="date"
                      name="handoverDate"
                      required
                      defaultValue={today()}
                    />
                  </label>
                  <label>
                    Due back
                    <input type="date" name="due" defaultValue={today()} />
                  </label>
                  <label>
                    Estimated cost · LKR
                    <input type="number" name="cost" min="0" defaultValue="0" />
                  </label>
                  <label className="ops-full">
                    Job instructions
                    <textarea
                      name="notes"
                      rows={3}
                      placeholder="Required cut, expected result or treatment process"
                    />
                  </label>
                </>
              )}
              {operation === "dispatch" && (
                <>
                  <div className="ops-context">
                    {openJobs[0]?.id} · {openJobs[0]?.provider} · outgoing
                    weight {stone.weight.toFixed(2)} ct
                  </div>
                  <label>
                    Handover reference / acknowledgement
                    <input
                      name="handover"
                      placeholder="Courier reference or receiver acknowledgement"
                    />
                  </label>
                </>
              )}
              {operation === "return" && (
                <>
                  <div className="ops-context">
                    Outgoing weight {openJobs[0]?.beforeWeight.toFixed(2)} ct ·{" "}
                    {openJobs[0]?.provider}
                  </div>
                  <input
                    type="hidden"
                    name="job"
                    value={openJobs[0]?.id || ""}
                  />
                  <label>
                    Returned weight · ct
                    <input
                      type="number"
                      name="weight"
                      min="0.001"
                      max={openJobs[0]?.beforeWeight}
                      step="0.001"
                      required
                    />
                  </label>
                  <label>
                    Final job cost · LKR
                    <input
                      type="number"
                      name="cost"
                      min="0"
                      defaultValue={openJobs[0]?.cost || 0}
                    />
                  </label>
                  <label>
                    Receiving location
                    <input name="location" defaultValue="Main vault · Intake" />
                  </label>
                  {openJobs[0]?.kind === "Treatment" && (
                    <label>
                      Treatment disclosure
                      <input
                        name="treatment"
                        required
                        placeholder="e.g. Heated · dealer disclosed"
                      />
                    </label>
                  )}
                  <label className="ops-full">
                    Return inspection notes
                    <textarea name="notes" rows={2} />
                  </label>
                </>
              )}
              {operation === "custody" && (
                <>
                  <div className="ops-context">
                    Current: {stone.location} · {stone.custodian}
                  </div>
                  <label>
                    Receiving location
                    <input
                      name="location"
                      required
                      placeholder="Vault bay, display tray or facility"
                    />
                  </label>
                  <label>
                    Receiving custodian
                    <input
                      name="custodian"
                      required
                      placeholder="Person or organization"
                    />
                  </label>
                  <label className="ops-full">
                    Handover notes
                    <textarea name="notes" rows={2} />
                  </label>
                </>
              )}
              {operation === "quality" && (
                <>
                  <label>
                    Assessment / disclosure
                    <select name="outcome" defaultValue={stone.treatment}>
                      <option>Not assessed</option>
                      <option>No treatment declared</option>
                      <option>Heated · dealer disclosed</option>
                      <option>Oiled · dealer disclosed</option>
                      <option>Fracture filled · dealer disclosed</option>
                      <option>No indication of heat · laboratory report</option>
                      <option>Treatment undetermined</option>
                    </select>
                  </label>
                  <label>
                    Laboratory report reference
                    <input
                      name="report"
                      placeholder="Only if an actual report exists"
                    />
                  </label>
                  <label className="ops-full">
                    Observations
                    <textarea
                      name="notes"
                      rows={3}
                      placeholder="Methods, inclusions, measurements or findings"
                    />
                  </label>
                </>
              )}
              {operation === "hold" && (
                <label className="ops-full">
                  Reason for hold
                  <textarea
                    name="reason"
                    required
                    rows={3}
                    placeholder="e.g. Identity mismatch, damage or awaiting lab review"
                  />
                </label>
              )}
              {operation === "clear-hold" && (
                <label>
                  Resolution notes
                  <input
                    name="reason"
                    placeholder="Describe the review or corrective action"
                  />
                </label>
              )}
              {operation === "price" && (
                <>
                  <div className="ops-context">
                    Current asking price:{" "}
                    {stone.asking ? money(stone.asking) : "Not set"}
                  </div>
                  <label>
                    New asking price · LKR
                    <input
                      name="asking"
                      type="number"
                      min="1"
                      defaultValue={stone.asking || ""}
                      required
                    />
                  </label>
                  <label>
                    Reason
                    <input name="reason" placeholder="Pricing review" />
                  </label>
                </>
              )}
              {operation === "reserve" && (
                <>
                  <label>
                    Buyer
                    <input name="buyer" required placeholder="Name of buyer" />
                  </label>
                  <label>
                    Agreed price · LKR
                    <input
                      type="number"
                      name="price"
                      min="1"
                      defaultValue={stone.asking || ""}
                      required
                    />
                  </label>
                  <label>
                    Deposit received · LKR
                    <input
                      type="number"
                      name="deposit"
                      min="0"
                      defaultValue="0"
                    />
                  </label>
                  <div className="ops-context">
                    Disclosure snapshot: {stone.treatment}
                  </div>
                </>
              )}
              {operation === "release" && (
                <>
                  <div className="ops-context">
                    {reservation?.buyer} · agreed{" "}
                    {money(reservation?.price || 0)} · deposit{" "}
                    {money(reservation?.paid || 0)}. The deposit remains in the
                    audit history; record any refund separately.
                  </div>
                  <label>
                    Release reason
                    <input
                      name="reason"
                      placeholder="Reservation expired or buyer withdrew"
                    />
                  </label>
                </>
              )}
              {operation === "sale" && (
                <>
                  <label>
                    Buyer
                    <input
                      name="buyer"
                      required
                      defaultValue={reservation?.buyer || ""}
                      placeholder="Name of buyer"
                    />
                  </label>
                  <label>
                    Final sale price · LKR
                    <input
                      name="price"
                      type="number"
                      min="1"
                      required
                      defaultValue={reservation?.price || stone.asking || ""}
                    />
                  </label>
                  <label>
                    Additional payment now · LKR
                    <input
                      name="payment"
                      type="number"
                      min="0"
                      defaultValue="0"
                    />
                  </label>
                  {reservation && (
                    <div className="ops-context">
                      Deposit already received: {money(reservation.paid)}
                    </div>
                  )}
                  <div className="ops-context">
                    Buyer-facing disclosure snapshot: {stone.treatment}
                  </div>
                </>
              )}
              {operation === "payment" && (
                <>
                  <div className="ops-context">
                    {sold?.id} · outstanding{" "}
                    {money((sold?.price || 0) - (sold?.paid || 0))}
                  </div>
                  <label>
                    Amount received · LKR
                    <input
                      name="amount"
                      type="number"
                      min="1"
                      max={(sold?.price || 0) - (sold?.paid || 0)}
                      required
                    />
                  </label>
                  <label>
                    Payment method
                    <select name="method">
                      <option>Bank transfer</option>
                      <option>Cash</option>
                      <option>Card</option>
                    </select>
                  </label>
                </>
              )}
            </div>
            {error && (
              <p className="ops-form-error" role="alert">
                <AlertTriangle size={15} />
                {error}
              </p>
            )}
            <div className="ops-dialog-footer">
              <button type="button" className="ops-secondary" onClick={close}>
                Cancel
              </button>
              <button type="submit" className="primary-button">
                Confirm operation <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

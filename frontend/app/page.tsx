"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  BellRing,
  Camera,
  ClipboardCheck,
  Download,
  Eye,
  Gem,
  History,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  ShoppingBag,
  Tags,
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
  type CategoryKey,
  type Ledger,
  type Stone,
} from "./demo-data";
import { api, type AppNotification } from "./api";

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
  | "jewellery"
  | "promotions"
  | "reports"
  | "contacts"
  | "categories";
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
  | "sales-handover"
  | "sales-return"
  | "sales-complete"
  | "direct-sale"
  | "jewellery-handover"
  | "jewellery-receive"
  | "jewellery-edit"
  | "promotion-handover"
  | "promotion-return";
type PhotoDraft = {
  id?: number;
  dataUrl: string;
  captured: boolean;
};
const pageRoutes: Record<Exclude<Page, "stone">, string> = {
  dashboard: "/dashboard",
  inventory: "/stones",
  intake: "/stones/new",
  workshop: "/workshops",
  custody: "/custody",
  stocktake: "/stocktake",
  quality: "/quality",
  sales: "/salesman-trials",
  jewellery: "/jewellery",
  promotions: "/promotions",
  reports: "/reports",
  contacts: "/directory",
  categories: "/categories",
};
const nav = [
  ["dashboard", "Command centre", LayoutDashboard],
  ["inventory", "Stone register", Gem],
  ["intake", "New intake", Plus],
  ["workshop", "Cutting & treatment", WandSparkles],
  ["jewellery", "Jewellery", Gem],
  ["promotions", "Promotions", TrendingUp],
  ["custody", "Custody & locations", Truck],
  ["stocktake", "Stocktake", ClipboardCheck],
  ["quality", "Quality & exceptions", ClipboardCheck],
  ["sales", "Salesman trials", ShoppingBag],
  ["reports", "Reports", TrendingUp],
  ["contacts", "Directory", Users],
  ["categories", "Categories", Tags],
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

function notificationAge(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
  );
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function NotificationCentre({
  items,
  unread,
  pushState,
  close,
  openItem,
  markAllRead,
  enablePush,
  disablePush,
}: {
  items: AppNotification[];
  unread: number;
  pushState: "checking" | "on" | "off" | "blocked" | "unsupported" | "unavailable";
  close: () => void;
  openItem: (item: AppNotification) => void;
  markAllRead: () => void;
  enablePush: () => void;
  disablePush: () => void;
}) {
  return (
    <div className="notification-panel" role="dialog" aria-label="Notifications">
      <div className="notification-head">
        <div>
          <strong>Notifications</strong>
          <span>{unread ? `${unread} new update${unread === 1 ? "" : "s"}` : "You are all caught up"}</span>
        </div>
        <button onClick={close} aria-label="Close notifications"><X size={18} /></button>
      </div>
      {pushState === "on" ? (
        <div className="browser-alert-card is-on">
          <BellRing size={19} />
          <div>
            <strong>This device is saved</strong>
            <span>Important alerts can reach this browser after the app closes or signs out.</span>
          </div>
          <button className="quiet-action" onClick={disablePush}>Turn off</button>
        </div>
      ) : (
        <div className="browser-alert-card">
          <BellRing size={19} />
          <div>
            <strong>Get alerts on this device</strong>
            <span>
              {pushState === "blocked"
                ? "Notifications are blocked in your browser settings."
                : pushState === "unsupported"
                  ? "This browser does not support outside-app alerts."
                  : pushState === "unavailable"
                    ? "Browser alerts need one more setup step from the administrator."
                    : "See important due and overdue alerts even when the app is closed."}
            </span>
          </div>
          {(pushState === "off" || pushState === "checking") && (
            <button onClick={enablePush} disabled={pushState === "checking"}>
              {pushState === "checking" ? "Checking…" : "Turn on"}
            </button>
          )}
        </div>
      )}
      <div className="notification-tools">
        <span>Latest updates</span>
        {unread > 0 && <button onClick={markAllRead}>Mark all as read</button>}
      </div>
      <div className="notification-list">
        {items.map((item) => (
          <button
            key={item.id}
            className={`${item.read ? "" : "is-unread"} severity-${item.severity.toLowerCase()}`}
            onClick={() => openItem(item)}
          >
            <i />
            <span>
              <strong>{item.title}</strong>
              <small>{item.message}</small>
              <time>{notificationAge(item.createdAt)}</time>
            </span>
          </button>
        ))}
        {!items.length && (
          <div className="notification-empty">
            <Bell size={24} />
            <strong>No notifications yet</strong>
            <span>Important updates and approaching deadlines will appear here.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}
function browserDeviceDetails() {
  const agent = navigator.userAgent;
  const browserName = /Edg\//.test(agent)
    ? "Microsoft Edge"
    : /OPR\//.test(agent)
      ? "Opera"
      : /CriOS\//.test(agent)
        ? "Google Chrome"
        : /FxiOS\//.test(agent)
          ? "Mozilla Firefox"
          : /Chrome\//.test(agent)
            ? "Google Chrome"
            : /Firefox\//.test(agent)
              ? "Mozilla Firefox"
              : /Safari\//.test(agent)
                ? "Safari"
                : "Web browser";
  const deviceName = /iPad/.test(agent)
    ? "iPad"
    : /iPhone/.test(agent)
      ? "iPhone"
      : /Android/.test(agent)
        ? "Android device"
        : /Mobile/.test(agent)
          ? "Mobile device"
          : "Computer";
  const platformName = /Android/.test(agent)
    ? "Android"
    : /iPhone|iPad/.test(agent)
      ? "iOS or iPadOS"
      : /Mac/.test(agent)
        ? "macOS"
        : /Windows/.test(agent)
          ? "Windows"
          : /Linux/.test(agent)
            ? "Linux"
            : "Unknown platform";
  return { deviceName, browserName, platformName };
}
function Login({
  enter,
  error,
}: {
  enter: (username: string, password: string) => Promise<void>;
  error: string;
}) {
  const [submitting, setSubmitting] = useState(false);
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
            Sign in to manage your gemstone operations securely.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (submitting) return;
              const form = new FormData(e.currentTarget);
              setSubmitting(true);
              try {
                await enter(
                  txt(form.get("username")),
                  txt(form.get("password")),
                );
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <label>
              Username
              <input
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={80}
                disabled={submitting}
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                maxLength={200}
                disabled={submitting}
                required
              />
            </label>
            {error && <div className="ops-form-error">{error}</div>}
            <button
              className="primary-button login-button"
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Sign in"}{" "}
              {!submitting && <ArrowRight size={18} />}
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
export default function Home({
  initialPage = "dashboard",
  initialStoneId = "",
  initialJewelleryId = "",
  initialEditing = "",
  loginPage = false,
  postLoginPath = "/dashboard",
}: {
  initialPage?: Page;
  initialStoneId?: string;
  initialJewelleryId?: string;
  initialEditing?: string;
  loginPage?: boolean;
  postLoginPath?: string;
}) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false),
    [authChecking, setAuthChecking] = useState(true),
    [page, setPage] = useState<Page>(initialPage),
    [ledger, setLedger] = useState<Ledger>(emptyLedger),
    [selected, setSelected] = useState(initialStoneId),
    [operation, setOperation] = useState<Operation | null>(null),
    [target, setTarget] = useState(""),
    [stoneLocked, setStoneLocked] = useState(false),
    [notice, setNotice] = useState(""),
    [menu, setMenu] = useState(false),
    [sidebarCollapsed, setSidebarCollapsed] = useState(false),
    [search, setSearch] = useState(""),
    [counted, setCounted] = useState<string[]>([]),
    [editing, setEditing] = useState<string | null>(initialEditing || null),
    [notifications, setNotifications] = useState<AppNotification[]>([]),
    [notificationOpen, setNotificationOpen] = useState(false),
    [devicePromptOpen, setDevicePromptOpen] = useState(false),
    [savedDevice, setSavedDevice] = useState(false),
    [pushState, setPushState] = useState<
      "checking" | "on" | "off" | "blocked" | "unsupported" | "unavailable"
    >("checking");
  const toggleSidebar = () => setSidebarCollapsed((current) => !current);
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
      fail(error, "We could not open your information. Please try again.");
    }
  };
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await api.session();
        const data = await api.ledger();
        if (!active) return;
        setLedger(data);
        const jewelleryStoneId = initialJewelleryId
          ? data.jewelleryProfiles.find((profile) => profile.id === initialJewelleryId)?.stoneId
          : "";
        setSelected((current) => current || jewelleryStoneId || data.stones[0]?.id || "");
        if (initialPage === "stone" && initialStoneId) {
          const converted = data.jewelleryProfiles.find(
            (profile) => profile.stoneId === initialStoneId,
          );
          if (converted) {
            setPage("jewellery");
            router.replace(`/jewellery/${encodeURIComponent(converted.id)}`);
          }
        }
        setLoggedIn(true);
        if (sessionStorage.getItem("origin:ask-save-device") === "yes") {
          sessionStorage.removeItem("origin:ask-save-device");
          setDevicePromptOpen(true);
        }
        if (loginPage) router.replace(postLoginPath);
      } catch {
        if (!active) return;
        setLoggedIn(false);
        if (!loginPage) router.replace("/login");
      } finally {
        if (active) setAuthChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [initialJewelleryId, initialPage, initialStoneId, loginPage, postLoginPath, router]);
  useEffect(() => {
    const unauthorized = () => {
      setLoggedIn(false);
      router.replace("/login");
    };
    window.addEventListener("origin:unauthorized", unauthorized);
    return () =>
      window.removeEventListener("origin:unauthorized", unauthorized);
  }, [router]);
  useEffect(() => {
    if (!loggedIn) return;
    let active = true;
    const loadNotifications = async () => {
      try {
        const result = await api.notifications();
        if (active) setNotifications(result.items);
      } catch {
        // The main workspace remains usable if notification refresh fails.
      }
    };
    void loadNotifications();
    const timer = window.setInterval(() => void loadNotifications(), 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [loggedIn]);
  useEffect(() => {
    if (!loggedIn) return;
    void Promise.resolve().then(async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setPushState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setPushState("blocked");
        return;
      }
      try {
        await navigator.serviceWorker.register("/sw.js");
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const status = await api.pushSubscriptionStatus(subscription.endpoint);
          setSavedDevice(status.saved);
          setPushState(status.saved ? "on" : "off");
          if (status.saved) setDevicePromptOpen(false);
        } else {
          setSavedDevice(false);
          setPushState("off");
        }
      } catch {
        setPushState("unsupported");
      }
    });
  }, [loggedIn]);
  const navigate = (p: Page, id?: string) => {
    const jewellery = id
      ? ledger.jewelleryProfiles.find((profile) => profile.stoneId === id)
      : undefined;
    const nextPage = p === "stone" && jewellery ? "jewellery" : p;
    if (id) setSelected(id);
    setPage(nextPage);
    setMenu(false);
    setSearch("");
    setEditing(null);
    router.push(
      nextPage === "jewellery" && id
        ? `/jewellery/${encodeURIComponent(jewellery?.id ?? id)}`
        : nextPage === "stone" && id
          ? `/stones/${encodeURIComponent(id)}`
          : pageRoutes[nextPage as Exclude<Page, "stone">],
    );
  };
  const edit = (id: string) => {
    setSelected(id);
    setEditing(id);
    setPage("intake");
    setMenu(false);
    setSearch("");
    router.push(`/stones/${encodeURIComponent(id)}/edit`);
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
    setStoneLocked(page === "stone");
    setNotice("");
    setOperation(op);
  };
  const flash = (message: string) => {
    setNotice("");
    toast.success(message);
  };
  const enableBrowserAlerts = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushState("unsupported");
      toast.error("This browser cannot show alerts outside the app.");
      return;
    }
    setPushState("checking");
    try {
      const config = await api.pushConfig();
      if (!config.available || !config.publicKey) {
        setPushState("unavailable");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "blocked" : "off");
        toast.error("Browser alerts were not turned on. You can try again later.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const ready = await navigator.serviceWorker.ready;
      const existing = await ready.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(config.publicKey),
        }));
      await api.savePushSubscription(subscription.toJSON(), {
        ...browserDeviceDetails(),
        persistAfterLogout: true,
      });
      setSavedDevice(true);
      setDevicePromptOpen(false);
      setPushState("on");
      toast.success("This device is saved. Important alerts can reach you after the app closes.");
    } catch (error) {
      setPushState("off");
      fail(error, "We could not turn on browser alerts. Please try again.");
    }
  };
  const disableBrowserAlerts = async () => {
    try {
      const registration = "serviceWorker" in navigator
        ? await navigator.serviceWorker.ready.catch(() => null)
        : null;
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await api.removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSavedDevice(false);
      setPushState("off");
      toast.success("Browser alerts are off on this device.");
    } catch (error) {
      fail(error, "We could not turn off browser alerts. Please try again.");
    }
  };
  const openNotification = async (item: AppNotification) => {
    setNotifications((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, read: true } : entry,
      ),
    );
    setNotificationOpen(false);
    if (!item.read) {
      try {
        await api.markNotificationRead(item.id);
      } catch {
        // Opening the destination is more important than blocking on read state.
      }
    }
    router.push(item.actionUrl || "/dashboard");
  };
  const markAllNotificationsRead = async () => {
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true })),
    );
    try {
      await api.markAllNotificationsRead();
    } catch (error) {
      fail(error, "We could not mark the notifications as read.");
    }
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
      flash("Done. Your changes have been saved.");
    } catch (error) {
      fail(error, "We could not save that change. Please try again.");
    }
  };
  const saveStone = async (
    form: FormData,
    photos: PhotoDraft[],
    removedImageIds: number[],
    requestKey: string,
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
      return false;
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
        sellerImages: txt(form.get("sellerImages"))
          ? JSON.parse(txt(form.get("sellerImages")))
          : [],
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
        : await api.intake(payload, requestKey);
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
      return true;
    } catch (error) {
      fail(error, "We could not register this stone. Please check the details and try again.");
      return false;
    }
  };
  const saveStoneBatch = async (
    stones: Array<Record<string, unknown>>,
  ) => {
    try {
      const result = await api.batchIntake(stones);
      await refresh();
      navigate("inventory");
      flash(`${result.count} stones registered together in MySQL.`);
    } catch (error) {
      fail(error, "We could not register these stones. Please check the details and try again.");
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
      .catch((error) => fail(error, "We could not save this stock check. Please try again."));
  };
  if (authChecking)
    return (
      <main className="auth-loading" aria-label="Checking secure session">
        <Brand />
        <span>Opening secure workspace…</span>
      </main>
    );
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
            sessionStorage.setItem("origin:ask-save-device", "yes");
            setDevicePromptOpen(true);
            setPage("dashboard");
            router.replace(postLoginPath);
            toast.success("Welcome back. The workspace is ready.");
          } catch (error) {
            fail(error, "We could not sign you in. Please check your details and try again.");
          }
        }}
      />
    );
  const signOut = async () => {
    try {
      if (!savedDevice && "serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready.catch(() => null);
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await api.removePushSubscription(subscription.endpoint).catch(() => undefined);
          await subscription.unsubscribe().catch(() => false);
        }
      }
      await api.logout();
      setLedger(emptyLedger);
      setLoggedIn(false);
      setNotifications([]);
      router.replace("/login");
      toast.success("Signed out safely.");
    } catch (error) {
      fail(error, "We could not sign you out. Please try again.");
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
      <aside className={`sidebar ${menu ? "sidebar-open" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="side-head">
          <Brand />
          <button className="sidebar-close-button" onClick={() => setMenu(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
          <button
            className="sidebar-collapse-button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
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
              title={sidebarCollapsed ? label : undefined}
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
            <div className="notification-anchor">
              <button
                className="notification-button"
                onClick={() => setNotificationOpen((value) => !value)}
                aria-label={`${notifications.filter((item) => !item.read).length} unread notifications`}
                aria-expanded={notificationOpen}
              >
                <Bell size={19} />
                {notifications.some((item) => !item.read) && (
                  <b>{Math.min(99, notifications.filter((item) => !item.read).length)}</b>
                )}
              </button>
              {notificationOpen && (
                <NotificationCentre
                  items={notifications}
                  unread={notifications.filter((item) => !item.read).length}
                  pushState={pushState}
                  close={() => setNotificationOpen(false)}
                  openItem={(item) => void openNotification(item)}
                  markAllRead={() => void markAllNotificationsRead()}
                  enablePush={() => void enableBrowserAlerts()}
                  disablePush={() => void disableBrowserAlerts()}
                />
              )}
            </div>
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
              saveStoneBatch={saveStoneBatch}
              navigate={navigate}
              sellers={ledger.sellers}
              categories={ledger.categories}
              refresh={refresh}
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
          ) : page === "jewellery" ? (
            <Jewellery
              ledger={ledger}
              stone={stone}
              actions={actions}
              refresh={refresh}
            />
          ) : page === "promotions" ? (
            <Promotions ledger={ledger} actions={actions} />
          ) : page === "reports" ? (
            <Reports ledger={ledger} actions={actions} />
          ) : page === "categories" ? (
            <Categories ledger={ledger} refresh={refresh} />
          ) : (
            <Directory ledger={ledger} refresh={refresh} />
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
          stoneLocked={stoneLocked}
          close={() => {
            setOperation(null);
            setNotice("");
          }}
          stone={ledger.stones.find((s) => s.id === target) || stone}
          ledger={ledger}
          refresh={refresh}
          submit={submitOperation}
          error={operation ? notice : ""}
        />
      )}
      <Dialog open={devicePromptOpen} onOpenChange={setDevicePromptOpen}>
        <DialogContent
          className="device-save-dialog"
          showCloseButton={false}
          style={{
            width: "min(520px, calc(100vw - 24px))",
            maxWidth: "none",
            maxHeight: "calc(100dvh - 24px)",
            overflowY: "auto",
            gap: 18,
            border: "1px solid #d5e0da",
            borderRadius: 24,
            background: "#fbfcfa",
            padding: "clamp(18px, 5vw, 30px)",
            color: "#17251f",
            boxShadow: "0 30px 90px #102b2250",
          }}
        >
          <div
            className="device-save-icon"
            style={{
              display: "grid",
              width: 52,
              height: 52,
              flex: "0 0 52px",
              placeItems: "center",
              borderRadius: 16,
              background: "#e4f2eb",
              color: "#1c614e",
            }}
          ><BellRing size={25} /></div>
          <DialogHeader style={{ display: "flex", gap: 8 }}>
            <DialogTitle style={{ font: "600 clamp(23px, 6vw, 26px)/1.15 Georgia, serif" }}>
              Save this device for alerts?
            </DialogTitle>
            <DialogDescription style={{ color: "#607169", fontSize: 13, lineHeight: 1.65 }}>
              Origin can remember this browser so important deadlines and overdue work can reach you even after the app closes or your session ends.
            </DialogDescription>
          </DialogHeader>
          <div
            className="device-save-summary"
            style={{
              display: "grid",
              gap: 1,
              overflow: "hidden",
              border: "1px solid #dce4df",
              borderRadius: 15,
              background: "#dce4df",
            }}
          >
            <div style={{ display: "grid", gap: 4, background: "#fff", padding: "14px 16px" }}>
              <strong style={{ color: "#274f43", fontSize: 12 }}>What is saved</strong>
              <span style={{ color: "#68766f", fontSize: 11, lineHeight: 1.55 }}>Your device type, browser name and a secure notification address.</span>
            </div>
            <div style={{ display: "grid", gap: 4, background: "#fff", padding: "14px 16px" }}>
              <strong style={{ color: "#274f43", fontSize: 12 }}>What is never saved</strong>
              <span style={{ color: "#68766f", fontSize: 11, lineHeight: 1.55 }}>Your password, photos, files and exact location are not collected.</span>
            </div>
          </div>
          <p
            className="device-save-note"
            style={{
              margin: 0,
              borderRadius: 12,
              background: "#f0f4f1",
              padding: "11px 13px",
              color: "#68766f",
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >Your browser will ask for notification permission next. You can turn alerts off at any time from Notifications.</p>
          <div className="device-save-actions" style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 10 }}>
            <button className="secondary-button" style={{ flex: "1 1 110px" }} onClick={() => setDevicePromptOpen(false)}>Not now</button>
            <button className="primary-button" style={{ flex: "1.4 1 170px" }} onClick={() => void enableBrowserAlerts()}>
              Save this device <ArrowRight size={17} />
            </button>
          </div>
        </DialogContent>
      </Dialog>
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
    requestKey: string,
  ) => Promise<boolean>;
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
  const image = stone.images[0];
  return (
    <button
      className="ops-stone-link"
      onClick={() => navigate("stone", stone.id)}
    >
      <span
        className={`gem-swatch ${image ? "has-image" : stone.type.toLowerCase().replaceAll(" ", "-")}`}
      >
        {image ? (
          <Image
            unoptimized
            width={120}
            height={120}
            src={image.url}
            alt={`${stone.type} thumbnail`}
          />
        ) : (
          <Gem size={23} />
        )}
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
    activeJewellery = ledger.jewelleryJobs.filter(
      (job) => job.status === "With workshop",
    ),
    activePromotions = ledger.promotionHandovers.filter(
      (handover) => handover.status === "With company",
    ),
    activeSalesmanHandovers = ledger.salesmanHandovers.filter(
      (handover) => handover.status === "With salesman",
    ),
    salesmanRevenue = ledger.salesmanHandovers
      .filter((handover) => handover.status === "Sold")
      .reduce((total, handover) => total + handover.finalPrice, 0),
    directRevenue = ledger.directSales.reduce(
      (total, sale) => total + sale.finalPrice,
      0,
    );
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dueDays = (date: string) =>
    Math.round(
      (new Date(`${date}T00:00:00`).getTime() - startOfToday.getTime()) /
        86_400_000,
    );
  const dueLabel = (days: number) =>
    days < 0
      ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
      : days === 0
        ? "Due today"
        : days === 1
          ? "Due tomorrow"
          : days === 2
            ? "Due in 2 days"
            : `Due in ${days} days`;
  type DueItem = {
    id: string;
    stoneId: string;
    title: string;
    owner: string;
    kind: "workshop" | "jewellery" | "promotion" | "salesman";
    due: string;
    days: number;
    action: string;
    run: () => void;
  };
  const dueItems: DueItem[] = [
    ...openJobs
      .filter((job) => Boolean(job.due))
      .map((job) => ({
        id: job.id,
        stoneId: job.stoneId,
        title: `${job.kind} · ${job.id}`,
        owner: `${job.workshop} · ${job.provider}`,
        kind: "workshop" as const,
        due: job.due,
        days: dueDays(job.due),
        action: job.status === "Pending dispatch" ? "Dispatch" : "Receive",
        run: () =>
          actions.open(
            job.status === "Pending dispatch" ? "dispatch" : "return",
            job.stoneId,
          ),
      })),
    ...activeJewellery.map((job) => ({
      id: job.id,
      stoneId: job.stoneId,
      title: `Jewellery · ${job.id}`,
      owner: job.workshop,
      kind: "jewellery" as const,
      due: job.deadline,
      days: dueDays(job.deadline),
      action: "Receive",
      run: () => actions.open("jewellery-receive", job.stoneId),
    })),
    ...activePromotions.map((handover) => ({
      id: handover.id,
      stoneId: handover.stoneId,
      title: `Promotion · ${handover.company}`,
      owner: "Promotion company",
      kind: "promotion" as const,
      due: handover.deadline,
      days: dueDays(handover.deadline),
      action: "Receive",
      run: () => actions.open("promotion-return", handover.stoneId),
    })),
    ...activeSalesmanHandovers.map((handover) => ({
      id: handover.id,
      stoneId: handover.stoneId,
      title: `Sales trial · ${handover.salesman}`,
      owner: `${money(handover.quotedPrice)} quoted`,
      kind: "salesman" as const,
      due: handover.deadline,
      days: dueDays(handover.deadline),
      action: "Review",
      run: () => actions.navigate("sales"),
    })),
  ].sort((a, b) => a.days - b.days);
  const priorityItems = dueItems.filter((item) => item.days <= 2);
  const overdueItems = priorityItems.filter((item) => item.days < 0);
  const heldStones = ledger.stones.filter((stone) => stone.status === "On Hold");
  const ongoingCount =
    openJobs.length +
    activeJewellery.length +
    activePromotions.length +
    activeSalesmanHandovers.length;
  const completedJobCost = ledger.jobs
    .filter((job) => job.status === "Returned")
    .reduce((total, job) => total + job.cost, 0);
  const soldRecords = [
    ...ledger.salesmanHandovers
      .filter((handover) => handover.status === "Sold")
      .map((handover) => ({
        stoneId: handover.stoneId,
        value: handover.finalPrice,
      })),
    ...ledger.directSales.map((sale) => ({
      stoneId: sale.stoneId,
      value: sale.finalPrice,
    })),
  ];
  const soldCost = soldRecords.reduce(
    (total, sale) =>
      total +
      (ledger.stones.find((stone) => stone.id === sale.stoneId)?.purchase ?? 0) +
      ledger.jobs
        .filter(
          (job) => job.stoneId === sale.stoneId && job.status === "Returned",
        )
        .reduce((jobTotal, job) => jobTotal + job.cost, 0),
    0,
  );
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
          <span>Active inventory</span>
          <strong>{active.length}</strong>
          <small>
            {active.reduce((n, s) => n + s.weight, 0).toFixed(2)} total carats
          </small>
        </div>
        <div className="metric">
          <span>Ongoing operations</span>
          <strong>{ongoingCount}</strong>
          <small>Across workshops, sales, jewellery and promotions</small>
        </div>
        <div className={`metric ${priorityItems.length ? "warning" : ""}`}>
          <span>Needs attention</span>
          <strong>{priorityItems.length + heldStones.length}</strong>
          <small>
            {overdueItems.length} overdue · {priorityItems.length - overdueItems.length} due soon · {heldStones.length} on hold
          </small>
        </div>
        <div className="metric">
          <span>Recorded sales</span>
          <strong>{money(salesmanRevenue + directRevenue)}</strong>
          <small>Final recorded selling prices</small>
        </div>
      </div>
      {(priorityItems.length > 0 || heldStones.length > 0) && (
        <Panel
          title="Attention needed"
          sub="Shown from two days before a deadline, with overdue work first"
          aside={
            <span className="dashboard-alert-count">
              <AlertTriangle size={15} /> {priorityItems.length + heldStones.length}
            </span>
          }
        >
          <div className="dashboard-priority-list">
            {priorityItems.map((item) => {
              const source = ledger.stones.find(
                (stone) => stone.id === item.stoneId,
              );
              return (
                <article
                  className={`dashboard-priority ${item.days < 0 ? "is-overdue" : "is-due"}`}
                  key={`${item.kind}-${item.id}`}
                >
                  <span className="dashboard-priority-icon">
                    <AlertTriangle size={18} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {source?.type ?? item.stoneId} · {item.stoneId} · {item.owner}
                    </small>
                  </div>
                  <span className="dashboard-due-copy">
                    <strong>{dueLabel(item.days)}</strong>
                    <small>{item.due}</small>
                  </span>
                  <button type="button" onClick={item.run}>
                    {item.action} <ArrowRight size={14} />
                  </button>
                </article>
              );
            })}
            {heldStones.map((held) => (
              <article className="dashboard-priority is-held" key={held.id}>
                <span className="dashboard-priority-icon">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <strong>Quality hold · {held.type}</strong>
                  <small>
                    {held.productId} · {held.id} · unavailable for operations
                  </small>
                </div>
                <span className="dashboard-due-copy">
                  <strong>Review required</strong>
                  <small>{held.location}</small>
                </span>
                <button
                  type="button"
                  onClick={() => actions.navigate("quality")}
                >
                  Review <ArrowRight size={14} />
                </button>
              </article>
            ))}
          </div>
        </Panel>
      )}
      <div className="ops-two">
        <Panel
          title="Ongoing operations"
          sub={`${ongoingCount} item${ongoingCount === 1 ? "" : "s"} currently outside normal available stock`}
        >
          <div className="dashboard-operation-groups">
            {[
              ["Cutting & treatment", openJobs.length, "workshop" as Page],
              ["Jewellery production", activeJewellery.length, "jewellery" as Page],
              ["Promotion handovers", activePromotions.length, "promotions" as Page],
              ["Salesman trials", activeSalesmanHandovers.length, "sales" as Page],
            ].map(([label, count, destination]) => (
              <button
                className="dashboard-operation-card"
                key={String(label)}
                onClick={() => actions.navigate(destination as Page)}
              >
                <span>{label}</span>
                <strong>{count}</strong>
                <small>
                  {Number(count) ? "Open register" : "Nothing outstanding"}
                  <ArrowRight size={14} />
                </small>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Expected back" sub="Upcoming returns, ordered by deadline">
          <div className="dashboard-expected-list">
            {dueItems.slice(0, 5).map((item) => (
              <button key={`${item.kind}-${item.id}`} onClick={item.run}>
                <span className={`dashboard-kind kind-${item.kind}`}>
                  {item.kind === "workshop"
                    ? "Workshop"
                    : item.kind === "jewellery"
                      ? "Jewellery"
                      : item.kind === "promotion"
                        ? "Promotion"
                        : "Sales trial"}
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.stoneId} · {item.owner}</small>
                </span>
                <span className={item.days < 0 ? "is-late" : ""}>
                  <strong>{dueLabel(item.days)}</strong>
                  <small>{item.due}</small>
                </span>
              </button>
            ))}
            {!dueItems.length && (
              <p className="ops-empty">Nothing is currently due back.</p>
            )}
          </div>
        </Panel>
      </div>
      <div className="ops-two dashboard-lower-grid">
        <Panel title="Quick operations" sub="Start common work without searching">
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
            <Action
              onClick={() => actions.navigate("jewellery")}
              sub="Create or receive pieces"
            >
              Jewellery work
            </Action>
            <Action
              onClick={() => actions.navigate("sales")}
              sub="Handover, return or sale"
            >
              Salesman trial
            </Action>
            <Action
              onClick={() => actions.navigate("promotions")}
              sub="Company handovers"
            >
              Promotions
            </Action>
            <Action
              onClick={() => actions.navigate("stocktake")}
              sub="Verify physical inventory"
            >
              Run stocktake
            </Action>
          </div>
        </Panel>
        <Panel title="Financial snapshot" sub="Live values from completed records">
          <div className="dashboard-finance-grid">
            <div>
              <span>Active stock cost</span>
              <strong>
                {money(active.reduce((total, stone) => total + stone.purchase, 0))}
              </strong>
            </div>
            <div>
              <span>Completed workshop cost</span>
              <strong>{money(completedJobCost)}</strong>
            </div>
            <div>
              <span>Recorded sales</span>
              <strong>{money(salesmanRevenue + directRevenue)}</strong>
            </div>
            <div className="accent-value">
              <span>Gross result</span>
              <strong>
                {money(salesmanRevenue + directRevenue - soldCost)}
              </strong>
            </div>
          </div>
          <button
            type="button"
            className="dashboard-report-link"
            onClick={() => actions.navigate("reports")}
          >
            Open full commercial report <ArrowRight size={15} />
          </button>
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

function auditLabel(value: string) {
  const labels: Record<string, string> = {
    submittedValues: "Information entered",
    stoneChanges: "What changed",
    changes: "What changed",
    values: "Stone details recorded",
    before: "Before this action",
    after: "After this action",
    uploaded: "Images added",
    imageCount: "Number of images",
    productId: "Product ID",
    gemType: "Gem type",
    currentWeight: "Current weight",
    intakeWeight: "Intake weight",
    cutStyle: "Cut",
    purchaseCost: "Purchase cost",
    treatmentDisclosure: "Treatment",
    certificateReference: "Certificate reference",
    acquiredOn: "Purchase date",
    metalType: "Metal",
    metalPurity: "Purity / karats",
    handedOverAt: "Handed over on",
    finalPrice: "Final selling price",
    workshopId: "Workshop record",
    providerId: "Provider record",
    sellerId: "Supplier record",
    stoneId: "Stone ID",
    mimeType: "Image format",
  };
  if (labels[value]) return labels[value];
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function auditValue(value: unknown, key = ""): string {
  if (value === null || value === undefined || value === "") return "Not recorded";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (/weight/i.test(key)) return `${value.toLocaleString("en-LK")} ${/metal|total/i.test(key) ? "g" : "ct"}`;
    if (/cost|price|asking|payment|amount/i.test(key)) return money(value);
    return value.toLocaleString("en-LK");
  }
  if (typeof value === "string" && /^[A-Z][A-Z_]+$/.test(value))
    return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
  if (typeof value === "object") return "Recorded details";
  return String(value);
}

function AuditValueRows({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <div className="audit-item-list">
        {value.map((item, index) => (
          <div className="audit-list-item" key={index}>
            <b>{value.length === 1 ? "Image" : `Item ${index + 1}`}</b>
            <AuditValueRows value={item} />
          </div>
        ))}
      </div>
    );
  }
  if (value && typeof value === "object") {
    return (
      <div className="audit-value-grid">
        {Object.entries(value as Record<string, unknown>)
          .filter(([key]) => key !== "askingPrice")
          .map(([key, item]) => {
          const change = item && typeof item === "object" && !Array.isArray(item)
            ? item as Record<string, unknown>
            : null;
          return (
            <div key={key}>
              <span>{auditLabel(key)}</span>
              {change && "from" in change && "to" in change ? (
                <strong className="audit-change"><del>{auditValue(change.from, key)}</del><i>to</i>{auditValue(change.to, key)}</strong>
              ) : Array.isArray(item) || (item && typeof item === "object") ? (
                <AuditValueRows value={item} />
              ) : (
                <strong>{auditValue(item, key)}</strong>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return <strong>{auditValue(value)}</strong>;
}

function AuditDetails({ details }: { details: Record<string, unknown> }) {
  const groups = Object.entries(details).filter(
    ([key]) => !["detail", "performedBy"].includes(key),
  );
  if (!groups.length) return null;
  return (
    <details className="audit-details">
      <summary>Show details</summary>
      <div className="audit-groups">
        {groups.map(([groupName, groupValue]) => {
          return (
            <section key={groupName}>
              <h4>{auditLabel(groupName)}</h4>
              <AuditValueRows value={groupValue} />
            </section>
          );
        })}
      </div>
    </details>
  );
}

function lifecycleLabel(value: string) {
  const labels: Record<string, string> = {
    INTAKE: "Stone received",
    RECORD_UPDATE: "Details updated",
    IMAGE_UPLOAD: "Images added",
    IMAGE_REMOVAL: "Image removed",
    JEWELLERY_IMAGE_UPLOAD: "Jewellery images added",
    JEWELLERY_IMAGE_REMOVAL: "Jewellery image removed",
    CUSTODY: "Custody update",
    QUALITY: "Quality check",
    JOB: "Workshop job",
    DISPATCH: "Sent to workshop",
    RETURN: "Received from workshop",
    SALES_HANDOVER: "Given to salesman",
    SALES_RETURN: "Received from salesman",
    SALES_COMPLETE: "Sold by salesman",
    DIRECT_SALE: "Direct sale",
    JEWELLERY_HANDOVER: "Sent for jewellery",
    JEWELLERY_RECEIVE: "Jewellery received",
    JEWELLERY_EDIT: "Jewellery updated",
    PROMOTION_HANDOVER: "Given for promotion",
    PROMOTION_RETURN: "Received from promotion",
    HOLD: "Placed on hold",
    CLEAR_HOLD: "Hold removed",
    STOCKTAKE: "Stock verified",
    PRICE: "Price updated",
    PAYMENT: "Payment received",
  };
  return labels[value] ?? auditLabel(value.toLowerCase());
}

function lifecycleSummary(event: Event) {
  const summaries: Record<string, string> = {
    INTAKE: "The stone was added with its starting details, source and purchase information.",
    RECORD_UPDATE: "The stone details were updated.",
    IMAGE_UPLOAD: "New photos were added to this stone.",
    IMAGE_REMOVAL: "A photo was removed from this stone.",
    JEWELLERY_IMAGE_UPLOAD: "New jewellery photos were added.",
    JEWELLERY_IMAGE_REMOVAL: "A jewellery photo was removed.",
    CUSTODY: "The location or person responsible for this stone changed.",
    QUALITY: "A quality or treatment check was recorded.",
    STOCKTAKE: "The stone was physically checked during stocktake.",
  };
  return summaries[event.category] ?? event.detail;
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
    directSales = ledger.directSales.filter(
      (sale) => sale.stoneId === stone.id,
    ),
    cost =
      stone.purchase +
      jobs
        .filter((j) => j.status === "Returned")
        .reduce((n, j) => n + j.cost, 0);
  const qrSvg = () =>
    document.getElementById(`stone-qr-${stone.id}`)?.querySelector("svg");
  const downloadQr = () => {
    const svg = qrSvg();
    if (!svg) return;
    const content = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(
      new Blob([content], { type: "image/svg+xml;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${stone.productId}-QR.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const printQr = () => {
    const svg = qrSvg();
    if (!svg) return;
    const printWindow = window.open("", "_blank", "width=520,height=650");
    if (!printWindow) {
      toast.error("Allow pop-ups to print the QR code.");
      return;
    }
    const qr = new XMLSerializer().serializeToString(svg);
    printWindow.document.write(`<!doctype html><html><head><title>${stone.productId} QR</title><style>@page{margin:18mm}body{font-family:Arial,sans-serif;display:grid;place-items:center;text-align:center;margin:0}.label{padding:24px}.qr{width:280px;height:280px;margin:auto}h1{font-size:20px;margin:18px 0 5px}p{font-size:13px;margin:0;color:#475569}</style></head><body><div class="label"><div class="qr">${qr}</div><h1>${stone.productId}</h1><p>${stone.id} · ${stone.type}</p></div><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script></body></html>`);
    printWindow.document.close();
  };
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
            title="Stone history"
            sub={`${events.length} permanent ${events.length === 1 ? "entry" : "entries"} · a complete record of actions, custody and changes`}
          >
            {events.map((e) => (
              <div className="ops-timeline-row" key={e.id}>
                <span className="ops-timeline-icon">
                  <History size={16} />
                </span>
                <div>
                  <div>
                    <strong>{e.title}</strong>
                    <span className="audit-kind">{lifecycleLabel(e.category)}</span>
                  </div>
                  <p>{lifecycleSummary(e)}</p>
                  <AuditDetails details={e.details} />
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
              {directSales.map((sale) => (
                <div key={sale.id}>
                  <span>
                    <strong>{sale.id} · Direct sale</strong>
                    <small>
                      {sale.buyer} ·{" "}
                      {sale.buyerPhone ||
                        sale.buyerEmail ||
                        "Contact details not supplied"}
                    </small>
                  </span>
                  <span>{money(sale.finalPrice)}</span>
                </div>
              ))}
              {jobs.length + salesmanHandovers.length + directSales.length ===
                0 && <p>No jobs or transactions yet.</p>}
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
                id={`stone-qr-${stone.id}`}
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
              <div className="qr-actions">
                <button type="button" className="ops-secondary" onClick={downloadQr}>
                  <Download size={16} /> Download QR
                </button>
                <button type="button" className="ops-secondary" onClick={printQr}>
                  <Printer size={16} /> Print QR
                </button>
              </div>
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
                  <Action onClick={() => actions.open("direct-sale", stone.id)}>
                    Record direct sale
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
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
}

const categoryLabels: Record<CategoryKey, string> = {
  GEM_TYPE: "Gem types",
  ORIGIN: "Origins & localities",
  SHAPE: "Shapes",
  CUT: "Cut types",
  COLOR: "Colours",
  TREATMENT: "Treatments",
  METAL: "Jewellery metals",
  METAL_PURITY: "Metal purities",
  PAYMENT_METHOD: "Payment methods",
};

type DetailOption = {
  value: string;
  label: string;
  subtitle?: string;
  details?: Array<[string, string]>;
  images?: string[];
};

function DetailedSelect({
  name,
  options,
  defaultValue = "",
  value,
  required = false,
  disabled = false,
  placeholder = "Select an item",
  onValueChange,
}: {
  name?: string;
  options: DetailOption[];
  defaultValue?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onValueChange?: (value: string) => void;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [previewOpen, setPreviewOpen] = useState(false);
  const selectedValue = value ?? internalValue;
  const selected = options.find((option) => option.value === selectedValue);
  const change = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  return (
    <div className="detailed-select">
      <select
        name={name}
        value={selectedValue}
        required={required}
        disabled={disabled}
        onChange={(event) => change(event.target.value)}
      >
        <option value="" disabled={required}>{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="detail-preview-button"
        aria-label={selected ? `View details for ${selected.label}` : "Select an item to view details"}
        title={selected ? "View full details" : "Select an item first"}
        disabled={!selected}
        onClick={() => setPreviewOpen(true)}
      >
        <Eye size={18} />
      </button>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="detail-preview-dialog" overlayClassName="detail-preview-overlay" showCloseButton={false}>
          <div className="detail-preview-header">
            <div className="detail-preview-icon"><Eye size={21} /></div>
            <DialogHeader>
              <DialogDescription>{selected?.subtitle || "Full record details"}</DialogDescription>
              <DialogTitle>{selected?.label ?? "Item details"}</DialogTitle>
            </DialogHeader>
            <button type="button" className="detail-preview-close" onClick={() => setPreviewOpen(false)} aria-label="Close details"><X size={20} /></button>
          </div>
          {!!selected?.images?.length && (
            <section className="detail-preview-section">
              <h3>Images</h3>
              <div className="detail-preview-images">
                {selected.images.map((source, index) => (
                  <Image key={`${source.slice(0, 40)}-${index}`} src={source} alt={`${selected.label} image ${index + 1}`} width={240} height={240} unoptimized />
                ))}
              </div>
            </section>
          )}
          <section className="detail-preview-section">
            <h3>Saved details</h3>
            <div className="detail-preview-grid">
              {(selected?.details ?? []).map(([label, detail]) => (
                <div key={label}><span>{label}</span><strong>{detail || "Not recorded"}</strong></div>
              ))}
            </div>
          </section>
          <div className="detail-preview-footer"><button type="button" className="primary-button" onClick={() => setPreviewOpen(false)}>Done</button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategorySelect({
  name,
  categoryKey,
  categories,
  defaultValue = "",
  required = false,
  placeholder,
  refresh,
}: {
  name: string;
  categoryKey: CategoryKey;
  categories: Ledger["categories"];
  defaultValue?: string;
  required?: boolean;
  placeholder: string;
  refresh: () => Promise<void>;
}) {
  const [value, setValue] = useState(defaultValue);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const options = categories.filter((item) => item.categoryKey === categoryKey);
  return (
    <div className="category-control">
      <div className="category-select-row">
        <DetailedSelect
          name={name}
          value={value}
          required={required}
          placeholder={placeholder}
          onValueChange={setValue}
          options={options.map((item) => ({
            value: item.name,
            label: item.name,
            subtitle: categoryLabels[categoryKey],
            details: [["Category", categoryLabels[categoryKey]], ["Description", item.description]],
          }))}
        />
        <button
          type="button"
          className="category-add-button"
          aria-label={`Add ${categoryLabels[categoryKey]}`}
          onClick={() => setAdding((current) => !current)}
        >
          <Plus size={17} />
        </button>
      </div>
      {adding && (
        <div className="category-inline-add">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={`New ${categoryLabels[categoryKey].toLowerCase().replace(/s$/, "")}`}
            autoFocus
          />
          <button
            type="button"
            className="ops-secondary"
            onClick={() => {
              if (!newName.trim()) return;
              void api
                .addCategory({ categoryKey, name: newName.trim() })
                .then(async (created) => {
                  setValue(created.name);
                  setNewName("");
                  setAdding(false);
                  await refresh();
                  toast.success(`${created.name} added to ${categoryLabels[categoryKey].toLowerCase()}.`);
                })
                .catch((error) => toast.error(error instanceof Error ? error.message : "Category could not be added"));
            }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

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

type BatchIntakeRow = { id: string };

function SubmissionProgress({ label }: { label: string }) {
  return (
    <div className="submission-progress" role="status" aria-live="polite">
      <span>{label}</span>
      <div><i /></div>
      <small>Please wait. Tapping again is not needed.</small>
    </div>
  );
}

function BatchIntake({ sellers, categories, refresh, save, cancel }: {
  sellers: Ledger["sellers"];
  categories: Ledger["categories"];
  refresh: () => Promise<void>;
  save: (stones: Array<Record<string, unknown>>) => Promise<void>;
  cancel: () => void;
}) {
  const newRow = (): BatchIntakeRow => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
  const [rows, setRows] = useState<BatchIntakeRow[]>(() => [newRow(), newRow()]);
  const [photos, setPhotos] = useState<Record<string, PhotoDraft[]>>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const field = (name: string, row: BatchIntakeRow) => `${name}_${row.id}`;
  const addImages = async (rowId: string, files: FileList | null, captured: boolean) => {
    if (!files?.length) return;
    const remaining = 4 - (photos[rowId]?.length ?? 0);
    if (remaining <= 0) return toast.error("Each stone can have up to four images.");
    try {
      const prepared = await Promise.all(Array.from(files).slice(0, remaining).map(async (file) => ({ dataUrl: await squarePhoto(file), captured })));
      setPhotos((all) => ({ ...all, [rowId]: [...(all[rowId] ?? []), ...prepared] }));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Image could not be prepared"); }
  };
  const submit = async (form: FormData) => {
    if (savingRef.current) return;
    savingRef.current = true;
    const stones = rows.map((row) => ({
      gemType: txt(form.get(field("type", row))), origin: txt(form.get(field("origin", row))), weight: number(form.get(field("weight", row))),
      color: txt(form.get(field("color", row))) || null, shape: txt(form.get(field("shape", row))) || null, cutStyle: txt(form.get(field("cut", row))) || null,
      purchaseCost: number(form.get(field("purchase", row))), treatmentDisclosure: txt(form.get(field("treatment", row))) || "Not assessed",
      certificateReference: txt(form.get(field("certificate", row))) || null, sellerId: number(form.get(field("seller", row))) || null,
      locationName: txt(form.get(field("location", row))) || "Main vault · Intake", acquiredOn: txt(form.get(field("date", row))) || today(),
      notes: txt(form.get(field("notes", row))) || null, images: (photos[row.id] ?? []).map(({ dataUrl, captured }) => ({ dataUrl, captured })),
    }));
    setSaving(true);
    try { await save(stones); } finally { savingRef.current = false; setSaving(false); }
  };
  return (
    <form className="batch-intake" action={submit}>
      <div className="batch-intake-summary">
        <div><span>{rows.length}</span><strong>stones in this intake</strong><small>All records save together or none are saved.</small></div>
        <button type="button" className="ops-secondary" onClick={() => setRows((current) => [...current, newRow()])} disabled={rows.length >= 20}><Plus size={17} /> Add another stone</button>
      </div>
      <div className="batch-stone-list">
        {rows.map((row, index) => (
          <details className="panel batch-stone-card" key={row.id}>
            <summary>
              <span className="batch-number">{index + 1}</span>
              <span><strong>Stone {index + 1}</strong><small>Identity, measurements and purchase information</small></span>
              {rows.length > 2 && <button type="button" className="batch-remove" onClick={(event) => { event.preventDefault(); setRows((current) => current.filter((item) => item.id !== row.id)); setPhotos((current) => { const next = { ...current }; delete next[row.id]; return next; }); }}><Trash2 size={15} /> Remove</button>}
            </summary>
            <div className="batch-stone-fields">
              <label>Gem type *<CategorySelect name={field("type", row)} categoryKey="GEM_TYPE" categories={categories} required placeholder="Select gem type" refresh={refresh} /></label>
              <label>Weight · ct *<input name={field("weight", row)} type="number" min="0.001" step="0.001" required placeholder="0.000" /></label>
              <label>Origin / locality *<CategorySelect name={field("origin", row)} categoryKey="ORIGIN" categories={categories} required placeholder="Select origin or locality" refresh={refresh} /></label>
              <label>Supplier<DetailedSelect name={field("seller", row)} placeholder="No supplier selected" options={sellers.map((item) => ({ value: String(item.id), label: item.name, subtitle: "Supplier", images: item.images.map((image) => image.url), details: [["Phone", item.phone], ["Email", item.email], ["Locality", item.locality], ["Notes", item.notes]] }))} /></label>
              <label>Purchase date<input name={field("date", row)} type="date" defaultValue={today()} /></label>
              <label>Purchase cost · LKR<input name={field("purchase", row)} type="number" min="0" defaultValue="0" /></label>
              <label>Shape<CategorySelect name={field("shape", row)} categoryKey="SHAPE" categories={categories} placeholder="Select shape" refresh={refresh} /></label>
              <label>Cut<CategorySelect name={field("cut", row)} categoryKey="CUT" categories={categories} placeholder="Select cut" refresh={refresh} /></label>
              <label>Colour<CategorySelect name={field("color", row)} categoryKey="COLOR" categories={categories} placeholder="Select colour" refresh={refresh} /></label>
              <label>Treatment<CategorySelect name={field("treatment", row)} categoryKey="TREATMENT" categories={categories} defaultValue="Not assessed" placeholder="Select treatment" refresh={refresh} /></label>
              <label>Lab reference<input name={field("certificate", row)} placeholder="Optional" /></label>
              <label>Receiving location<input name={field("location", row)} defaultValue="Main vault · Intake" /></label>
              <label className="batch-notes">Notes<textarea name={field("notes", row)} rows={2} placeholder="Condition or intake observations" /></label>
              <div className="batch-photo-field">
                <span><strong>Stone images</strong><small>{(photos[row.id] ?? []).length}/4 added</small></span>
                <div className="batch-photo-thumbs">{(photos[row.id] ?? []).map((photo, photoIndex) => <button type="button" key={`${photo.dataUrl.slice(-20)}-${photoIndex}`} onClick={() => setPhotos((all) => ({ ...all, [row.id]: (all[row.id] ?? []).filter((_, itemIndex) => itemIndex !== photoIndex) }))} aria-label={`Remove image ${photoIndex + 1}`}><Image src={photo.dataUrl} alt={`Stone ${index + 1} image ${photoIndex + 1}`} width={64} height={64} unoptimized /><X size={13} /></button>)}</div>
                <div className="photo-actions"><label className="ops-secondary photo-button"><ImagePlus size={16} /> Upload<input hidden type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => void addImages(row.id, event.target.files, false)} /></label><label className="ops-secondary photo-button"><Camera size={16} /> Camera<input hidden type="file" accept="image/*" capture="environment" onChange={(event) => void addImages(row.id, event.target.files, true)} /></label></div>
              </div>
            </div>
          </details>
        ))}
      </div>
      <div className="batch-intake-footer">
        {saving && <SubmissionProgress label="Registering your stones…" />}
        <button type="button" className="ops-secondary" onClick={cancel} disabled={saving}>Cancel</button>
        <button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving stones…" : `Register ${rows.length} stones`} <ArrowRight size={17} /></button>
      </div>
    </form>
  );
}

function Intake({
  saveStone,
  saveStoneBatch,
  navigate,
  stone,
  sellers,
  categories,
  refresh,
}: {
  saveStone: Actions["saveStone"];
  saveStoneBatch: (stones: Array<Record<string, unknown>>) => Promise<void>;
  navigate: Actions["navigate"];
  stone?: Stone;
  sellers: Ledger["sellers"];
  categories: Ledger["categories"];
  refresh: () => Promise<void>;
}) {
  const [intakeMode, setIntakeMode] = useState<"single" | "batch">("single");
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
  const [sellerPhotos, setSellerPhotos] = useState<PhotoDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const requestKeyRef = useRef(crypto.randomUUID());
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
      {!stone && (
        <div className="intake-mode-switch" role="group" aria-label="Intake mode">
          <button type="button" className={intakeMode === "single" ? "active" : ""} onClick={() => setIntakeMode("single")}><Gem size={17} /><span><strong>Single stone</strong><small>Full individual record</small></span></button>
          <button type="button" className={intakeMode === "batch" ? "active" : ""} onClick={() => setIntakeMode("batch")}><Plus size={17} /><span><strong>Multiple stones</strong><small>Register 2–20 together</small></span></button>
        </div>
      )}
      {!stone && intakeMode === "batch" ? (
        <BatchIntake sellers={sellers} categories={categories} refresh={refresh} save={saveStoneBatch} cancel={() => navigate("inventory")} />
      ) : (
      <form
        className={`panel ops-form-card ${saving ? "is-submitting" : ""}`}
        aria-busy={saving}
        onSubmit={(event) => {
          event.preventDefault();
          if (savingRef.current) return;
          savingRef.current = true;
          setSaving(true);
          void saveStone(
            new FormData(event.currentTarget),
            photos,
            removedImageIds,
            requestKeyRef.current,
          ).finally(() => {
            savingRef.current = false;
            setSaving(false);
          });
        }}
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
            <CategorySelect
              name="type"
              categoryKey="GEM_TYPE"
              categories={categories}
              required
              defaultValue={stone?.type ?? ""}
              placeholder="Select or type a gem type"
              refresh={refresh}
            />
            <small>Select a gem type or use + to create one.</small>
          </label>
          <label>
            Origin / locality *
            <CategorySelect
              name="origin"
              categoryKey="ORIGIN"
              categories={categories}
              required
              defaultValue={stone?.origin ?? ""}
              placeholder="Select origin or locality"
              refresh={refresh}
            />
            <small>Select an origin or use + to create one.</small>
          </label>
          <label>
            Seller / source
            <DetailedSelect
              name="sellerId"
              value={selectedSeller}
              onValueChange={setSelectedSeller}
              placeholder="No seller selected"
              options={[
                ...sellers.map((item) => ({ value: String(item.id), label: `${item.name}${item.locality ? ` · ${item.locality}` : ""}`, subtitle: "Supplier", images: item.images.map((image) => image.url), details: [["Name", item.name], ["Phone", item.phone], ["Email", item.email], ["Locality", item.locality], ["Notes", item.notes]] as Array<[string, string]> })),
                { value: "__new__", label: "＋ Add a new seller", subtitle: "Create supplier during intake", details: [["Next step", "Enter the new supplier details below"]] },
              ]}
            />
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
              <input
                type="hidden"
                name="sellerImages"
                value={JSON.stringify(
                  sellerPhotos.map(({ dataUrl, captured }) => ({
                    dataUrl,
                    captured,
                  })),
                )}
              />
              <div className="seller-photo-field ops-full">
                <div>
                  <strong>
                    Seller images <span className="optional-label">Optional</span>
                  </strong>
                  <small>
                    The first image becomes the profile image. Add up to four images.
                  </small>
                </div>
                {sellerPhotos.length > 0 && (
                  <div className="photo-grid seller-photo-grid">
                    {sellerPhotos.map((photo, index) => (
                      <div
                        className="photo-tile"
                        key={`${photo.dataUrl.slice(-18)}-${index}`}
                      >
                        <Image
                          unoptimized
                          width={400}
                          height={400}
                          src={photo.dataUrl}
                          alt={`Seller preview ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSellerPhotos((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                          aria-label={`Remove seller image ${index + 1}`}
                        >
                          <Trash2 size={15} />
                        </button>
                        {index === 0 && <span>PROFILE</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="photo-actions">
                  <label className="ops-secondary photo-button">
                    <ImagePlus size={17} /> Add images
                    <input
                      hidden
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(event) => {
                        const remaining = 4 - sellerPhotos.length;
                        void Promise.all(
                          Array.from(event.target.files ?? [])
                            .slice(0, remaining)
                            .map(async (file) => ({
                              dataUrl: await squarePhoto(file),
                              captured: false,
                            })),
                        )
                          .then((prepared) =>
                            setSellerPhotos((current) => [...current, ...prepared]),
                          )
                          .catch((error) =>
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Seller image could not be prepared",
                            ),
                          );
                      }}
                    />
                  </label>
                  <label className="ops-secondary photo-button">
                    <Camera size={17} /> Take photo
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file || sellerPhotos.length >= 4) return;
                        void squarePhoto(file)
                          .then((dataUrl) =>
                            setSellerPhotos((current) => [
                              ...current,
                              { dataUrl, captured: true },
                            ]),
                          )
                          .catch((error) =>
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Seller photo could not be prepared",
                            ),
                          );
                      }}
                    />
                  </label>
                </div>
              </div>
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
            <CategorySelect
              name="shape"
              categoryKey="SHAPE"
              categories={categories}
              defaultValue={stone ? editable(stone.shape) : ""}
              placeholder="Select shape"
              refresh={refresh}
            />
            <small>Select a shape or use + to create one.</small>
          </label>
          <label>
            Cut
            <CategorySelect
              name="cut"
              categoryKey="CUT"
              categories={categories}
              defaultValue={stone ? editable(stone.cut) : ""}
              placeholder="Select cut"
              refresh={refresh}
            />
            <small>Select a cut or use + to create one.</small>
          </label>
          <label>
            Colour
            <CategorySelect
              name="color"
              categoryKey="COLOR"
              categories={categories}
              defaultValue={stone ? editable(stone.color) : ""}
              placeholder="Select colour"
              refresh={refresh}
            />
          </label>
          <label>
            Treatment declaration
            <CategorySelect
              name="treatment"
              categoryKey="TREATMENT"
              categories={categories}
              defaultValue={stone?.treatment ?? "Not assessed"}
              placeholder="Select treatment"
              refresh={refresh}
            />
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
            1:1 square and stored securely with this record.
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
          {saving && <SubmissionProgress label={stone ? "Saving your changes…" : "Registering your stone…"} />}
          <button
            type="button"
            className="ops-secondary"
            disabled={saving}
            onClick={() => navigate("inventory")}
          >
            Cancel
          </button>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving…" : stone ? "Save changes" : "Register stone"} <ArrowRight size={17} />
          </button>
        </div>
      </form>
      )}
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
        <div className="metric">
          <span>Direct sales</span>
          <strong>
            {money(
              ledger.directSales.reduce(
                (total, sale) => total + sale.finalPrice,
                0,
              ),
            )}
          </strong>
          <small>{ledger.directSales.length} recorded buyers</small>
        </div>
      </div>
      <Panel
        title="Available for direct sale"
        sub="Record a buyer and complete an immediate sale"
      >
        <div className="ops-queue">
          {ledger.stones
            .filter((stone) => stone.status === "Available")
            .slice(0, 6)
            .map((stone) => (
              <div className="ops-queue-row" key={stone.id}>
                <div>
                  <strong>
                    {stone.type} · {stone.weight.toFixed(2)} ct
                  </strong>
                  <small>{stone.productId}</small>
                </div>
                <button onClick={() => actions.open("direct-sale", stone.id)}>
                  Direct sale <ArrowRight size={14} />
                </button>
              </div>
            ))}
        </div>
      </Panel>
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
      <Panel title="Direct sale history" sub="Buyer details and final prices">
        <div className="ops-queue">
          {ledger.directSales.map((sale) => (
            <div className="ops-queue-row" key={sale.id}>
              <div>
                <strong>
                  {sale.stoneId} · {sale.buyer}
                </strong>
                <small>
                  {[sale.buyerPhone, sale.buyerEmail, sale.buyerLocality]
                    .filter(Boolean)
                    .join(" · ") || "No optional contact details"}
                </small>
              </div>
              <strong>{money(sale.finalPrice)}</strong>
            </div>
          ))}
          {!ledger.directSales.length && (
            <p className="ops-empty">No direct sales recorded yet.</p>
          )}
        </div>
      </Panel>
    </>
  );
}

function Jewellery({
  ledger,
  stone,
  actions,
  refresh,
}: {
  ledger: Ledger;
  stone: Stone;
  actions: Actions;
  refresh: () => Promise<void>;
}) {
  const profile = ledger.jewelleryProfiles.find((item) => item.stoneId === stone?.id);
  const activeJobs = ledger.jewelleryJobs.filter((job) => job.status === "With workshop");
  if (!profile) {
    return (
      <>
        <Heading
          kicker="JEWELLERY PRODUCTION"
          title="Jewellery"
          sub="Track stones handed to jewellery workshops and receive completed pieces."
          button="Create jewellery"
          onClick={() =>
            actions.open(
              "jewellery-handover",
              ledger.stones.find((item) => item.status === "Available")?.id,
            )
          }
        />
        <Panel title="With jewellery workshops" sub="Awaiting finished pieces">
          <div className="ops-queue">
            {activeJobs.map((job) => {
              const source = ledger.stones.find((record) => record.id === job.stoneId);
              return (
                <div className="ops-queue-row" key={job.id}>
                  {source ? <StoneLink stone={source} navigate={actions.navigate} /> : <div><strong>{job.stoneId} · {job.workshop}</strong></div>}
                  <div><small>{job.workshop} · Due {job.deadline} · {job.instructions || "No instructions"}</small></div>
                  <button onClick={() => actions.open("jewellery-receive", job.stoneId)}>
                    Receive jewellery <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
            {!activeJobs.length && <p className="ops-empty">No active jewellery jobs.</p>}
          </div>
        </Panel>
        <Panel title="Jewellery profiles" sub="Finished pieces linked to their original stones">
          <div className="ops-queue">
            {ledger.jewelleryProfiles.map((item) => {
              const source = ledger.stones.find((record) => record.id === item.stoneId);
              const preview = item.images[0] ?? source?.images[0];
              return (
                <div className="ops-queue-row" key={item.id}>
                  <div className="jewellery-list-identity">
                    <span className={`gem-swatch ${preview ? "has-image" : ""}`}>
                      {preview ? <Image unoptimized width={120} height={120} src={preview.url} alt={`${item.itemType} thumbnail`} /> : <Gem size={23} />}
                    </span>
                    <span>
                    <strong>{item.itemType} · {item.id}</strong>
                    <small>{source?.type} · {item.metalType} · {item.metalPurity}</small>
                    </span>
                  </div>
                  <button onClick={() => actions.navigate("stone", item.stoneId)}>
                    Open <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </Panel>
      </>
    );
  }
  const events = ledger.events.filter((event) => event.stoneId === stone.id);
  const jobs = ledger.jobs.filter((job) => job.stoneId === stone.id);
  return (
    <>
      <button className="back-button" onClick={() => actions.navigate("jewellery")}>
        <ArrowLeft size={17} /> Jewellery register
      </button>
      <div className="stone-hero ops-hero">
        <div className="gem-visual">
          {profile.images[0] ? (
            <Image unoptimized width={1000} height={1000} src={profile.images[0].url} alt={profile.itemType} />
          ) : (
            <Gem size={60} strokeWidth={1} />
          )}
        </div>
        <div className="stone-title">
          <div><Badge value="Jewellery" /><span className="stone-id">{profile.id}</span></div>
          <h1>{profile.itemType}</h1>
          <p>{stone.type} · {profile.metalType} · {profile.metalPurity}</p>
        </div>
        <div className="stone-hero-actions">
          <button className="ops-secondary" onClick={() => actions.open("jewellery-edit", stone.id)}>
            <Pencil size={17} /> Edit jewellery
          </button>
        </div>
      </div>
      <div className="ops-detail-grid">
        <div className="ops-detail-main">
          <Panel title="Jewellery setting" sub="Editable finished-piece specifications">
            <div className="fact-grid">
              {[
                ["Item type", profile.itemType],
                ["Metal", profile.metalType],
                ["Purity / karats", profile.metalPurity],
                ["Metal weight", profile.metalWeight ? `${profile.metalWeight.toFixed(3)} g` : "Not recorded"],
                ["Total weight", profile.totalWeight ? `${profile.totalWeight.toFixed(3)} g` : "Not recorded"],
                ["Setting style", profile.settingStyle],
                ["Size", profile.itemSize],
                ["Description", profile.description || "Not recorded"],
              ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          </Panel>
          <Panel title="Jewellery images" sub="Upload or capture up to four square images">
            <div className="stone-gallery">
              {profile.images.map((image, index) => (
                <Image unoptimized width={1000} height={1000} key={image.id} src={image.url} alt={`${profile.itemType} ${index + 1}`} />
              ))}
            </div>
            <div className="photo-actions">
              <label className="photo-button">
                <ImagePlus size={17} /> Upload images
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []).slice(0, 4 - profile.images.length);
                    void Promise.all(files.map(async (file) => ({ dataUrl: await squarePhoto(file), captured: false })))
                      .then(async (images) => {
                        if (!images.length) return;
                        await api.addJewelleryImages(profile.id, images);
                        await refresh();
                        toast.success("Jewellery images saved.");
                      })
                      .catch((error) => toast.error(error instanceof Error ? error.message : "Image upload failed"));
                  }}
                />
              </label>
              <label className="photo-button">
                <Camera size={17} /> Take photo
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void squarePhoto(file)
                      .then(async (dataUrl) => {
                        await api.addJewelleryImages(profile.id, [{ dataUrl, captured: true }]);
                        await refresh();
                        toast.success("Jewellery photo saved.");
                      })
                      .catch((error) => toast.error(error instanceof Error ? error.message : "Photo capture failed"));
                  }}
                />
              </label>
            </div>
          </Panel>
          <Panel title="Original stone details" sub="The complete source-stone record remains permanently attached">
            <div className="fact-grid">
              {[
                ["Product ID", stone.productId], ["Stone ID", stone.id], ["Gem type", stone.type],
                ["Origin", stone.origin], ["Intake weight", `${stone.originalWeight.toFixed(2)} ct`],
                ["Final stone weight", `${stone.weight.toFixed(2)} ct`], ["Shape", stone.shape],
                ["Cut", stone.cut], ["Colour", stone.color], ["Treatment", stone.treatment],
                ["Certificate", stone.certificate], ["Seller", stone.seller], ["Acquired", stone.acquired],
              ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          </Panel>
          {stone.images.length > 0 && <Panel title="Original stone images"><div className="stone-gallery">{stone.images.map((image, index) => <Image unoptimized width={1000} height={1000} key={image.id} src={image.url} alt={`Original stone ${index + 1}`} />)}</div></Panel>}
          <Panel title="Complete lifecycle history" sub={`${events.length} permanent source and jewellery events`}>
            {events.map((event) => <div className="ops-timeline-row" key={event.id}><span className="ops-timeline-icon"><History size={16} /></span><div><div><strong>{event.title}</strong><Badge value={event.category} /></div><p>{event.detail}</p><small>{event.at} · {event.actor}</small></div></div>)}
          </Panel>
        </div>
        <aside className="ops-detail-aside">
          <Panel title="Source stone"><div className="ops-aside-data"><span>STONE</span><strong>{stone.id}</strong><span>PURCHASE COST</span><strong>{money(stone.purchase)}</strong><span>WORKSHOP JOBS</span><strong>{jobs.length}</strong></div></Panel>
          <Panel title="Available operations"><div className="ops-side-actions"><Action onClick={() => actions.open("promotion-handover", stone.id)}>Hand over for promotion</Action><Action onClick={() => actions.open("direct-sale", stone.id)}>Record direct sale</Action></div></Panel>
        </aside>
      </div>
    </>
  );
}

function Promotions({ ledger, actions }: { ledger: Ledger; actions: Actions }) {
  const active = ledger.promotionHandovers.filter((item) => item.status === "With company");
  return (
    <>
      <Heading kicker="PROMOTIONAL CUSTODY" title="Promotions" sub="No-cost company handovers with deadlines and return acknowledgement." button="New handover" onClick={() => actions.open("promotion-handover", ledger.stones.find((item) => ["Available", "Jewellery"].includes(item.status) && !active.some((handover) => handover.stoneId === item.id))?.id)} />
      <div className="ops-metrics"><div className="metric accent"><span>With companies</span><strong>{active.length}</strong><small>Awaiting return</small></div><div className="metric"><span>Overdue</span><strong>{active.filter((item) => item.deadline < today()).length}</strong><small>Past their deadline</small></div><div className="metric"><span>Returned</span><strong>{ledger.promotionHandovers.filter((item) => item.status === "Returned").length}</strong><small>Custody restored</small></div></div>
      <Panel title="Active promotion handovers" sub="Receive every item on or before its deadline">
        <div className="ops-queue">{active.map((item) => <div className="ops-queue-row" key={item.id}><div><strong>{item.stoneId} · {item.company}</strong><small>Given {new Date(item.handedOverAt).toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" })} · due {item.deadline}</small></div><button onClick={() => actions.open("promotion-return", item.stoneId)}>Receive <ArrowRight size={14} /></button></div>)}{!active.length && <p className="ops-empty">No items are currently with promotion companies.</p>}</div>
      </Panel>
      <Panel title="Company directory"><div className="contact-grid ops-contacts">{ledger.companies.map((company, index) => <article className="panel contact-card" key={company.id}><div className={`contact-avatar tone-${index % 4}`}>{company.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div><h2>{company.name}</h2><Badge value="Company" /></div><hr /><span>{company.contactPerson || "No contact person"}</span><small>{company.phone} · {company.email}</small></article>)}</div></Panel>
    </>
  );
}

function Reports({ ledger, actions }: { ledger: Ledger; actions: Actions }) {
  const sold = ledger.salesmanHandovers.filter(
      (handover) => handover.status === "Sold",
    ),
    allSold = [
      ...sold.map((handover) => ({
        stoneId: handover.stoneId,
        finalPrice: handover.finalPrice,
      })),
      ...ledger.directSales.map((sale) => ({
        stoneId: sale.stoneId,
        finalPrice: sale.finalPrice,
      })),
    ],
    revenue = allSold.reduce((n, sale) => n + sale.finalPrice, 0),
    cost = allSold.reduce(
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
          <small>{allSold.length} completed sales</small>
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
            <Action
              onClick={() =>
                actions.download(
                  "origin-direct-sales.csv",
                  [
                    "Reference",
                    "Stone",
                    "Buyer",
                    "Phone",
                    "Email",
                    "Locality",
                    "Final price LKR",
                    "Sold at",
                  ],
                  ledger.directSales.map((sale) => [
                    sale.id,
                    sale.stoneId,
                    sale.buyer,
                    sale.buyerPhone,
                    sale.buyerEmail,
                    sale.buyerLocality,
                    sale.finalPrice,
                    sale.soldAt,
                  ]),
                )
              }
            >
              Direct sales CSV
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
                const sale = allSold.find((x) => x.stoneId === s.id),
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
function Categories({
  ledger,
  refresh,
}: {
  ledger: Ledger;
  refresh: () => Promise<void>;
}) {
  const [editingItem, setEditingItem] = useState<Ledger["categories"][number] | null>(null);
  const [addingKey, setAddingKey] = useState<CategoryKey | null>(null);
  const save = async (form: FormData) => {
    const categoryKey = txt(form.get("categoryKey")) as CategoryKey;
    const data = {
      categoryKey,
      name: txt(form.get("name")),
      description: txt(form.get("description")),
      sortOrder: number(form.get("sortOrder")),
    };
    try {
      if (editingItem) await api.updateCategory(editingItem.id, data);
      else await api.addCategory(data);
      setEditingItem(null);
      setAddingKey(null);
      await refresh();
      toast.success(editingItem ? "Category item updated." : "Category item added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Category could not be saved");
    }
  };
  return (
    <>
      <Heading
        kicker="MASTER DATA"
        title="Categories"
        sub="Manage the choices used across stone, treatment, jewellery and payment forms."
      />
      <div className="category-page-grid">
        {(Object.keys(categoryLabels) as CategoryKey[]).map((key) => {
          const items = ledger.categories.filter((item) => item.categoryKey === key);
          return (
            <section className="panel category-panel" key={key}>
              <div className="panel-head">
                <div><h2>{categoryLabels[key]}</h2><p>{items.length} active choices</p></div>
                <button className="icon-action" onClick={() => setAddingKey(key)} aria-label={`Add ${categoryLabels[key]}`}><Plus size={17} /><span>Add</span></button>
              </div>
              <div className="category-list">
                {items.map((item) => (
                  <div key={item.id}>
                    <span><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}</span>
                    <span className="row-actions">
                      <button type="button" onClick={() => setEditingItem(item)} aria-label={`Edit ${item.name}`}><Pencil size={15} /><span>Edit</span></button>
                      <button type="button" onClick={() => {
                        if (!window.confirm(`Remove ${item.name} from active choices? Existing records will be kept.`)) return;
                        void api.deleteCategory(item.id).then(async () => { await refresh(); toast.success("Category item removed from active choices."); }).catch((error) => toast.error(error instanceof Error ? error.message : "Could not remove category"));
                      }} aria-label={`Remove ${item.name}`}><Trash2 size={15} /><span>Remove</span></button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <Dialog open={!!addingKey || !!editingItem} onOpenChange={(open) => { if (!open) { setAddingKey(null); setEditingItem(null); } }}>
        <DialogContent className="ops-dialog compact-dialog">
          <DialogHeader><DialogTitle>{editingItem ? "Edit category item" : "Add category item"}</DialogTitle><DialogDescription>This choice becomes available throughout the application.</DialogDescription></DialogHeader>
          <form action={save}>
            <div className="ops-dialog-fields">
              <label>Category<DetailedSelect name="categoryKey" defaultValue={editingItem?.categoryKey ?? addingKey ?? "GEM_TYPE"} options={(Object.keys(categoryLabels) as CategoryKey[]).map((key) => ({ value: key, label: categoryLabels[key], subtitle: "Application-wide category", details: [["Used for", categoryLabels[key]]] }))} /></label>
              <label>Name<input name="name" required defaultValue={editingItem?.name ?? ""} /></label>
              <label>Display order<input name="sortOrder" type="number" min="0" defaultValue={editingItem?.sortOrder ?? 0} /></label>
              <label className="ops-full">Description<textarea name="description" rows={2} defaultValue={editingItem?.description ?? ""} /></label>
            </div>
            <div className="dialog-actions"><button type="button" className="ops-secondary" onClick={() => { setAddingKey(null); setEditingItem(null); }}>Cancel</button><button className="primary-button">Save category</button></div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

type DirectoryEntry = {
  id: number;
  entity: "workshops" | "sellers" | "salesmen" | "buyers" | "contacts";
  name: string;
  role: string;
  phone: string;
  email: string;
  locality: string;
  image: string;
  workshopType?: string;
};

function Directory({ ledger, refresh }: { ledger: Ledger; refresh: () => Promise<void> }) {
  const [filter, setFilter] = useState("All");
  const [editingContact, setEditingContact] = useState<DirectoryEntry | null>(null);
  const [addingEntity, setAddingEntity] = useState<DirectoryEntry["entity"] | null>(null);
  const entries: DirectoryEntry[] = [
    ...ledger.workshops.map((workshop) => ({ id: workshop.id, entity: "workshops" as const, name: workshop.name, role: "Workshop", phone: workshop.phone, email: "", locality: workshop.address, image: "", workshopType: workshop.type })),
    ...ledger.salesmen.map((salesman) => ({ id: salesman.id, entity: "salesmen" as const, name: salesman.name, role: "Salesman", phone: salesman.phone, email: salesman.email, locality: salesman.locality, image: "" })),
    ...ledger.buyers.map((buyer) => ({ id: buyer.id, entity: "buyers" as const, name: buyer.name, role: "Buyer", phone: buyer.phone, email: buyer.email, locality: buyer.locality, image: "" })),
    ...ledger.sellers.map((seller) => ({ id: seller.id, entity: "sellers" as const, name: seller.name, role: "Supplier", phone: seller.phone, email: seller.email, locality: seller.locality, image: seller.images[0]?.url ?? "" })),
    ...ledger.contacts.filter((contact) => !["Buyer", "Seller"].includes(contact.role)).map((contact) => ({ id: contact.id, entity: "contacts" as const, name: contact.name, role: contact.role, phone: contact.phone, email: contact.email, locality: contact.locality, image: "" })),
  ];
  const visible = entries.filter((entry) => filter === "All" || entry.role === filter);
  const closeEditor = () => { setAddingEntity(null); setEditingContact(null); };
  const saveContact = async (form: FormData) => {
    const entity = editingContact?.entity ?? addingEntity;
    if (!entity) return;
    const common = { phone: txt(form.get("phone")), email: txt(form.get("email")) || null };
    const payload: Record<string, unknown> = entity === "contacts"
      ? { ...common, displayName: txt(form.get("name")), role: txt(form.get("contactRole")) || "OTHER", locality: txt(form.get("locality")) }
      : entity === "workshops"
        ? { ...common, name: txt(form.get("name")), workshopType: txt(form.get("workshopType")) || "BOTH", address: txt(form.get("locality")) }
        : { ...common, name: txt(form.get("name")), locality: txt(form.get("locality")), notes: txt(form.get("notes")) };
    try {
      if (editingContact) await api.updateDirectory(entity, editingContact.id, payload);
      else await api.createDirectory(entity, payload);
      closeEditor();
      await refresh();
      toast.success(editingContact ? "Directory contact updated." : "Directory contact added.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Contact could not be saved"); }
  };
  return (
    <>
      <Heading
        kicker="TRADE NETWORK"
        title="Directory"
        sub="Manage workshops, suppliers, salesmen, buyers and other operational contacts."
        button="Add contact"
        onClick={() => setAddingEntity("sellers")}
      />
      <div className="ops-filters directory-filters">
        {["All", "Workshop", "Supplier", "Salesman", "Buyer", "Cutter", "Laboratory", "Staff", "Other"].map((role) => <button key={role} className={filter === role ? "selected" : ""} onClick={() => setFilter(role)}>{role}</button>)}
      </div>
      <div className="contact-grid ops-contacts">
        {visible.map((c, i) => (
          <article className="panel contact-card" key={`${c.entity}-${c.id}`}>
            <div
              className={`contact-avatar tone-${i % 4} ${c.image ? "has-image" : ""}`}
            >
              {c.image ? (
                <Image
                  unoptimized
                  width={120}
                  height={120}
                  src={c.image}
                  alt={c.name}
                />
              ) : (
                c.name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
              )}
            </div>
            <div>
              <h2>{c.name}</h2>
              <Badge value={c.role} />
            </div>
            <hr />
            <span>{c.locality}</span>
            <small>{c.phone}</small>
            {c.email && <small>{c.email}</small>}
            <div className="contact-card-actions"><button type="button" onClick={() => setEditingContact(c)}><Pencil size={15} /> Edit</button><button type="button" onClick={() => { if (!window.confirm(`Remove ${c.name} from the active directory?`)) return; void api.deleteDirectory(c.entity, c.id).then(async () => { await refresh(); toast.success("Contact removed from the active directory."); }).catch((error) => toast.error(error instanceof Error ? error.message : "Contact could not be removed")); }}><Trash2 size={15} /> Remove</button></div>
          </article>
        ))}
      </div>
      <Dialog open={!!addingEntity || !!editingContact} onOpenChange={(open) => { if (!open) closeEditor(); }}>
        <DialogContent className="ops-dialog compact-dialog">
          <DialogHeader><DialogTitle>{editingContact ? `Edit ${editingContact.role}` : "Add directory contact"}</DialogTitle><DialogDescription>Changes are saved to the shared MySQL directory.</DialogDescription></DialogHeader>
          <form action={saveContact}>
            <div className="ops-dialog-fields">
              {!editingContact && <label>Contact type<DetailedSelect value={addingEntity ?? "sellers"} onValueChange={(entry) => setAddingEntity(entry as DirectoryEntry["entity"])} options={[{value:"workshops",label:"Workshop"},{value:"sellers",label:"Supplier"},{value:"salesmen",label:"Salesman"},{value:"buyers",label:"Buyer"},{value:"contacts",label:"Other contact"}].map((item) => ({ ...item, subtitle: "Directory contact type", details: [["Type", item.label]] }))} /></label>}
              <label>Name<input name="name" required defaultValue={editingContact?.name ?? ""} /></label>
              {(editingContact?.entity ?? addingEntity) === "workshops" && <label>Workshop type<DetailedSelect name="workshopType" defaultValue={editingContact?.workshopType ?? "BOTH"} options={[["CUTTING","Cutting"],["TREATMENT","Treatment"],["BOTH","Cutting & treatment"],["JEWELLERY","Jewellery"],["ALL","All services"]].map(([value,label]) => ({ value, label, subtitle: "Workshop capability", details: [["Services", label]] }))} /></label>}
              {(editingContact?.entity ?? addingEntity) === "contacts" && <label>Role<DetailedSelect name="contactRole" defaultValue={editingContact?.role.toUpperCase() ?? "OTHER"} options={[["CUTTER","Cutter"],["LABORATORY","Laboratory"],["STAFF","Staff"],["OTHER","Other"]].map(([value,label]) => ({ value, label, subtitle: "Directory role", details: [["Role", label]] }))} /></label>}
              <label>Phone<input name="phone" type="tel" defaultValue={editingContact?.phone ?? ""} /></label>
              <label>Email<input name="email" type="email" defaultValue={editingContact?.email ?? ""} /></label>
              <label>{(editingContact?.entity ?? addingEntity) === "workshops" ? "Address" : "Locality"}<input name="locality" defaultValue={editingContact?.locality ?? ""} /></label>
              {!['workshops','contacts'].includes(editingContact?.entity ?? addingEntity ?? '') && <label className="ops-full">Notes<textarea name="notes" rows={2} /></label>}
            </div>
            <div className="dialog-actions"><button type="button" className="ops-secondary" onClick={closeEditor}>Cancel</button><button className="primary-button">Save contact</button></div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OperationDialog({
  operation,
  stoneLocked,
  close,
  stone,
  ledger,
  submit,
  error,
  refresh,
}: {
  operation: Operation | null;
  stoneLocked: boolean;
  close: () => void;
  stone: Stone;
  ledger: Ledger;
  submit: (f: FormData) => Promise<void>;
  error: string;
  refresh: () => Promise<void>;
}) {
  const [jobKind, setJobKind] = useState<"Cutting" | "Treatment">("Cutting");
  const [jobWorkshop, setJobWorkshop] = useState("");
  const [buyerChoice, setBuyerChoice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
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
    "sales-handover": "Hand stone to salesman",
    "sales-return": "Receive stone from salesman",
    "sales-complete": "Record salesman sale",
    "direct-sale": "Record direct sale",
    "jewellery-handover": "Create jewellery job",
    "jewellery-receive": "Receive finished jewellery",
    "jewellery-edit": "Edit jewellery profile",
    "promotion-handover": "Promotion handover",
    "promotion-return": "Receive promotion item",
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
    ),
    jewelleryProfile = ledger.jewelleryProfiles.find(
      (profile) => profile.stoneId === stone.id,
    ),
    activeJewelleryJob = ledger.jewelleryJobs.find(
      (job) => job.stoneId === stone.id && job.status === "With workshop",
    ),
    activePromotion = ledger.promotionHandovers.find(
      (handover) =>
        handover.stoneId === stone.id && handover.status === "With company",
    );
  const allowed =
    operation === "job" ||
    operation === "reserve" ||
    operation === "sale" ||
    operation === "sales-handover" ||
    operation === "direct-sale" ||
    operation === "jewellery-handover" ||
    operation === "promotion-handover";
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
  const allStoneOptions = ledger.stones.map((item): DetailOption => ({
      value: item.id,
      label: `${item.productId} · ${item.type} · ${item.weight.toFixed(2)} ct`,
      subtitle: `${item.id} · ${item.status}`,
      images: item.images.map((image) => image.url),
      details: [
        ["Product ID", item.productId], ["Stone ID", item.id], ["Gem type", item.type],
        ["Weight", `${item.weight.toFixed(2)} ct`], ["Origin", item.origin], ["Colour", item.color],
        ["Shape", item.shape], ["Cut", item.cut], ["Treatment", item.treatment],
        ["Certificate", item.certificate], ["Supplier", item.seller], ["Current location", item.location],
        ["Custodian", item.custodian], ["Purchase cost", money(item.purchase)], ["Status", item.status],
      ],
    }));
  const stoneOptions = allStoneOptions.filter((option) =>
    ledger.stones.some((item) => item.id === option.value && item.status === "Available"),
  );
  const workshopOptions = eligibleWorkshops.map((item): DetailOption => ({
    value: String(item.id), label: item.name, subtitle: "Workshop",
    details: [["Services", item.type.replaceAll("_", " ")], ["Phone", item.phone], ["Address", item.address]],
  }));
  const providerOptions = eligibleProviders.map((item): DetailOption => ({
    value: String(item.id), label: item.name, subtitle: "Workshop provider",
    details: [["Speciality", item.specialty], ["Phone", item.phone], ["Workshop", eligibleWorkshops.find((workshop) => workshop.id === item.workshopId)?.name ?? "Not recorded"]],
  }));
  return (
    <Dialog
      open={!!operation}
      onOpenChange={(v) => {
        if (!v && !submittingRef.current) close();
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
              if (submittingRef.current) return;
              submittingRef.current = true;
              setSubmitting(true);
              void submit(new FormData(e.currentTarget)).finally(() => {
                submittingRef.current = false;
                setSubmitting(false);
              });
            }}
            aria-busy={submitting}
          >
            <div className="ops-dialog-fields">
              {allowed && (
                <div className="ops-warning">
                  <ShieldCheck size={16} /> Start this operation for the
                  selected stone. Its current status will be checked before
                  recording.
                </div>
              )}
              {operation === "job" && (
                  <label>
                    Stone
                    <DetailedSelect name="stoneId" options={stoneOptions} defaultValue={stone.id} required disabled={stoneLocked} placeholder="Select stone" />
                  </label>
                )}
              {allowed && !["job", "sales-handover", "direct-sale", "jewellery-handover", "promotion-handover"].includes(operation) && (
                <label>Stone<input value={`${stone.id} · ${stone.type}`} readOnly /></label>
              )}
              {operation === "direct-sale" && (
                <>
                  <label className="ops-full">
                    Stone details
                    <DetailedSelect name="stoneId" options={stoneOptions} defaultValue={stone.id} required disabled={stoneLocked} placeholder="Select stone" />
                  </label>
                  <label>
                    Buyer
                    <DetailedSelect
                      name={buyerChoice === "__new__" ? "buyerChoice" : "buyerName"}
                      value={buyerChoice}
                      onValueChange={setBuyerChoice}
                      required
                      placeholder="Select buyer"
                      options={[
                        ...ledger.buyers.map((item) => ({ value: item.name, label: item.name, subtitle: "Buyer", details: [["Phone", item.phone], ["Email", item.email], ["Locality", item.locality], ["Notes", item.notes]] as Array<[string, string]> })),
                        { value: "__new__", label: "+ Add a new buyer", subtitle: "Create buyer during this sale", details: [["Next step", "Enter the new buyer details below"]] },
                      ]}
                    />
                  </label>
                  {buyerChoice === "__new__" && <label>New buyer name<input name="buyerName" required placeholder="Person or business name" /></label>}
                  <label>
                    Buyer phone
                    <input name="buyerPhone" type="tel" />
                  </label>
                  <label>
                    Buyer email
                    <input name="buyerEmail" type="email" />
                  </label>
                  <label>
                    Buyer locality
                    <input name="buyerLocality" />
                  </label>
                  <label>
                    Final selling price · LKR
                    <input
                      name="finalPrice"
                      type="number"
                      min="1"
                      required
                    />
                  </label>
                  <label>
                    Sale date and time
                    <input name="soldAt" type="datetime-local" required />
                  </label>
                  <label className="ops-full">
                    Sale notes
                    <textarea name="notes" rows={2} />
                  </label>
                </>
              )}
              {operation === "jewellery-handover" && (
                <>
                  <label className="ops-full">
                    Stone
                    <DetailedSelect name="stoneId" options={stoneOptions} defaultValue={stone.id} required disabled={stoneLocked} placeholder="Select stone" />
                  </label>
                  <label>
                    Jewellery workshop
                    <DetailedSelect name="workshopId" required placeholder="Select workshop" options={ledger.workshops.filter((workshop) => ["JEWELLERY", "ALL"].includes(workshop.type)).map((item) => ({ value: String(item.id), label: item.name, subtitle: "Jewellery workshop", details: [["Services", item.type], ["Phone", item.phone], ["Address", item.address]] }))} />
                  </label>
                  <label>Handover date and time<input name="handedOverAt" type="datetime-local" required /></label>
                  <label>Deadline date<input name="deadline" type="date" required /></label>
                  <label className="ops-full">Design and production instructions<textarea name="notes" rows={3} placeholder="Jewellery type, design, measurements and setting requirements" /></label>
                </>
              )}
              {operation === "jewellery-receive" && (
                <>
                  <div className="ops-context ops-full">{activeJewelleryJob?.workshop} · due {activeJewelleryJob?.deadline}</div>
                  <label>Jewellery type<input name="itemType" required placeholder="Ring, pendant, earrings…" /></label>
                  <label>Metal<CategorySelect name="metalType" categoryKey="METAL" categories={ledger.categories} required placeholder="Select metal" refresh={refresh} /></label>
                  <label>Purity / karats<CategorySelect name="metalPurity" categoryKey="METAL_PURITY" categories={ledger.categories} required placeholder="Select purity" refresh={refresh} /></label>
                  <label>Metal weight · g<input name="metalWeight" type="number" min="0" step="0.001" /></label>
                  <label>Total jewellery weight · g<input name="totalWeight" type="number" min="0" step="0.001" /></label>
                  <label>Setting style<input name="settingStyle" placeholder="Prong, bezel, halo…" /></label>
                  <label>Size / dimensions<input name="itemSize" /></label>
                  <label className="ops-full">Jewellery description<textarea name="description" rows={2} /></label>
                  <label className="ops-full">Receiving inspection notes<textarea name="receiveNotes" rows={2} /></label>
                </>
              )}
              {operation === "jewellery-edit" && jewelleryProfile && (
                <>
                  <label>Jewellery type<input name="itemType" required defaultValue={jewelleryProfile.itemType} /></label>
                  <label>Metal<CategorySelect name="metalType" categoryKey="METAL" categories={ledger.categories} defaultValue={jewelleryProfile.metalType === "Not recorded" ? "" : jewelleryProfile.metalType} placeholder="Select metal" refresh={refresh} /></label>
                  <label>Purity / karats<CategorySelect name="metalPurity" categoryKey="METAL_PURITY" categories={ledger.categories} defaultValue={jewelleryProfile.metalPurity === "Not recorded" ? "" : jewelleryProfile.metalPurity} placeholder="Select purity" refresh={refresh} /></label>
                  <label>Metal weight · g<input name="metalWeight" type="number" min="0" step="0.001" defaultValue={jewelleryProfile.metalWeight || ""} /></label>
                  <label>Total weight · g<input name="totalWeight" type="number" min="0" step="0.001" defaultValue={jewelleryProfile.totalWeight || ""} /></label>
                  <label>Setting style<input name="settingStyle" defaultValue={jewelleryProfile.settingStyle === "Not recorded" ? "" : jewelleryProfile.settingStyle} /></label>
                  <label>Size / dimensions<input name="itemSize" defaultValue={jewelleryProfile.itemSize === "Not recorded" ? "" : jewelleryProfile.itemSize} /></label>
                  <label className="ops-full">Description<textarea name="description" rows={3} defaultValue={jewelleryProfile.description} /></label>
                </>
              )}
              {operation === "promotion-handover" && (
                <>
                  <label className="ops-full">
                    Stone / jewellery
                    <DetailedSelect name="stoneId" defaultValue={stone.id} required disabled={stoneLocked} placeholder="Select stone or jewellery" options={ledger.stones.filter((item) => ["Available", "Jewellery"].includes(item.status) && !ledger.promotionHandovers.some((handover) => handover.stoneId === item.id && handover.status === "With company")).map((item) => {
                      const profile = ledger.jewelleryProfiles.find((record) => record.stoneId === item.id);
                      return { ...allStoneOptions.find((option) => option.value === item.id)!, label: profile ? `${profile.id} · ${profile.itemType}` : `${item.productId} · ${item.type}`, images: profile?.images.map((image) => image.url) ?? item.images.map((image) => image.url) };
                    })} />
                  </label>
                  <label>Company<DetailedSelect name="companyId" required placeholder="Select company" options={ledger.companies.map((item) => ({ value: String(item.id), label: item.name, subtitle: "Promotion company", details: [["Contact person", item.contactPerson], ["Phone", item.phone], ["Email", item.email], ["Address", item.address]] }))} /></label>
                  <label>Handover date and time<input name="handedOverAt" type="datetime-local" required /></label>
                  <label>Deadline date<input name="deadline" type="date" required /></label>
                  <label className="ops-full">Handover notes<textarea name="notes" rows={2} /></label>
                  <div className="ops-context ops-full">No costs or charges are recorded for promotional handovers.</div>
                </>
              )}
              {operation === "promotion-return" && (
                <>
                  <div className="ops-context ops-full">{activePromotion?.company} · deadline {activePromotion?.deadline}</div>
                  <label className="ops-full">Return inspection notes<textarea name="returnNotes" rows={3} /></label>
                </>
              )}
              {operation === "sales-handover" && (
                <>
                  <label className="ops-full">
                    Stone details
                    <DetailedSelect name="stoneId" options={stoneOptions} defaultValue={stone.id} required disabled={stoneLocked} placeholder="Select stone" />
                  </label>
                  <label>
                    Salesman
                    <DetailedSelect
                      name="salesman"
                      required
                      placeholder="Search salesman"
                      options={ledger.salesmen.map((item) => ({ value: item.name, label: item.name, subtitle: "Salesman", details: [["Phone", item.phone], ["Email", item.email], ["Locality", item.locality], ["Notes", item.notes]] }))}
                    />
                  </label>
                  <label>
                    Quoted price · LKR
                    <input
                      name="price"
                      type="number"
                      min="1"
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
                    <DetailedSelect
                      name="kind"
                      value={jobKind}
                      onValueChange={(next) => setJobKind(next as "Cutting" | "Treatment")}
                      options={[
                        { value: "Cutting", label: "Cutting", subtitle: "Workshop process", details: [["Purpose", "Cut, shape or polish the stone"]] },
                        { value: "Treatment", label: "Treatment", subtitle: "Workshop process", details: [["Purpose", "Apply or assess a gemstone treatment"]] },
                      ]}
                    />
                  </label>
                  <label>
                    Workshop
                    <DetailedSelect
                      name="workshopId"
                      required
                      value={selectedWorkshop}
                      onValueChange={setJobWorkshop}
                      options={workshopOptions}
                      placeholder="Select workshop"
                    />
                  </label>
                  <label>
                    Provider
                    <DetailedSelect
                      key={`${jobKind}-${selectedWorkshop}`}
                      name="providerId"
                      required
                      options={providerOptions}
                      placeholder="Select provider"
                    />
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
                      <CategorySelect name="treatment" categoryKey="TREATMENT" categories={ledger.categories} required placeholder="Select treatment disclosure" refresh={refresh} />
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
                    <CategorySelect name="outcome" categoryKey="TREATMENT" categories={ledger.categories} defaultValue={stone.treatment} placeholder="Select assessment" refresh={refresh} />
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
                      defaultValue={reservation?.price || ""}
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
                    <CategorySelect name="method" categoryKey="PAYMENT_METHOD" categories={ledger.categories} defaultValue="Bank transfer" placeholder="Select payment method" refresh={refresh} />
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
              {submitting && <SubmissionProgress label="Saving this operation…" />}
              <button type="button" className="ops-secondary" onClick={close} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? "Saving…" : "Confirm operation"} <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

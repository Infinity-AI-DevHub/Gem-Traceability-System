import type { CategoryItem, CategoryKey, Ledger } from "./demo-data";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4500/api/v1";

export type AppNotification = {
  id: number;
  kind: string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "URGENT";
  title: string;
  message: string;
  actionUrl: string;
  read: boolean;
  createdAt: string;
};

type ErrorDetails = {
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
};

function firstValidationMessage(details?: ErrorDetails) {
  const formMessage = details?.formErrors?.find(Boolean);
  if (formMessage) return formMessage;
  for (const messages of Object.values(details?.fieldErrors ?? {})) {
    const message = messages?.find(Boolean);
    if (message) return message;
  }
  return "";
}

function friendlyError(status: number, serverMessage?: string, details?: ErrorDetails) {
  if (status === 401) return "Your session has ended. Please sign in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "We could not find that item. It may have been removed.";
  if (status === 409)
    return serverMessage || "This information changed. Please refresh and try again.";
  if (status === 413) return "That file is too large. Please choose a smaller file.";
  if (status === 422)
    return serverMessage === "Validation failed"
      ? firstValidationMessage(details) || "Please check the information you entered and try again."
      : serverMessage || "Please check the information you entered.";
  if (status === 429) return "Too many tries. Please wait a little while and try again.";
  if (status >= 500)
    return "Something went wrong, but your information is safe. Please try again.";
  return serverMessage || "We could not finish that. Please try again.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...init?.headers,
      },
    });
  } catch {
    throw new Error(
      "We could not connect. Check your internet connection and try again.",
    );
  }
  let body: { data?: T; error?: string; details?: ErrorDetails } | null = null;
  if (response.status !== 204) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }
  if (
    response.status === 401 &&
    !path.startsWith("/auth/") &&
    typeof window !== "undefined"
  ) {
    window.dispatchEvent(new Event("origin:unauthorized"));
  }
  if (!response.ok)
    throw new Error(friendlyError(response.status, body?.error, body?.details));
  return body?.data as T;
}

export const api = {
  login: async (username: string, password: string) => {
    const result = await request<{
      user: { displayName: string; role: string };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return result.user;
  },
  session: () =>
    request<{ username: string; displayName: string; role: string }>(
      "/auth/session",
    ),
  logout: async () => {
    await request<never>("/auth/logout", { method: "POST" });
  },
  notifications: () =>
    request<{ unreadCount: number; items: AppNotification[] }>(
      "/notifications",
    ),
  markNotificationRead: (id: number) =>
    request<{ ok: true }>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () =>
    request<{ ok: true }>("/notifications/read-all", { method: "POST" }),
  pushConfig: () =>
    request<{ available: boolean; publicKey: string }>(
      "/notifications/push-config",
    ),
  pushSubscriptionStatus: (endpoint: string) =>
    request<{ saved: boolean; deviceName: string; browserName: string }>(
      "/notifications/push-subscriptions/status",
      {
        method: "POST",
        body: JSON.stringify({ endpoint }),
      },
    ),
  savePushSubscription: (
    subscription: PushSubscriptionJSON,
    device: {
      deviceName: string;
      browserName: string;
      platformName: string;
      persistAfterLogout: boolean;
    },
  ) =>
    request<{ ok: true }>("/notifications/push-subscriptions", {
      method: "POST",
      body: JSON.stringify({ ...subscription, ...device }),
    }),
  removePushSubscription: (endpoint: string) =>
    request<void>("/notifications/push-subscriptions", {
      method: "DELETE",
      body: JSON.stringify({ endpoint }),
    }),
  ledger: () => request<Ledger>("/ledger"),
  addCategory: (data: {
    categoryKey: CategoryKey;
    name: string;
    description?: string;
    sortOrder?: number;
  }) =>
    request<CategoryItem>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCategory: (id: number, data: {
    categoryKey: CategoryKey;
    name: string;
    description?: string;
    sortOrder?: number;
  }) =>
    request<CategoryItem>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: number) =>
    request<void>(`/categories/${id}`, { method: "DELETE" }),
  createDirectory: (entity: string, data: Record<string, unknown>) =>
    request<{ id: number }>(`/${entity}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateDirectory: (entity: string, id: number, data: Record<string, unknown>) =>
    request<{ id: number }>(`/directory/${entity}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteDirectory: (entity: string, id: number) =>
    request<void>(`/directory/${entity}/${id}`, { method: "DELETE" }),
  command: (
    operation: string,
    stoneId: string,
    data: Record<string, unknown>,
  ) =>
    request<unknown>("/commands", {
      method: "POST",
      body: JSON.stringify({ operation, stoneId, data }),
    }),
  intake: (data: Record<string, unknown>, requestKey: string) =>
    request<{ id: string }>("/stones", {
      method: "POST",
      headers: { "Idempotency-Key": requestKey },
      body: JSON.stringify(data),
    }),
  batchIntake: (stones: Array<Record<string, unknown>>) =>
    request<{ ids: string[]; count: number }>("/stones/batch", {
      method: "POST",
      body: JSON.stringify({ stones }),
    }),
  updateStone: (stoneId: string, data: Record<string, unknown>) =>
    request<{ id: string }>(`/stones/${encodeURIComponent(stoneId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  addStoneImages: (
    stoneId: string,
    images: Array<{ dataUrl: string; captured: boolean }>,
  ) =>
    request<{ uploaded: number }>(
      `/stones/${encodeURIComponent(stoneId)}/images`,
      {
        method: "POST",
        body: JSON.stringify({ images }),
      },
    ),
  deleteStoneImage: (stoneId: string, imageId: number) =>
    request<void>(`/stones/${encodeURIComponent(stoneId)}/images/${imageId}`, {
      method: "DELETE",
    }),
  addJewelleryImages: (
    jewelleryId: string,
    images: Array<{ dataUrl: string; captured: boolean }>,
  ) =>
    request<{ uploaded: number }>(
      `/jewellery/${encodeURIComponent(jewelleryId)}/images`,
      { method: "POST", body: JSON.stringify({ images }) },
    ),
  deleteJewelleryImage: (jewelleryId: string, imageId: number) =>
    request<void>(
      `/jewellery/${encodeURIComponent(jewelleryId)}/images/${imageId}`,
      { method: "DELETE" },
    ),
};

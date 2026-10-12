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

type ErrorBody = {
  error?: string;
  code?: string;
  details?: ErrorDetails;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof DOMException) {
    if (["NotAllowedError", "PermissionDeniedError"].includes(error.name))
      return "Permission was not granted. Allow access in your browser settings and try again.";
    if (error.name === "NotFoundError")
      return "The required camera or device could not be found.";
    if (error.name === "NotReadableError")
      return "The camera is being used by another app. Close it there and try again.";
    if (error.name === "SecurityError")
      return "Your browser blocked this action for security. Open the secure website and try again.";
    if (error.name === "AbortError") return "The action was cancelled before it finished.";
  }
  if (error instanceof TypeError) return fallback;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function firstValidationMessage(details?: ErrorDetails) {
  const formMessage = details?.formErrors?.find(Boolean);
  if (formMessage) return formMessage;
  for (const messages of Object.values(details?.fieldErrors ?? {})) {
    const message = messages?.find(Boolean);
    if (message) return message;
  }
  return "";
}

function friendlyError(
  path: string,
  status: number,
  serverMessage?: string,
  details?: ErrorDetails,
) {
  if (status === 400)
    return (
      serverMessage ??
      "Some information could not be read. Refresh the page and try again."
    );
  if (status === 401)
    return path === "/auth/login"
      ? serverMessage || "The username or password is not correct."
      : "Please sign in again to continue.";
  if (status === 403)
    return (
      serverMessage ??
      "Your account does not have permission to complete this action."
    );
  if (status === 404)
    return (
      serverMessage ??
      "We could not find this item. It may have been removed by another user."
    );
  if (status === 409)
    return (
      serverMessage ??
      "This record changed while you were working. Refresh it and try again."
    );
  if (status === 413)
    return (
      serverMessage ??
      "The selected files are too large. Choose smaller files and try again."
    );
  if (status === 415)
    return "This file type is not supported. Use a JPEG, PNG, or WebP image.";
  if (status === 422)
    return serverMessage === "Validation failed"
      ? firstValidationMessage(details) ||
          "Check the information marked in the form and try again."
      : serverMessage ||
          firstValidationMessage(details) ||
          "Check the information in the form and try again.";
  if (status === 429)
    return (
      serverMessage ??
      "There have been too many attempts. Wait a few minutes and try again."
    );
  if (status === 502 || status === 503 || status === 504)
    return (
      serverMessage ??
      "The service is temporarily unavailable. Nothing was changed. Try again in a moment."
    );
  if (status >= 500)
    return (
      serverMessage ??
      "We could not complete this action because of a server problem. Nothing was changed. Please try again."
    );
  return (
    serverMessage ??
    "We could not complete this action. Check your information and try again."
  );
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
    throw new ApiError(
      "We could not connect to the app. Check your internet connection and try again.",
      0,
      "NETWORK_ERROR",
    );
  }
  let body: ({ data?: T } & ErrorBody) | null = null;
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
    throw new ApiError(
      friendlyError(path, response.status, body?.error, body?.details),
      response.status,
      body?.code ?? "REQUEST_FAILED",
    );
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
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ changed: true }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
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
  deleteStone: (stoneId: string) =>
    request<void>(`/stones/${encodeURIComponent(stoneId)}`, {
      method: "DELETE",
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

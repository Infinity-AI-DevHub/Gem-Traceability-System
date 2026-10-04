import type { Ledger } from "./demo-data";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token =
    typeof window === "undefined"
      ? null
      : window.sessionStorage.getItem("origin-session");
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok)
    throw new Error(body?.error ?? "The operation could not be completed");
  return body?.data as T;
}

export const api = {
  login: async (username: string, password: string) => {
    const result = await request<{
      token: string;
      user: { displayName: string; role: string };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    window.sessionStorage.setItem("origin-session", result.token);
    return result.user;
  },
  logout: async () => {
    try {
      await request<never>("/auth/logout", { method: "POST" });
    } finally {
      window.sessionStorage.removeItem("origin-session");
    }
  },
  hasSession: () =>
    typeof window !== "undefined" &&
    !!window.sessionStorage.getItem("origin-session"),
  ledger: () => request<Ledger>("/ledger"),
  command: (
    operation: string,
    stoneId: string,
    data: Record<string, unknown>,
  ) =>
    request<unknown>("/commands", {
      method: "POST",
      body: JSON.stringify({ operation, stoneId, data }),
    }),
  intake: (data: Record<string, unknown>) =>
    request<{ id: string }>("/stones", {
      method: "POST",
      body: JSON.stringify(data),
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
};

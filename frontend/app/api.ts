import type { CategoryItem, CategoryKey, Ledger } from "./demo-data";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4500/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = response.status === 204 ? null : await response.json();
  if (
    response.status === 401 &&
    !path.startsWith("/auth/") &&
    typeof window !== "undefined"
  ) {
    window.dispatchEvent(new Event("origin:unauthorized"));
  }
  if (!response.ok)
    throw new Error(body?.error ?? "The operation could not be completed");
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
  intake: (data: Record<string, unknown>) =>
    request<{ id: string }>("/stones", {
      method: "POST",
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

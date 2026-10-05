import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { env } from "../config/env.js";
import { HttpError } from "./http-error.js";

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const uploadRoot = isAbsolute(env.UPLOAD_DIR)
  ? env.UPLOAD_DIR
  : resolve(process.cwd(), env.UPLOAD_DIR);

export async function storeImage(
  dataUrl: string,
  collection: "stones" | "sellers" | "jewellery",
) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) throw new HttpError(422, "Unsupported image format");
  const mimeType = match[1]!;
  const data = Buffer.from(match[2]!, "base64");
  if (data.length > 2_000_000)
    throw new HttpError(422, "Each image must be smaller than 2 MB");
  return storeImageBuffer(data, mimeType, collection);
}

export async function storeImageBuffer(
  data: Buffer,
  mimeType: string,
  collection: "stones" | "sellers" | "jewellery",
) {
  const extension = extensions[mimeType];
  if (!extension) throw new HttpError(422, "Unsupported image format");
  const directory = resolve(uploadRoot, collection);
  await mkdir(directory, { recursive: true });
  const fileName = `${randomUUID()}.${extension}`;
  const filePath = `${collection}/${fileName}`;
  await writeFile(resolve(uploadRoot, filePath), data, { flag: "wx" });
  return { filePath, mimeType };
}

export function imageUrl(value: unknown) {
  const row = value as {
    file_path?: unknown;
    mime_type?: unknown;
    image_base64?: unknown;
  };
  if (typeof row.file_path === "string" && row.file_path) {
    const encodedPath = row.file_path
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    return `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/uploads/${encodedPath}`;
  }
  return `data:${String(row.mime_type)};base64,${String(row.image_base64 ?? "")}`;
}

export async function removeStoredImage(filePath: unknown) {
  if (typeof filePath !== "string" || !filePath) return;
  const absolutePath = resolve(uploadRoot, filePath);
  if (!absolutePath.startsWith(`${uploadRoot}/`)) return;
  await unlink(absolutePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}

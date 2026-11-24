import { fileTypeFromBuffer } from "file-type";

import type {
  MediaCandidate,
  MediaFile,
  MediaKind,
  MediaOptions,
} from "./types.js";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_HOSTS = new Set([
  "cdn.discordapp.com",
  "media.discordapp.net",
  "images-ext-1.discordapp.net",
  "images-ext-2.discordapp.net",
  "static.klipy.com",
  "static1.klipy.com",
  "static2.klipy.com",
  "media.tenor.com",
  "media1.tenor.com",
  "c.tenor.com",
]);

const MIME_TYPES: Record<string, MediaKind> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/avif": "image",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
  "audio/mpeg": "audio",
  "audio/ogg": "audio",
  "audio/wav": "audio",
  "audio/flac": "audio",
};

async function downloadBuffer(url: string, maxSize: number): Promise<Buffer> {
  const parsed = new URL(url);

  if (
    parsed.protocol !== "https:" ||
    parsed.port !== "" ||
    parsed.username ||
    parsed.password ||
    !ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())
  ) {
    throw new Error("Unsupported media URL.");
  }

  const response = await fetch(parsed, {
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Download failed: HTTP ${response.status}`);
  }

  const contentLength = Number(response.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maxSize) {
    throw new Error("File exceeds the maximum size.");
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];

  let totalSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalSize += value.byteLength;

      if (totalSize > maxSize) {
        await reader.cancel();
        throw new Error("File exceeds the maximum size.");
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}

export async function downloadMedia(
  candidate: MediaCandidate,
  options: MediaOptions = {},
): Promise<MediaFile> {
  const buffer = await downloadBuffer(candidate.url, MAX_FILE_SIZE);

  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    throw new Error("Unrecognized media format.");
  }

  const kind = MIME_TYPES[detected.mime];

  if (
    options.allowedMimeTypes &&
    !options.allowedMimeTypes.includes(detected.mime)
  ) {
    throw new Error(`Unsupported media format: ${detected.mime}`);
  }

  if (!kind) {
    throw new Error(`Unsupported format: ${detected.mime}`);
  }

  if (options.allowedKinds && !options.allowedKinds.includes(kind)) {
    throw new Error(`Unsupported media type: ${kind}`);
  }

  return {
    buffer,
    filename: candidate.filename,
    mimeType: detected.mime,
    extension: detected.ext,
    kind,
  };
}

import type { RequestHandler } from "./$types";

import { downloadMedia, validateMediaUrl } from "../../../media/ytdlp.js";

const MAX_BODY_SIZE = 2 ** 12;
const MAX_REQUESTS = 8;
const RATE_WINDOW = 10 * 60 * 1000;
const MAX_CONCURRENT_DOWNLOADS = 5;

const MAX_WEB_FILE_SIZE_MB = Number(
  process.env.CADE_WEB_MAX_FILE_SIZE_MB ?? 250,
);

const MAX_WEB_FILE_SIZE = MAX_WEB_FILE_SIZE_MB * 1024 * 1024;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

let activeDownloads = 0;

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

interface YtDownloadReq {
  url: string,
  kind: "video" | "audio"
}

function checkRateLimit(address: string): boolean {
  const now = Date.now();

  for (const [key, entry] of rateLimits) {
    if (entry.resetAt <= now) {
      rateLimits.delete(key);
    }
  }

  let entry = rateLimits.get(address);

  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + RATE_WINDOW,
    };

    rateLimits.set(address, entry);
  }

  if (entry.count >= MAX_REQUESTS) {
    return false;
  }

  entry.count++;

  return true;
}

async function readJson(request: Request): Promise<YtDownloadReq> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    throw new ApiError(415, "Expected a JSON request.");
  }

  const reader = request.body?.getReader();

  if (!reader) {
    throw new ApiError(400, "Missing request body.");
  }

  const decoder = new TextDecoder();
  let body = "";
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      size += value.byteLength;

      if (size > MAX_BODY_SIZE) {
        await reader.cancel();
        throw new ApiError(413, "Request is too large.");
      }

      body += decoder.decode(value, { stream: true });
    }

    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(body) as YtDownloadReq;
  } catch {
    throw new ApiError(400, "Invalid JSON.");
  }
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  let address: string;

  try {
    address = getClientAddress();
  } catch {
    address = "unknown";
  }

  if (!checkRateLimit(address)) {
    return jsonError(429, "Too many requests. Please try again later.");
  }

  if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) {
    return jsonError(503, "The downloader is currently busy.");
  }

  let body: YtDownloadReq;

  try {
    body = await readJson(request);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.status, error.message);
    }

    return jsonError(400, "Invalid request.");
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("url" in body) ||
    typeof body.url !== "string" ||
    !("kind" in body) ||
    typeof body.kind !== "string" ||
    body.url.length > 2048
  ) {
    return jsonError(400, "Please provide a YouTube URL and download kind.");
  }

  if (body.kind !== "audio" && body.kind !== "video") {
    return jsonError(400, "Invalid download kind.");
  }

  let url: string;

  try {
    url = validateMediaUrl(body.url);
  } catch {
    return jsonError(400, "Invalid YouTube URL.");
  }

  activeDownloads++;

  try {
    const result = await downloadMedia(url, body.kind, undefined, {
      maxFileSize: MAX_WEB_FILE_SIZE,
    });

    const file = new Uint8Array(result.buffer);

    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": body.kind === "audio" ? "audio/mpeg" : "video/mp4",
        "Content-Length": String(file.byteLength),
        "Content-Disposition": `attachment; filename=${result.filename}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[Web/Get]", error);

    return jsonError(502, "The video could not be downloaded.");
  } finally {
    activeDownloads--;
  }
};

import { randomUUID } from "node:crypto";

import type { YouTubeTimeRange } from "./youtube.js";

export interface PendingGetRequest {
  userId: string;
  url: string;
  range?: YouTubeTimeRange;
}

interface StoredRequest {
  request: PendingGetRequest;
  timeout: ReturnType<typeof setTimeout>;
}

const REQUEST_TIMEOUT = 30_000;

const requests = new Map<string, StoredRequest>();

export function createGetRequest(request: PendingGetRequest): string {
  const id = randomUUID();

  const timeout = setTimeout(() => {
    requests.delete(id);
  }, REQUEST_TIMEOUT);

  timeout.unref();

  requests.set(id, {
    request,
    timeout,
  });

  return id;
}

export function claimGetRequest(
  id: string,
  userId: string,
):
  | { status: "success"; request: PendingGetRequest }
  | { status: "expired" }
  | { status: "forbidden" } {
  const stored = requests.get(id);

  if (!stored) {
    return { status: "expired" };
  }

  if (stored.request.userId !== userId) {
    return { status: "forbidden" };
  }

  clearTimeout(stored.timeout);
  requests.delete(id);

  return {
    status: "success",
    request: stored.request,
  };
}

export function cancelGetRequest(id: string): void {
  const stored = requests.get(id);

  if (!stored) return;

  clearTimeout(stored.timeout);
  requests.delete(id);
}

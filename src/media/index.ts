import type { Message } from "discord.js";

import { resolveMedia } from "./attachment.js";
import { downloadMedia } from "./download.js";

import type { MediaFile, MediaOptions } from "./types.js";

export interface MediaDownloadResult {
  file?: MediaFile;
  error?: string;
}

export async function getMedia(
  message: Message,
  options: MediaOptions = {},
): Promise<MediaDownloadResult[]> {
  const candidates = await resolveMedia(message);

  return Promise.all(
    candidates.map(async (candidate) => {
      try {
        return {
          file: await downloadMedia(candidate, options),
        };
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : "Unknown download error",
        };
      }
    }),
  );
}

export async function getFirstMedia(
  message: Message,
  options: MediaOptions = {},
): Promise<MediaFile | undefined> {
  const candidates = await resolveMedia(message);

  for (const candidate of candidates) {
    try {
      return await downloadMedia(candidate, options);
    } catch {}
  }

  return undefined;
}

export { resolveMedia, downloadMedia };

export type {
  MediaFile,
  MediaCandidate,
  MediaKind,
  MediaOptions,
} from "./types.js";

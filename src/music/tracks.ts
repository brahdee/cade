import { SystemChannelFlagsBitField, type User } from "discord.js";

import type { Track, UnresolvedTrack } from "lavalink-client";

import type { CadePlayer } from "./player.js";
import { messages } from "../utils/messages.js";

export type TrackSearchSource = "youtube" | "youtube music" | "soundcloud";

export type CadeTrack = Track | UnresolvedTrack;

export type TrackSearchResponse = Awaited<ReturnType<CadePlayer["search"]>>;

export function isMediaUrl(input: string): boolean {
  try {
    const url = new URL(input);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function searchTracks(
  player: CadePlayer,
  input: string,
  requester: User,
  source: TrackSearchSource = "youtube",
): Promise<TrackSearchResponse> {
  const query = input.trim();

  if (!query) {
    throw new Error("Search query cannot be empty");
  }

  const searchQuery = isMediaUrl(query)
    ? { query }
    : {
        query,
        source,
      };

  return player.search(searchQuery, requester);
}

export function getSearchError(result: TrackSearchResponse): string | null {
  if (result.loadType === "error") {
    return messages.errors.play.failed;
  }

  if (result.loadType === "empty" || result.tracks.length === 0) {
    return messages.errors.play.noTracksFound;
  }

  return null;
}

export function formatDuration(milliseconds: number | undefined): string {
  if (
    milliseconds === undefined ||
    !Number.isFinite(milliseconds) ||
    milliseconds <= 0
  ) {
    return "LIVE";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${formattedMinutes}:${formattedSeconds}`;
  }

  return `${minutes}:${formattedSeconds}`;
}

import type {
  Track,
  UnresolvedTrack,
  TrackExceptionEvent,
} from "lavalink-client";

import type { CadeClient } from "../../bot/cade.js";
import type { CadePlayer } from "../../music/player.js";
import { finalizeNowPlayingMessage } from "./helpers.js";

import { getPlayerTextChannel } from "./helpers.js";

export async function handleTrackError(
  client: CadeClient,
  player: CadePlayer,
  track: Track | UnresolvedTrack,
  payload: TrackExceptionEvent,
): Promise<void> {
  const errorMessage =
    payload.exception?.message ?? payload.error ?? "Unknown Lavalink error";

  console.error(
    `[Lavalink] Failed to play "${track.info.title}" in guild ${player.guildId}:`,
    errorMessage,
  );

  const channel = await getPlayerTextChannel(client, player);

  if (!channel) return;

  await finalizeNowPlayingMessage(player, track, "couldn't play");
}

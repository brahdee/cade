import type { Track, TrackStuckEvent } from "lavalink-client";

import type { CadeClient } from "../../bot/cade.js";
import type { CadePlayer } from "../../music/player.js";

import { finalizeNowPlayingMessage, getPlayerTextChannel } from "./helpers.js";

export async function handleTrackStuck(
  client: CadeClient,
  player: CadePlayer,
  track: Track,
  payload: TrackStuckEvent,
): Promise<void> {
  console.warn(
    `[Lavalink] Track "${track.info.title}" got stuck in guild ${player.guildId}. Threshold: ${payload.thresholdMs}ms`,
  );

  const channel = await getPlayerTextChannel(client, player);

  if (!channel) return;

  await finalizeNowPlayingMessage(player, track, "stopped");
}

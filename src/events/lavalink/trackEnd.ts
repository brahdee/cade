import type { Track, TrackEndEvent } from "lavalink-client";

import type { CadeClient } from "../../bot/cade.js";
import type { CadePlayer } from "../../music/player.js";

import { finalizeNowPlayingMessage } from "./helpers.js";

export async function handleTrackEnd(
  _client: CadeClient,
  player: CadePlayer,
  track: Track,
  _payload: TrackEndEvent,
): Promise<void> {
  if (player.repeatMode === "track") {
    const loopCount = player.getData<number>("loopCount") ?? 0;

    player.setData("loopCount", loopCount + 1);

    return;
  }

  await finalizeNowPlayingMessage(player, track, "played");
}

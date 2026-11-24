import type { LavalinkManager } from "lavalink-client";

import type { CadeClient } from "../../bot/cade.js";

import { handleTrackStart } from "./trackStart.js";
import { handleTrackEnd } from "./trackEnd.js";
import { handleTrackError } from "./trackError.js";
import { handleTrackStuck } from "./trackStuck.js";
import { handleQueueEnd } from "./queueEnd.js";

export function registerLavalinkEvents(
  client: CadeClient,
  manager: LavalinkManager,
): void {
  manager.on("trackStart", (player, track) => {
    if (!track) return;

    void handleTrackStart(client, player, track).catch((error) => {
      console.error("[Lavalink] trackStart handler failed:", error);
    });
  });

  manager.on("trackEnd", (player, track, payload) => {
    if (!track) return;

    void handleTrackEnd(client, player, track, payload).catch((error) => {
      console.error("[Lavalink] trackEnd handler failed:", error);
    });
  });

  manager.on("trackError", (player, track, payload) => {
    if (!track) return;

    void handleTrackError(client, player, track, payload).catch((error) => {
      console.error("[Lavalink] trackError handler failed:", error);
    });
  });

  manager.on("trackStuck", (player, track, payload) => {
    if (!track) return;

    void handleTrackStuck(client, player, track, payload).catch((error) => {
      console.error("[Lavalink] trackStuck handler failed:", error);
    });
  });

  manager.on("queueEnd", (player) => {
    void handleQueueEnd(client, manager, player).catch((error) => {
      console.error("[Lavalink] queueEnd handler failed:", error);
    });
  });

  console.log("[Lavalink] Event handlers registered");
}

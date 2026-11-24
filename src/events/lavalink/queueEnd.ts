import type { LavalinkManager } from "lavalink-client";

import type { CadeClient } from "../../bot/cade.js";
import type { CadePlayer } from "../../music/player.js";

export async function handleQueueEnd(
  client: CadeClient,
  manager: LavalinkManager,
  player: CadePlayer,
): Promise<void> {
  const guild = client.guilds.cache.get(player.guildId);

  if (!guild || !client.user || !player.voiceChannelId) {
    return;
  }

  const channel = await guild.channels
    .fetch(player.voiceChannelId)
    .catch(() => null);

  if (!channel?.isVoiceBased()) {
    return;
  }

  const isAlone =
    channel.members.size === 1 && channel.members.has(client.user.id);

  if (!isAlone) {
    return;
  }

  console.log(`[Lavalink] Queue ended and cade is alone in ${guild.name}`);

  await manager.destroyPlayer(
    player.guildId,
    "Queue ended while cade was alone in voice",
  );
}

import type { GuildMember } from "discord.js";
import type { LavalinkManager } from "lavalink-client";

import type { CadeClient } from "../bot/cade.js";

export type CadePlayer = ReturnType<LavalinkManager["createPlayer"]>;

function getManager(client: CadeClient): LavalinkManager {
  const manager = client.lavalink;

  if (!manager) {
    throw new Error("Lavalink has not been initialized");
  }

  if (!manager.useable) {
    throw new Error("No available Lavalink nodes");
  }

  return manager;
}

export function getPlayer(
  client: CadeClient,
  guildId: string,
): CadePlayer | undefined {
  return client.lavalink?.players.get(guildId);
}

export async function getOrCreatePlayer(
  client: CadeClient,
  options: {
    guildId: string;
    voiceChannelId: string;
    textChannelId: string;
  },
): Promise<CadePlayer> {
  const manager = getManager(client);

  const { guildId, voiceChannelId, textChannelId } = options;

  const existing = manager.players.get(guildId);

  if (existing) {
    if (existing.voiceChannelId !== voiceChannelId) {
      throw new Error("Player is already connected to another voice channel");
    }

    if (!existing.connected) {
      await existing.connect();
    }

    return existing;
  }

  const player = manager.createPlayer({
    guildId,
    voiceChannelId,
    textChannelId,

    volume: 100,
    selfDeaf: true,
    selfMute: false,
  });

  try {
    await player.connect();
  } catch (error) {
    await manager
      .destroyPlayer(guildId, "Failed to connect to voice channel")
      .catch((cleanupError) => {
        console.error("[Lavalink] Failed to clean up player:", cleanupError);
      });

    throw error;
  }

  return player;
}

export async function destroyPlayer(
  client: CadeClient,
  guildId: string,
  reason = "Player destroyed",
): Promise<boolean> {
  const manager = client.lavalink;

  if (!manager) {
    return false;
  }

  const player = manager.players.get(guildId);

  if (!player) {
    return false;
  }

  await manager.destroyPlayer(guildId, reason);

  return true;
}

export function isPlayerConnected(player: CadePlayer): boolean {
  return player.connected === true && player.voiceChannelId !== null;
}

export function isSameVoiceChannel(
  member: GuildMember,
  player: CadePlayer,
): boolean {
  const memberChannelId = member.voice.channelId;

  return memberChannelId !== null && player.voiceChannelId === memberChannelId;
}

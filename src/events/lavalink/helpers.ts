import { EmbedBuilder, Message } from "discord.js";

import type { Track, UnresolvedTrack } from "lavalink-client";

import type { CadeClient } from "../../bot/cade.js";
import type { CadePlayer } from "../../music/player.js";

import { formatDuration } from "../../music/tracks.js";

export async function finalizeNowPlayingMessage(
  player: CadePlayer,
  track: Parameters<typeof getTrackLink>[0],
  status: "played" | "skipped" | "stopped" | "couldn't play",
): Promise<void> {
  const message = player.getData<Message | undefined>("nowPlayingMessage");

  if (!message) {
    return;
  }

  const displayedTrackIdentifier = player.getData<string | undefined>(
    "nowPlayingTrackIdentifier",
  );

  if (
    displayedTrackIdentifier &&
    displayedTrackIdentifier !== track.info.identifier
  ) {
    return;
  }

  const requester = getRequesterMention(track);

  const embed = new EmbedBuilder()
    .setColor(0x808080)
    .setDescription(
      [
        `-# ${status} ${getTrackLink(track)} \`${getTrackDuration(track)}\``,
        requester ? `-# Requested by ${requester}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );

  try {
    await message.edit({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    console.warn(
      "[Lavalink] Could not update the previous track message:",
      error,
    );
  } finally {
    if (player.getData<Message | undefined>("nowPlayingMessage") === message) {
      player.deleteData("nowPlayingMessage");
      player.deleteData("nowPlayingTrackIdentifier");
    }
  }
}

export const EMBED_COLOR = 0xeac597;

export async function getPlayerTextChannel(
  client: CadeClient,
  player: CadePlayer,
) {
  if (!player.textChannelId) {
    return null;
  }

  const channel = await client.channels
    .fetch(player.textChannelId)
    .catch(() => null);

  if (!channel?.isSendable()) {
    return null;
  }

  return channel;
}

export function getTrackDuration(track: Track | UnresolvedTrack): string {
  if (track.info.isStream) {
    return "LIVE";
  }

  return formatDuration(track.info.duration);
}

export function getTrackLink(track: Track | UnresolvedTrack): string {
  const { title, uri } = track.info;

  return uri ? `[${title}](${uri})` : `**${title}**`;
}

export function getRequesterMention(
  track: Track | UnresolvedTrack,
): string | null {
  const requesterId = track.requester?.id;

  return requesterId ? `<@${requesterId}>` : null;
}

export function createTrackEmbed(track: Track | UnresolvedTrack): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(
      `${getTrackLink(track)}\n` +
        `by **${track.info.author}** • \`${getTrackDuration(track)}\``,
    );

  if (track.info.artworkUrl) {
    embed.setThumbnail(track.info.artworkUrl);
  }

  return embed;
}

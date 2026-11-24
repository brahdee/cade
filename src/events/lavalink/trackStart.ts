import type { Message } from "discord.js";
import type { Track } from "lavalink-client";

import type { CadeClient } from "../../bot/cade.js";
import type { CadePlayer } from "../../music/player.js";
import { formatDuration } from "../../music/tracks.js";

import {
  createTrackEmbed,
  getPlayerTextChannel,
  getRequesterMention,
} from "./helpers.js";

import { handleTrackStartQueueModes } from "../../music/queue.js";

export async function handleTrackStart(
  client: CadeClient,
  player: CadePlayer,
  track: Track,
): Promise<void> {
  if (player.repeatMode === "track") {
    return;
  }

  await handleTrackStartQueueModes(player);

  const channel = await getPlayerTextChannel(client, player);

  if (!channel) {
    console.warn(
      `[Lavalink] Could not find text channel for guild ${player.guildId}`,
    );

    return;
  }

  const requesterId = track.requester?.id;
  const requester = getRequesterMention(track);

  const embed = createTrackEmbed(track)
    .setTitle("🎶 Now playing")
    .setDescription(
      [
        `**${track.info.title}**`,
        `by **${track.info.author}** • \`${track.info.isStream ? "LIVE" : formatDuration(track.info.duration)}\``,
        player.voiceChannelId ? `-# <#${player.voiceChannelId}>` : null,
        requester ? `-# Requested by ${requester}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );

  const message = await channel.send({
    embeds: [embed],
    allowedMentions: {
      parse: [],
      users: requesterId ? [requesterId] : [],
    },
  });

  player.setData("nowPlayingMessage", message);
  player.setData("nowPlayingTrackIdentifier", track.info.identifier);

  player.setData("loopCount", 0);

  console.log(
    `[Lavalink] Now playing "${track.info.title}" in guild ${player.guildId}`,
  );
}

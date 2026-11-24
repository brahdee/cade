import { EmbedBuilder } from "discord.js";

import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import {
  getPlayer,
  isPlayerConnected,
  isSameVoiceChannel,
} from "../../music/player.js";

import {
  getTrackLink,
  getTrackDuration,
  getRequesterMention,
} from "../../events/lavalink/helpers.js";

import { messages } from "../../utils/messages.js";

const EMBED_COLOR = 0xeac597;

function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [
      hours,
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0"),
    ].join(":");
  }

  return [minutes, String(seconds).padStart(2, "0")].join(":");
}

function createProgressBar(position: number, duration: number): string {
  if (duration <= 0) return "LIVE";

  const progress = Math.min(1, Math.max(0, position / duration));

  const marker = Math.min(19, Math.floor(progress * 20));

  const bar = Array.from({ length: 20 }, (_, index) =>
    index === marker ? "🔘" : "▬",
  ).join("");

  const remaining = Math.max(0, duration - position);

  return [
    `\`${formatTimestamp(position)}\``,
    bar,
    `\`${formatTimestamp(remaining)} left\``,
  ].join(" ");
}

export class NowPlayingCommand extends CadeCommand {
  name = "nowplaying";
  description = "shows information about the current track";
  category = CommandCategory.MUSIC;

  aliases = ["np"];

  async execute({ client, message }: CommandContext): Promise<void> {
    const guild = message.guild;
    const member = message.member;

    if (!guild || !member) return;

    const player = getPlayer(client, guild.id);

    if (!player || !isPlayerConnected(player)) {
      await message.reply(messages.errors.player.notConnected);
      return;
    }

    if (!isSameVoiceChannel(member, player)) {
      await message.reply(messages.errors.player.notSameVC);
      return;
    }

    const track = player.queue.current;

    if (!track) {
      await message.reply(messages.errors.player.notPlaying);
      return;
    }

    const position = Math.min(
      Math.max(0, player.position),
      track.info.duration,
    );

    const progress = track.info.isStream
      ? "🔴 LIVE"
      : createProgressBar(position, track.info.duration);

    const requester = getRequesterMention(track);

    const description = [
      "-# Currently Playing",
      `**${getTrackLink(track)}**`,
      progress,
      `-# ${getTrackDuration(track)} • by **${track.info.author}**`,
      requester ? `-# Requested by ${requester}` : null,
      `-# ${player.paused ? "⏸️ Paused" : "▶️ Playing"}`,
    ]
      .filter(Boolean)
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setDescription(description);

    if (track.info.artworkUrl) {
      embed.setThumbnail(track.info.artworkUrl);
    }

    await message.reply({
      embeds: [embed],
      allowedMentions: {
        parse: [],
      },
    });
  }
}

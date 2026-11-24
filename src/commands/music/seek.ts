import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import {
  getPlayer,
  isPlayerConnected,
  isSameVoiceChannel,
} from "../../music/player.js";

import { messages } from "../../utils/messages.js";

function parseTimestamp(input: string): number | null {
  const parts = input.split(":");

  if (parts.length < 1 || parts.length > 3) {
    return null;
  }

  if (!parts.every((part) => /^\d+$/.test(part))) {
    return null;
  }

  const values = parts.map(Number);

  if (values.some((value) => !Number.isSafeInteger(value))) {
    return null;
  }

  let totalSeconds: number;

  if (values.length === 1) {
    totalSeconds = values[0];
  } else if (values.length === 2) {
    const [minutes, seconds] = values;

    if (seconds >= 60) {
      return null;
    }

    totalSeconds = minutes * 60 + seconds;
  } else {
    const [hours, minutes, seconds] = values;

    if (minutes >= 60 || seconds >= 60) {
      return null;
    }

    totalSeconds = hours * 3600 + minutes * 60 + seconds;
  }

  if (!Number.isSafeInteger(totalSeconds)) {
    return null;
  }

  return totalSeconds * 1000;
}

function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);

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

export class SeekCommand extends CadeCommand {
  name = "seek";
  description = "jumps to a specific point in the current track";
  category = CommandCategory.MUSIC;

  async execute({ client, message, rawArgs }: CommandContext): Promise<void> {
    const guild = message.guild;
    const member = message.member;

    if (!guild || !member) {
      return;
    }

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

    if (track.info.isStream || !track.info.isSeekable) {
      await message.reply(messages.errors.seek.notSeekable);
      return;
    }

    const input = rawArgs.trim();

    if (!input) {
      await message.reply(messages.errors.seek.invalidUsage);
      return;
    }

    const position = parseTimestamp(input);

    if (position === null) {
      await message.reply(messages.errors.seek.invalidTimestamp);
      return;
    }

    const duration = track.info.duration;

    if (position >= duration) {
      await message.reply(
        `the timestamp must be before the end of the track (${formatTimestamp(duration)})`,
      );
      return;
    }

    await player.seek(position);

    await message.reply({
      content: `⏩ skipped to **${formatTimestamp(position)}** in **${track.info.title}**`,
      allowedMentions: {
        parse: [],
      },
    });
  }
}

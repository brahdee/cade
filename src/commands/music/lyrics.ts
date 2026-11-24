import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import {
  getPlayer,
  isPlayerConnected,
  isSameVoiceChannel,
} from "../../music/player.js";

import { messages } from "../../utils/messages.js";

export class LyricsCommand extends CadeCommand {
  name = "lyrics";
  description = "finds lyrics for the currently playing track";
  category = CommandCategory.MUSIC;
  aliases = ["lyric"];

  async execute({ client, message }: CommandContext): Promise<void> {
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

    try {
      const lyrics = await player.getCurrentLyrics();

      if (!lyrics || lyrics.lines.length === 0) {
        await message.reply(messages.errors.lyrics.notFound);
        return;
      }

      const searchUrl = new URL("https://www.google.com/search");
      searchUrl.searchParams.set(
        "q",
        `${track.info.author} ${track.info.title} lyrics`,
      );

      const provider = lyrics.provider
        ? `\n-# Lyrics provider: ${lyrics.provider}`
        : "";

      await message.reply({
        content: [
          `**${track.info.title}** by ${track.info.author}`,
          "Lyrics are available for this track.",
          `[Search for lyrics](${searchUrl.toString()})`,
          provider,
        ]
          .filter(Boolean)
          .join("\n"),
        allowedMentions: {
          parse: [],
        },
      });
    } catch (error) {
      this.sendErrorToLog(error);

      await message.reply(messages.errors.lyrics.failed);
    }
  }
}

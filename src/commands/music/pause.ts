import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import {
  getPlayer,
  isPlayerConnected,
  isSameVoiceChannel,
} from "../../music/player.js";

import { messages } from "../../utils/messages.js";

export class PauseCommand extends CadeCommand {
  name = "pause";
  description = "pauses or resumes the current track";
  category = CommandCategory.MUSIC;

  aliases = ["pp"];

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

    if (!player.queue.current) {
      await message.reply(messages.errors.player.notPlaying);
      return;
    }

    try {
      if (player.paused) {
        await player.resume();

        await message.reply(messages.success.pause.resumed);
      } else {
        await player.pause();

        await message.reply(messages.success.pause.paused);
      }
    } catch (error) {
      this.sendErrorToLog(error);

      await message.reply(messages.errors.pause.failed);
    }
  }
}

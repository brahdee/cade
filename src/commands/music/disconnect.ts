import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import {
  getPlayer,
  isPlayerConnected,
  isSameVoiceChannel,
  destroyPlayer,
} from "../../music/player.js";
import { messages, reactWithEmoji, CadeEmoji } from "../../utils/messages.js";

export class DisconnectCommand extends CadeCommand {
  name = "disconnect";
  description = "makes the bot leave vc";
  category = CommandCategory.MUSIC;

  aliases = ["dc", "leave"];

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

    try {
      await destroyPlayer(client, guild.id, "Disconnected by user");

      await reactWithEmoji(message, CadeEmoji.SUCCESS);

      this.sendInfoToLog(`Disconnected from ${guild.name}`);
    } catch (error) {
      this.sendErrorToLog(error);

      await message.reply(messages.errors.disconnect.failed);
    }
  }
}

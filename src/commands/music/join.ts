import { PermissionFlagsBits } from "discord.js";

import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import { getOrCreatePlayer } from "../../music/player.js";
import { messages, reactWithEmoji, CadeEmoji } from "../../utils/messages.js";

export class JoinCommand extends CadeCommand {
  name = "join";
  description = "makes the bot join vc";
  category = CommandCategory.MUSIC;

  aliases = ["j"];

  async execute({ client, message }: CommandContext): Promise<void> {
    const guild = message.guild;
    const member = message.member;

    if (!guild || !member) return;

    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      await message.reply(messages.errors.player.invokerNotConnected);
      return;
    }

    if (!client.user) return;

    const permissions = voiceChannel.permissionsFor(client.user);

    if (
      !permissions?.has([
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
      ])
    ) {
      await message.reply(messages.errors.player.noPermission);
      return;
    }

    const existing = client.lavalink?.players.get(guild.id);

    if (
      existing?.voiceChannelId &&
      existing.voiceChannelId !== voiceChannel.id
    ) {
      await message.reply(messages.errors.player.alreadyConnectedToAnotherVC);
      return;
    }

    try {
      await getOrCreatePlayer(client, {
        guildId: guild.id,
        voiceChannelId: voiceChannel.id,
        textChannelId: message.channel.id,
      });

      await reactWithEmoji(message, CadeEmoji.SUCCESS);

      this.sendInfoToLog(`Joined ${voiceChannel.name} in ${guild.name}`);
    } catch (error) {
      this.sendErrorToLog(error);

      await message.reply(messages.errors.join.failed);
    }
  }
}

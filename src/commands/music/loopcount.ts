import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import {
  getPlayer,
  isPlayerConnected,
  isSameVoiceChannel,
} from "../../music/player.js";

export class LoopCountCommand extends CadeCommand {
  name = "loopcount";
  description = "shows how many times the current track has looped";
  category = CommandCategory.MUSIC;

  async execute({ client, message }: CommandContext): Promise<void> {
    const guild = message.guild;
    const member = message.member;

    if (!guild || !member) {
      return;
    }

    const player = getPlayer(client, guild.id);

    if (!player || !isPlayerConnected(player)) {
      await message.reply("messages.errors.player.notConnected");
      return;
    }

    if (!isSameVoiceChannel(member, player)) {
      await message.reply("messages.errors.player.notSameVC");
      return;
    }

    const track = player.queue.current;

    if (!track) {
      await message.reply("messages.errors.player.notPlaying");
      return;
    }

    const count = player.getData<number>("loopCount") ?? 0;
    const suffix = count === 1 ? "" : "s";

    await message.reply({
      content:
        `🔁 **${track.info.title}** has looped ` +
        `**${count}** time${suffix}.`,
      allowedMentions: {
        parse: [],
      },
    });
  }
}

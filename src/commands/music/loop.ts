import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import {
  getPlayer,
  isPlayerConnected,
  isSameVoiceChannel,
} from "../../music/player.js";

import { messages } from "../../utils/messages.js";

export class LoopCommand extends CadeCommand {
  name = "loop";
  description = "toggles repeating the current track";
  category = CommandCategory.MUSIC;
  aliases = ["l"];

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

    const currentTrack = player.queue.current;

    if (!currentTrack) {
      await message.reply(messages.errors.player.notPlaying);
      return;
    }

    if (player.repeatMode === "track") {
      await player.setRepeatMode("off");

      player.setData("loopCount", 0);
      player.deleteData("loopTrackIdentifier");

      await message.reply(messages.success.loop.disabled);

      return;
    }

    player.setData("loopTrackIdentifier", currentTrack.info.identifier);
    player.setData("loopCount", 0);

    await player.setRepeatMode("track");

    await message.reply({
      content: messages.success.loop.enabled,
      allowedMentions: { parse: [] },
    });
  }
}

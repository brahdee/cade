import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import {
  getPlayer,
  isPlayerConnected,
  isSameVoiceChannel,
} from "../../music/player.js";

import { prepareShuffledNextTrack } from "../../music/queue.js";

import { messages } from "../../utils/messages.js";

export class ShuffleCommand extends CadeCommand {
  name = "shuffle";
  description = "toggles random selection of upcoming tracks";
  category = CommandCategory.MUSIC;

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

    if (player.queue.tracks.length === 0) {
      await message.reply(messages.errors.shuffle.empty);
      return;
    }

    const shuffleEnabled = player.getData<boolean>("shuffleMode") === true;

    const newShuffleMode = !shuffleEnabled;

    player.setData("shuffleMode", newShuffleMode);

    if (newShuffleMode) {
      await prepareShuffledNextTrack(player);

      await message.reply(messages.success.shuffle.enabled);
    } else {
      await message.reply(messages.success.shuffle.disabled);
    }
  }
}

import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import {
  getPlayer,
  isPlayerConnected,
  isSameVoiceChannel,
} from "../../music/player.js";

import {
  getQueueTrackTitle,
  getTrackPlaylistName,
  prepareShuffledNextTrack,
  restoreQueueSnapshot,
  saveQueueSnapshot,
} from "../../music/queue.js";

import { messages, reactSuccess } from "../../utils/messages.js";

export class SkipCommand extends CadeCommand {
  name = "skip";
  description = "skips the current track or manages upcoming tracks";
  category = CommandCategory.MUSIC;
  aliases = ["s"];

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

    const input = rawArgs.trim();

    if (!input) {
      if (!player.queue.current) {
        await message.reply(messages.errors.player.notPlaying);
        return;
      }

      await player.setRepeatMode("off");
      await player.skip(0, false);

      await reactSuccess(message);
      return;
    }

    const skipTo = input.endsWith("^");
    const query = (skipTo ? input.slice(0, -1) : input).trim();

    if (!query) {
      await message.reply(messages.errors.skip.invalidUsage);
      return;
    }

    const normalizedQuery = query.toLowerCase();

    if (normalizedQuery === "undo" && !skipTo) {
      const restored = await restoreQueueSnapshot(player);

      if (!restored) {
        await message.reply(messages.errors.skip.noQueueHistory);
        return;
      }

      await prepareShuffledNextTrack(player);
      await reactSuccess(message);
      return;
    }

    if (normalizedQuery === "all") {
      saveQueueSnapshot(player);

      if (player.queue.tracks.length > 0) {
        await player.queue.splice(0, player.queue.tracks.length);
      }

      await message.reply(messages.success.queue.cleared);
      return;
    }

    if (/^\d+$/.test(query)) {
      const index = Number(query);

      if (
        !Number.isSafeInteger(index) ||
        index < 1 ||
        index > player.queue.tracks.length
      ) {
        await message.reply(messages.errors.skip.trackNotInQueue);
        return;
      }

      if (skipTo) {
        saveQueueSnapshot(player);

        await player.setRepeatMode("off");
        await player.skip(index, false);

        await reactSuccess(message);
        return;
      }

      saveQueueSnapshot(player);

      const result = await player.queue.remove(index - 1);
      const removedTrack = result?.removed[0];

      if (!removedTrack) {
        await message.reply(messages.errors.skip.trackNotInQueue);
        return;
      }

      await prepareShuffledNextTrack(player);

      await message.reply(messages.success.skip.trackSkipped);
      return;
    }

    const playlistIndexes: number[] = [];
    let matchedPlaylist: string | null = null;

    player.queue.tracks.forEach((track, index) => {
      const playlistName = getTrackPlaylistName(track);

      if (playlistName && playlistName.toLowerCase() === normalizedQuery) {
        matchedPlaylist ??= playlistName;
        playlistIndexes.push(index);
      }
    });

    if (matchedPlaylist && playlistIndexes.length > 0) {
      saveQueueSnapshot(player);

      if (skipTo) {
        const firstIndex = playlistIndexes[0];

        if (firstIndex > 0) {
          await player.queue.splice(0, firstIndex);
        }

        await player.setRepeatMode("off");
        await player.skip(0, false);

        await reactSuccess(message);
        return;
      }

      await prepareShuffledNextTrack(player);

      await message.reply(messages.success.skip.playlistSkipped);
      return;
    }

    const matchingIndex = player.queue.tracks.findIndex((track) =>
      getQueueTrackTitle(track).toLowerCase().includes(normalizedQuery),
    );

    if (matchingIndex === -1) {
      await message.reply(messages.errors.skip.trackNotInQueue);
      return;
    }

    saveQueueSnapshot(player);

    if (skipTo) {
      if (matchingIndex > 0) {
        await player.queue.splice(0, matchingIndex);
      }

      await player.setRepeatMode("off");
      await player.skip(0, false);

      await reactSuccess(message);
      return;
    }

    await player.queue.remove(matchingIndex);
    await prepareShuffledNextTrack(player);

    await message.reply(messages.success.skip.trackSkipped);
  }
}

import { PermissionFlagsBits } from "discord.js";

import { getOrCreatePlayer } from "../../music/player.js";

import { searchTracks, getSearchError } from "../../music/tracks.js";

import { prepareShuffledNextTrack } from "../../music/queue.js";
import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";
import { messages } from "../../utils/messages.js";

export class PlayCommand extends CadeCommand {
  name = "play";
  description = "plays a track or playlist from YouTube";
  category = CommandCategory.MUSIC;

  aliases = ["p"];
  usage = "[url/query]";

  async execute({ client, message, rawArgs }: CommandContext): Promise<void> {
    const guild = message.guild;

    if (!guild || !message.member) return;

    const query = rawArgs.trim().replace(/^<(.+)>$/, "$1");

    if (!query) {
      await message.reply(messages.errors.play.noQuery);
      return;
    }

    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
      await message.reply(messages.errors.player.invokerNotConnected);
      return;
    }

    if (!client.user) return;

    const permissions = voiceChannel.permissionsFor(
      guild.members.me ?? client.user,
    );

    if (
      !permissions?.has([
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
      ])
    ) {
      await message.reply(messages.errors.player.noPermission);
      return;
    }

    try {
      const player = await getOrCreatePlayer(client, {
        guildId: guild.id,
        voiceChannelId: voiceChannel.id,
        textChannelId: message.channel.id,
      });

      const result = await searchTracks(
        player,
        query,
        message.author,
        "youtube",
      );

      const searchError = getSearchError(result);

      if (searchError) {
        await message.reply(searchError);
        return;
      }

      const firstTrack = result.tracks[0];

      if (!firstTrack) {
        await message.reply(messages.errors.play.noTracksFound);
        return;
      }

      const isPlaylist = result.loadType === "playlist";

      const tracks = isPlaylist ? result.tracks : [firstTrack];

      if (tracks.length === 0) {
        await message.reply(messages.errors.play.noTracksFound);
        return;
      }

      const playlistName = result.playlist?.name;

      if (playlistName) {
        for (const track of tracks) {
          track.userData = {
            ...track.userData,
            playlistName,
          };
        }
      }

      const wasPlaying = player.playing || player.paused;

      await player.queue.add(tracks);

      await prepareShuffledNextTrack(player);

      if (!player.playing && !player.paused) {
        await player.play();
      }

      if (wasPlaying || isPlaylist) {
        await message.reply({
          content: messages.success.play.addedToQueue,
          allowedMentions: {
            parse: [],
          },
        });
      }

      this.sendInfoToLog(
        `${message.author.tag} queued ${tracks.length} track(s) in ${guild.name}`,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("another voice channel")
      ) {
        await message.reply(messages.errors.player.alreadyConnectedToAnotherVC);

        return;
      }

      this.sendErrorToLog(error);

      await message.reply(messages.errors.play.failed);
    }
  }
}

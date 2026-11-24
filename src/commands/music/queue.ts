import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from "discord.js";

import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import {
  getPlayer,
  isPlayerConnected,
  isSameVoiceChannel,
  type CadePlayer,
} from "../../music/player.js";
import { formatDuration } from "../../music/tracks.js";

import { messages } from "../../utils/messages.js";

const EMBED_COLOR = 0xeac597;
const TRACKS_PER_PAGE = 10;
const COLLECTOR_TIMEOUT = 60_000;

type QueueTrack = CadePlayer["queue"]["tracks"][number];
type DisplayTrack = QueueTrack | NonNullable<CadePlayer["queue"]["current"]>;

function getTrackLink(track: DisplayTrack): string {
  const title = track.info.title.replace(/\s+/g, " ").slice(0, 100);

  return track.info.uri ? `[${title}](${track.info.uri})` : `**${title}**`;
}

function getTrackLength(track: DisplayTrack): string {
  return track.info.isStream ? "LIVE" : formatDuration(track.info.duration);
}

function createQueueEmbed(
  currentTrack: NonNullable<CadePlayer["queue"]["current"]> | null,
  queuedTracks: QueueTrack[],
  page: number,
): EmbedBuilder {
  const pageCount = Math.max(
    1,
    Math.ceil(queuedTracks.length / TRACKS_PER_PAGE),
  );
  const startIndex = page * TRACKS_PER_PAGE;
  const pageTracks = queuedTracks.slice(
    startIndex,
    startIndex + TRACKS_PER_PAGE,
  );

  const description: string[] = [];

  if (currentTrack) {
    description.push(
      "-# Currently Playing",
      getTrackLink(currentTrack),
      `-# ${getTrackLength(currentTrack)} • by **${currentTrack.info.author}**`,
      "",
    );
  } else {
    description.push("-# Nothing is currently playing", "");
  }

  if (queuedTracks.length === 0) {
    description.push("**The queue is empty.**");
  } else {
    description.push(`**Up Next • ${queuedTracks.length} tracks**`);

    description.push(
      ...pageTracks.map((track, index) => {
        const queuePosition = startIndex + index + 1;

        return [
          `${queuePosition}. ${getTrackLink(track)}`,
          `   -# ${getTrackLength(track)} • by **${track.info.author}**`,
        ].join("\n");
      }),
    );
  }

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(description.join("\n"))
    .setFooter({
      text: `${queuedTracks.length} tracks queued • Page ${page + 1}/${pageCount}`,
    });

  if (currentTrack?.info.artworkUrl) {
    embed.setThumbnail(currentTrack.info.artworkUrl);
  }

  return embed;
}

function createQueueButtons(
  page: number,
  pageCount: number,
): ActionRowBuilder<ButtonBuilder>[] {
  if (pageCount <= 1) {
    return [];
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("queue:previous")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),

    new ButtonBuilder()
      .setCustomId("queue:next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= pageCount - 1),
  );

  return [row];
}

export class QueueCommand extends CadeCommand {
  name = "queue";
  description = "shows the current music queue";
  category = CommandCategory.MUSIC;
  aliases = ["q"];

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
    const queuedTracks = [...player.queue.tracks];

    if (!currentTrack && queuedTracks.length === 0) {
      await message.reply(messages.errors.queue.empty);
      return;
    }

    let page = 0;

    const pageCount = Math.max(
      1,
      Math.ceil(queuedTracks.length / TRACKS_PER_PAGE),
    );

    const sentMessage = await message.reply({
      embeds: [createQueueEmbed(currentTrack, queuedTracks, page)],
      components: createQueueButtons(page, pageCount),
      allowedMentions: {
        parse: [],
      },
    });

    if (pageCount <= 1) {
      return;
    }

    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: COLLECTOR_TIMEOUT,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({
          content: messages.errors.queue.onlyInvoker,
          ephemeral: true,
        });
        return;
      }

      if (interaction.customId === "queue:previous") {
        page = Math.max(0, page - 1);
      } else if (interaction.customId === "queue:next") {
        page = Math.min(pageCount - 1, page + 1);
      } else {
        return;
      }

      await interaction.update({
        embeds: [createQueueEmbed(currentTrack, queuedTracks, page)],
        components: createQueueButtons(page, pageCount),
      });
    });

    collector.on("end", () => {
      void sentMessage.edit({ components: [] }).catch(() => undefined);
    });
  }
}

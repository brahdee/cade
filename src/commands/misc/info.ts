import { EmbedBuilder } from "discord.js";

import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import {
  getCommandCount,
  getTotalCommandCount,
  getStatsStartedAt,
} from "../../database/stats.js";

import { getGitInfo, REPOSITORY_URL } from "../../utils/git.js";

import { messages } from "../../utils/messages.js";

const CADE_COLOR = 0xeac597;

const CAT_IMAGES = [
  "https://i.imgur.com/1WCgVB5.jpg",
  "https://i.imgur.com/o2Mv3id.gif",
  "https://i.imgur.com/jBdFw84.jpg",
  "https://i.imgur.com/q5MlyL1.jpg",
  "https://i.imgur.com/7lt16yi.jpg",
  "https://i.imgur.com/mXKsgNU.jpg",
  "https://i.imgur.com/UmmYVhK.jpg",
];

function formatUptime(milliseconds: number): string {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);

  const days = Math.floor(totalSeconds / 86400);

  const hours = Math.floor((totalSeconds % 86400) / 3600);

  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const seconds = totalSeconds % 60;

  const clock = [
    hours,
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");

  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"}, ${clock}`;
  }

  return clock;
}

function formatLatestUpdate(
  gitInfo: Awaited<ReturnType<typeof getGitInfo>>,
): string {
  if (!gitInfo) {
    return "unavailable";
  }

  return [
    `<t:${gitInfo.timestamp}:R>`,
    `[\`#${gitInfo.commitCount}\`](${REPOSITORY_URL}/commit/${gitInfo.hash})`,
    `- ${gitInfo.message}`,
  ].join(" ");
}

export class InfoCommand extends CadeCommand {
  name = "info";
  description = "get information about the bot or a command";
  category = CommandCategory.MISC;
  usage = "*[command]";

  async execute({
    client,
    message,
    args,
    prefix,
  }: CommandContext): Promise<void> {
    if (args[0]) {
      const command = client.getCommand(args[0]);

      if (!command) {
        await message.reply(messages.errors.info.notFound);
        return;
      }

      const count = await getCommandCount(command.name);

      await message.reply(
        `**${command.name}** has been run \`${count}\` time(s)`,
      );

      return;
    }

    const [totalInvocations, statsStartedAt, gitInfo] = await Promise.all([
      getTotalCommandCount(),
      getStatsStartedAt(),
      getGitInfo(),
    ]);

    const ping = client.ws.ping;

    const pingText = ping >= 0 ? `\`${ping.toFixed(1)} ms\`` : "`unavailable`";

    const uptime = formatUptime(Date.now() - client.startedAt);

    const userCount = client.users.cache.filter((user) => !user.bot).size;

    const guildCount = client.guilds.cache.size;

    const embed = new EmbedBuilder()
      .setColor(CADE_COLOR)
      .setTitle("cade")
      .setDescription(
        [
          "hi",
          `**[view on github](${REPOSITORY_URL})**`,
          `use \`${prefix}help\` for help. created <t:1645760853:R>!`,
        ].join("\n"),
      )
      .addFields(
        {
          name: "uptime",
          value: `\`${uptime}\``,
          inline: true,
        },
        {
          name: "ping",
          value: pingText,
          inline: true,
        },
        {
          name: "# of commands run",
          value: `\`${totalInvocations}\``,
          inline: true,
        },
      )
      .addFields({
        name: "latest update",
        value: formatLatestUpdate(gitInfo),
        inline: false,
      })
      .setThumbnail(CAT_IMAGES[Math.floor(Math.random() * CAT_IMAGES.length)])
      .setFooter({
        text: `in ${guildCount} server(s) with ${userCount} total user(s)`,
      });

    await message.reply({
      embeds: [embed],
    });
  }
}

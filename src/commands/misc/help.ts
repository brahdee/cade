import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

import type { CadeClient } from "../../bot/cade.js";
import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import { messages } from "../../utils/messages.js";

const EMBED_COLOR = 0x2f3136;

export type HelpPage = CommandCategory | "none";

export function createMainHelpEmbed(prefix: string) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(
      [
        "choose a category below to see the commands for it.",
        `use \`${prefix}help [command]\` to see more information!`,
      ].join("\n"),
    );
}

export function createCategoryHelpEmbed(
  client: CadeClient,
  prefix: string,
  category: CommandCategory,
) {
  const commands = [...client.commands.values()].filter(
    (command) => command.category === category && !command.hidden,
  );

  if (commands.length === 0) {
    return new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(`${category} Commands`)
      .setDescription("no commands have been added yet.");
  }

  const longest = Math.max(...commands.map((command) => command.name.length));

  const commandList = commands
    .map((command) => {
      const name = command.name.padEnd(longest);

      return `\`${prefix}${name}\` - ${command.description}`;
    })
    .join("\n");

  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(`${category} Commands`)
    .setDescription(commandList);
}

export function createHelpButtons(userId: string, selected: HelpPage = "none") {
  const buttons = [
    new ButtonBuilder()
      .setCustomId(`cade:help:${userId}:none`)
      .setLabel("yo")
      .setStyle(
        selected === "none" ? ButtonStyle.Primary : ButtonStyle.Secondary,
      ),

    ...Object.values(CommandCategory).map((category) =>
      new ButtonBuilder()
        .setCustomId(`cade:help:${userId}:${category}`)
        .setLabel(category)
        .setStyle(
          selected === category ? ButtonStyle.Primary : ButtonStyle.Secondary,
        ),
    ),
  ];

  return [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)];
}

export function createCommandHelpEmbed(command: CadeCommand, prefix: string) {
  let description = `**${prefix}${command.name}** - ${command.description}`;

  if (command.name === "help") {
    description = "are you serious";
  }

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setDescription(description);

  if (command.usage) {
    let usage = command.usage;

    if (usage.includes("*")) {
      embed.setFooter({
        text: "* - optional",
      });
    }

    const typeIndex = usage.indexOf("(");

    let argumentTypes: string | undefined;

    if (typeIndex !== -1) {
      argumentTypes = usage
        .slice(typeIndex)
        .replace(/^\**\(*|\)*\**$/g, "")
        .trim();
      usage = usage.slice(0, typeIndex).trim();
    }

    const usageText = `${prefix}${command.name} ${usage}`.trim();

    embed.addFields({
      name: "how to use:",
      value: `\`${usageText}\``,
    });

    if (argumentTypes) {
      embed.addFields({
        name: "takes:",
        value: argumentTypes,
      });
    }
  }

  if (command.aliases?.length) {
    embed.addFields({
      name: "other names:",
      value: command.aliases.map((alias) => `\`${prefix}${alias}\``).join(" "),
    });
  }

  return embed;
}

export class HelpCommand extends CadeCommand {
  name = "help";
  description = "see a list of commands";
  category = CommandCategory.MISC;
  usage = "*[command]";

  async execute({
    client,
    message,
    args,
    prefix,
  }: CommandContext): Promise<void> {
    const requestedCommand = args[0];

    if (!requestedCommand) {
      await message.reply({
        embeds: [createMainHelpEmbed(prefix)],
        components: createHelpButtons(message.author.id),
      });

      return;
    }

    const command = client.getCommand(requestedCommand);

    if (!command || command.hidden) {
      await message.reply(messages.errors.help.notFound);
      return;
    }

    const embed = createCommandHelpEmbed(command, prefix);

    await message.reply({
      embeds: [embed],
    });
  }
}

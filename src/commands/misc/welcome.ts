import { ChannelType } from "discord.js";

import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import { setWelcome } from "../../database/guilds.js";
import { isAdministrator } from "../../utils/permissions.js";
import { messages } from "../../utils/messages.js";

export class WelcomeCommand extends CadeCommand {
  name = "welcome";
  description = "sets the welcome message for the server (admin)";
  category = CommandCategory.MISC;

  usage = "[channel] *[message]";

  async execute({ message, rawArgs }: CommandContext): Promise<void> {
    const guild = message.guild;

    if (!guild) return;

    if (!isAdministrator(message)) {
      await message.reply(messages.errors.welcome.noPermission);
      return;
    }

    const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(rawArgs.trim());

    if (!match) {
      await message.reply(messages.errors.welcome.invalidUsage);
      return;
    }

    const channelToken = match[1];
    const welcomeText = (match[2] ?? "").trim();

    if (["off", "disable"].includes(channelToken.toLowerCase())) {
      await setWelcome(guild.id, null, null);

      await message.reply(messages.success.welcome.disabled);
      return;
    }

    const channelMention = /^<#(\d+)>$/.exec(channelToken);

    const channelId =
      channelMention?.[1] ??
      (/^\d{17,20}$/.test(channelToken) ? channelToken : undefined);

    const channelName = channelToken.replace(/^#/, "").toLowerCase();

    const channel = channelId
      ? await guild.channels.fetch(channelId).catch(() => null)
      : (guild.channels.cache.find(
          (candidate) => candidate.name.toLowerCase() === channelName,
        ) ?? null);

    if (
      !channel ||
      (channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildAnnouncement)
    ) {
      await message.reply(messages.errors.welcome.invalidChannel);
      return;
    }

    const attachment = message.attachments.first();

    const content = [welcomeText, attachment?.url].filter(Boolean).join("\n");

    if (!content) {
      await setWelcome(guild.id, null, null);

      await message.reply(messages.success.welcome.disabled);
      return;
    }

    if (content.length > 2000) {
      await message.reply(messages.errors.welcome.tooLong);
      return;
    }

    await setWelcome(guild.id, content, channel.id);

    await message.reply(messages.success.welcome.updated);
  }
}

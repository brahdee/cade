import type { Message } from "discord.js";

import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import { getTag, createTag } from "../../database/tags.js";

import { messages } from "../../utils/messages.js";

async function getAttachmentUrl(
  message: Message,
  command: CadeCommand,
): Promise<string | undefined> {
  const attachment = message.attachments.first();

  if (attachment) {
    return attachment.url;
  }

  if (!message.reference?.messageId) {
    return undefined;
  }

  try {
    const referencedMessage = await message.fetchReference();

    return referencedMessage.attachments.first()?.url;
  } catch (error) {
    command.sendErrorToLog(error);

    return undefined;
  }
}

export class TagCommand extends CadeCommand {
  name = "tag";
  description = "sends/creates a tag containing a given message";
  category = CommandCategory.MISC;

  aliases = ["t"];
  usage = "[tag-name] *[message]";

  async execute({ message, rawArgs }: CommandContext): Promise<void> {
    const guildId = message.guildId;

    if (!guildId) return;

    const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(rawArgs.trim());

    if (!match) {
      await message.reply(messages.errors.tag.missingName);
      return;
    }

    const name = match[1].toLowerCase();
    let content = (match[2] ?? "").trim();

    const attachmentUrl = await getAttachmentUrl(message, this);

    if (attachmentUrl) {
      content = [content, attachmentUrl].filter(Boolean).join("\n");
    }

    if (!content) {
      const tagContent = await getTag(guildId, name);

      if (tagContent === undefined) {
        await message.reply(messages.errors.tag.notFound);
        return;
      }

      await message.reply({
        content: tagContent,
        allowedMentions: { parse: [] },
      });

      return;
    }

    if (content.length > 2000) {
      await message.reply(messages.errors.tag.contentTooLong);
      return;
    }

    const created = await createTag(guildId, name, content);

    if (!created) {
      await message.reply(messages.errors.tag.alreadyExists);
      return;
    }

    await message.reply(messages.success.tag.added);
  }
}

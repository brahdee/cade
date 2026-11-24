import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import {
  validateYouTubeUrl,
  type YouTubeTimeRange,
} from "../../media/youtube.js";

import { createGetRequest, cancelGetRequest } from "../../media/getRequests.js";

import { messages } from "../../utils/messages.js";

function parseTimestamp(input: string): number | null {
  const parts = input.split(":");

  if (
    parts.length < 1 ||
    parts.length > 3 ||
    parts.some((part) => !/^\d+$/.test(part))
  ) {
    return null;
  }

  const values = parts.map(Number);

  if (values.some((value) => !Number.isSafeInteger(value))) {
    return null;
  }

  if (parts.length >= 2 && values.at(-1)! >= 60) {
    return null;
  }

  if (parts.length === 3 && values[1] >= 60) {
    return null;
  }

  switch (values.length) {
    case 1:
      return values[0];

    case 2:
      return values[0] * 60 + values[1];

    case 3:
      return values[0] * 3600 + values[1] * 60 + values[2];

    default:
      return null;
  }
}

export class GetCommand extends CadeCommand {
  name = "get";
  description = "Downloads a YouTube video or audio";
  category = CommandCategory.MEDIA;

  usage = "get <youtube-url> *<start-time> *<end-time>";

  async execute({ message, args }: CommandContext): Promise<void> {
    if (args.length !== 1 && args.length !== 3) {
      await message.reply(messages.errors.get.invalidUsage);

      return;
    }

    const rawUrl = args[0];

    if (!rawUrl) {
      await message.reply(messages.errors.get.invalidUrl);
      return;
    }

    let url: string;

    try {
      url = validateYouTubeUrl(rawUrl.replace(/^<(.+)>$/, "$1"));
    } catch {
      await message.reply(messages.errors.get.invalidUrl);
      return;
    }

    let range: YouTubeTimeRange | undefined;

    if (args.length === 3) {
      const start = parseTimestamp(args[1]!);
      const end = parseTimestamp(args[2]!);

      if (start === null || end === null || end <= start) {
        await message.reply(messages.errors.get.invalidTime);

        return;
      }

      range = { start, end };
    }

    const requestId = createGetRequest({
      userId: message.author.id,
      url,
      range,
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`cade:get:${requestId}:video`)
        .setLabel("video (mp4)")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`cade:get:${requestId}:audio`)
        .setLabel("audio (mp3)")
        .setStyle(ButtonStyle.Secondary),
    );

    try {
      await message.reply({
        content: messages.media.get.chooseFormat,
        components: [row],
      });
    } catch (error) {
      this.sendErrorToLog(error);

      cancelGetRequest(requestId);
    }
  }
}

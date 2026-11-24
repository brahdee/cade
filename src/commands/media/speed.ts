import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import { getFirstMedia } from "../../media/index.js";

import {
  speedMedia,
  DEFAULT_SPEED,
  MIN_SPEED,
  MAX_SPEED,
} from "../../media/speed.js";

import { messages } from "../../utils/messages.js";

function parseMultiplier(input: string): number | undefined {
  if (!/^\d+(?:\.\d+)?$/.test(input)) {
    return undefined;
  }

  const value = Number(input);

  if (!Number.isFinite(value) || value < MIN_SPEED || value > MAX_SPEED) {
    return undefined;
  }

  return value;
}

export class SpeedCommand extends CadeCommand {
  name = "speed";
  description = "Changes the speed of a GIF or video";
  category = CommandCategory.MEDIA;

  usage = "speed *<multiplier> (gif/video)";

  async execute({ message, args }: CommandContext): Promise<void> {
    if (args.length > 1) {
      await message.reply(messages.errors.speed.invalidUsage);
      return;
    }

    const multiplier =
      args.length === 1 ? parseMultiplier(args[0]!) : DEFAULT_SPEED;

    if (multiplier === undefined) {
      await message.reply(messages.errors.speed.invalidMultiplier);
      return;
    }

    const status = await message.reply(messages.processing.speed);

    try {
      const media = await getFirstMedia(message, {
        allowedKinds: ["image", "video"],
        allowedMimeTypes: [
          "image/gif",
          "video/mp4",
          "video/webm",
          "video/quicktime",
        ],
      });

      if (!media) {
        await status.edit(messages.errors.speed.noMedia);
        return;
      }

      const result = await speedMedia(media, multiplier);

      await status.edit({
        content: "",
        files: [
          {
            attachment: result.buffer,
            name: result.filename,
          },
        ],
      });
    } catch (error) {
      this.sendErrorToLog(error);

      await status.edit(messages.errors.speed.failed);
    }
  }
}

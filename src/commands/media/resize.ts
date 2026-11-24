import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import {
  downloadMedia,
  getFirstMedia,
  resolveMedia,
} from "../../media/index.js";

import { resizeMedia, type ResizeDimensions } from "../../media/resize.js";

import { messages } from "../../utils/messages.js";

function parseDimension(input: string): number | null | undefined {
  if (input.toLowerCase() === "auto") {
    return null;
  }

  if (!/^\d+$/.test(input)) {
    return undefined;
  }

  const value = Number(input);

  if (!Number.isSafeInteger(value) || value < 2 || value > 2 ** 12) {
    return undefined;
  }

  return value;
}

export class ResizeCommand extends CadeCommand {
  name = "resize";
  description = "Resizes an image, GIF, or video";
  category = CommandCategory.MEDIA;

  usage = "resize <width|auto> *<height|auto>";

  async execute({ message, args }: CommandContext): Promise<void> {
    if (args.length < 1 || args.length > 2) {
      await message.reply(messages.errors.resize.invalidUsage);

      return;
    }

    const width = parseDimension(args[0]!);

    const height = args.length === 2 ? parseDimension(args[1]!) : null;

    if (
      width === undefined ||
      height === undefined ||
      (width === null && height === null)
    ) {
      await message.reply(messages.errors.resize.invalidDimensions);

      return;
    }

    const dimensions: ResizeDimensions = {};

    if (width !== null) {
      dimensions.width = width;
    }

    if (height !== null) {
      dimensions.height = height;
    }

    const status = await message.reply(messages.processing.resize);

    try {
      const media = await getFirstMedia(message, {
        allowedKinds: ["image", "video"],
      });

      if (!media) {
        await status.edit(messages.errors.resize.noMedia);

        return;
      }

      const result = await resizeMedia(media, dimensions);

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

      await status.edit(messages.errors.resize.failed);
    }
  }
}

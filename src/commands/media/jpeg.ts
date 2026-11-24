import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import { getFirstMedia } from "../../media/index.js";
import { jpegMedia } from "../../media/jpeg.js";

import { messages } from "../../utils/messages.js";

export class JpegCommand extends CadeCommand {
  name = "jpeg";
  description = "Lowers the quality of an image";
  category = CommandCategory.MEDIA;

  usage = "jpeg (image)";

  async execute({ message, args }: CommandContext): Promise<void> {
    if (args.length !== 0) {
      await message.reply(messages.errors.jpeg.invalidUsage);
      return;
    }

    const status = await message.reply(messages.processing.jpeg);

    try {
      const media = await getFirstMedia(message, {
        allowedKinds: ["image"],
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/avif",
        ],
      });

      if (!media) {
        await status.edit(messages.errors.jpeg.noMedia);
        return;
      }

      const result = await jpegMedia(media);

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

      await status.edit(messages.errors.jpeg.failed);
    }
  }
}

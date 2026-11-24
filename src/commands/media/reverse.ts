import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import { getFirstMedia } from "../../media/index.js";
import { reverseMedia } from "../../media/reverse.js";

import { messages } from "../../utils/messages.js";

export class ReverseCommand extends CadeCommand {
  name = "reverse";
  description = "Reverses a GIF";
  category = CommandCategory.MEDIA;

  usage = "reverse (gif)";

  async execute({ message, args }: CommandContext): Promise<void> {
    if (args.length !== 0) {
      await message.reply(messages.errors.reverse.invalidUsage);
      return;
    }

    const status = await message.reply(messages.processing.reverse);

    try {
      const media = await getFirstMedia(message, {
        allowedKinds: ["image"],
        allowedMimeTypes: ["image/gif"],
      });

      if (!media) {
        await status.edit(messages.errors.reverse.noMedia);
        return;
      }

      const result = await reverseMedia(media);

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

      await status.edit(messages.errors.reverse.failed);
    }
  }
}

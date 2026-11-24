import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import { getFirstMedia } from "../../media/index.js";
import { processCaption } from "../../media/pycaption.js";

import { messages } from "../../utils/messages.js";

export class UncaptionCommand extends CadeCommand {
  name = "uncaption";
  description = "Removes a caption from an image or GIF";
  category = CommandCategory.MEDIA;

  usage = "uncaption";

  async execute({ message, args }: CommandContext): Promise<void> {
    if (args.length !== 0) {
      await message.reply(messages.errors.uncaption.invalidUsage);
      return;
    }

    const status = await message.reply(messages.processing.uncaption);

    try {
      const media = await getFirstMedia(message, {
        allowedKinds: ["image"],
      });

      if (!media) {
        await status.edit(messages.errors.uncaption.noMedia);
        return;
      }

      const result = await processCaption(media, "uncaption");

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

      await status.edit(messages.errors.uncaption.failed);
    }
  }
}

import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import { getFirstMedia } from "../../media/index.js";
import { processCaption } from "../../media/pycaption.js";

import { messages } from "../../utils/messages.js";

const MAX_CAPTION_LENGTH = 500;

export class CaptionCommand extends CadeCommand {
  name = "caption";
  description = "Adds an iFunny-style caption to an image or GIF";
  category = CommandCategory.MEDIA;

  usage = "caption <text>";

  async execute({ message, rawArgs }: CommandContext): Promise<void> {
    const caption = rawArgs.trim();

    if (!caption) {
      await message.reply(messages.errors.caption.missingText);
      return;
    }

    if (caption.length > MAX_CAPTION_LENGTH) {
      await message.reply(messages.errors.caption.tooLong);
      return;
    }

    const status = await message.reply(messages.processing.caption);

    try {
      const media = await getFirstMedia(message, {
        allowedKinds: ["image"],
      });

      if (!media) {
        await status.edit(messages.errors.caption.noMedia);
        return;
      }

      const result = await processCaption(media, "caption", caption);

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

      await status.edit(messages.errors.caption.failed);
    }
  }
}

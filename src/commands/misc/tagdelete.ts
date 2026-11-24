import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import { deleteTag } from "../../database/tags.js";
import { messages } from "../../utils/messages.js";

export class TagDeleteCommand extends CadeCommand {
  name = "tagdelete";
  description = "deletes the specified tag if it exists";
  category = CommandCategory.MISC;

  aliases = ["tagdel", "tdel"];
  usage = "[tag-name]";

  async execute({ message, args }: CommandContext): Promise<void> {
    const guildId = message.guildId;

    if (!guildId) return;

    const name = args[0]?.toLowerCase();

    if (!name) {
      await message.reply(messages.errors.tag.missingName);
      return;
    }

    const deleted = await deleteTag(guildId, name);

    if (!deleted) {
      await message.reply(messages.errors.tag.notFound);
      return;
    }

    await message.reply(messages.success.tag.removed);
  }
}

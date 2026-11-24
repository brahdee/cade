import { EmbedBuilder } from "discord.js";

import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import { getTags } from "../../database/tags.js";
import { messages } from "../../utils/messages.js";

const EMBED_COLOR = 0x2f3136;

export class TagListCommand extends CadeCommand {
  name = "taglist";
  description = "lists every tag in the server";
  category = CommandCategory.MISC;

  aliases = ["tlist", "tags"];

  async execute({ message }: CommandContext): Promise<void> {
    const guildId = message.guildId;

    if (!guildId) return;

    const tags = await getTags(guildId);

    const tagNames = Object.keys(tags).sort((a, b) => a.localeCompare(b));

    if (tagNames.length === 0) {
      await message.reply(messages.errors.tag.noneCreated);
      return;
    }

    let description = "";
    let displayedCount = 0;

    for (const name of tagNames) {
      const escapedName = name.replaceAll("`", "\\`");

      const entry = `\`${escapedName}\``;

      const separator = displayedCount > 0 ? ", " : "";

      if (description.length + separator.length + entry.length > 3900) {
        break;
      }

      description += separator + entry;
      displayedCount++;
    }

    const remaining = tagNames.length - displayedCount;

    if (remaining > 0) {
      description += `\n\nAnd ${remaining} more...`;
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle("Tags:")
      .setDescription(description);

    await message.reply({
      embeds: [embed],
    });
  }
}

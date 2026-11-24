import { CadeCommand, CommandCategory, type CommandContext } from "../types.js";

import { getPrefix, setPrefix } from "../../database/guilds.js";
import { isAdministrator } from "../../utils/permissions.js";

import { messages } from "../../utils/messages.js";

export class SetPrefixCommand extends CadeCommand {
  name = "setprefix";
  description = "sets the bot prefix for the server (admin)";
  category = CommandCategory.MISC;

  aliases = ["prefix"];
  usage = "[prefix]";

  async execute({ client, message, args }: CommandContext): Promise<void> {
    const guildId = message.guildId;

    if (!guildId) return;

    if (!isAdministrator(message)) {
      await message.reply(messages.errors.setprefix.noPermission);
      return;
    }

    const newPrefix = args[0];

    if (!newPrefix) {
      const currentPrefix = await getPrefix(guildId, client.defaultPrefix);

      await message.reply(
        `the current prefix is \`${currentPrefix}\` (default is \`${client.defaultPrefix}\`)`,
      );

      return;
    }

    if (newPrefix.length > 3) {
      await message.reply(messages.errors.setprefix.tooLong);
      return;
    }

    await setPrefix(guildId, newPrefix);

    await message.reply(messages.success.setprefix.updated);
  }
}

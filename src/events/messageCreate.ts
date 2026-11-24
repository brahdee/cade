import type { Message } from "discord.js";

import type { CadeClient } from "../bot/cade.js";

import { incrementCommandCount } from "../database/stats.js";
import { CadeEmoji, reactWithEmoji } from "../utils/messages.js";

export async function handleMessageCreate(
  client: CadeClient,
  message: Message,
): Promise<void> {
  if (message.author.bot || !message.guildId) return;

  try {
    const prefix = await client.resolvePrefix(message.guildId);

    let content: string;

    if (message.content.startsWith(prefix)) {
      content = message.content.slice(prefix.length).trim();
    } else {
      if (!client.user) return;

      switch (message.content.toLowerCase()) {
        case "i love you cade":
          await reactWithEmoji(message, CadeEmoji.HAPPY)
          break;
        case "i hate you cade":
          await reactWithEmoji(message, CadeEmoji.ANGRY)
          break;
        case "i mold you cade":
          await reactWithEmoji(message, CadeEmoji.MOLDY)
          break;
        default:
          break;
      }

      const mention = new RegExp(`^<@!?${client.user.id}>\\s*`);

      const match = mention.exec(message.content);

      if (!match) return;

      content = message.content.slice(match[0].length).trim();
    }

    if (!content) return;

    const separator = content.search(/\s/);

    const name = separator === -1 ? content : content.slice(0, separator);

    const rawArgs =
      separator === -1 ? "" : content.slice(separator).trimStart();

    const args = rawArgs ? rawArgs.split(/\s+/) : [];

    const command = client.getCommand(name);

    if (!command || command.hidden) return;

    try {
      await command.execute({
        client,
        message,
        args,
        rawArgs,
        prefix,
      });
    } catch (error) {
      console.error(`[Commands] Error executing ${command.name}:`, error);

      await message.reply("something went wrong while executing that command.");

      return;
    }

    try {
      await incrementCommandCount(command.name);
    } catch (error) {
      console.error("[Database] Failed to update command statistics:", error);
    }
  } catch (error) {
    console.error("[Commands] Message handler error:", error);
  }
}

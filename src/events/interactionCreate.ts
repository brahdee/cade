import { MessageFlags, type Interaction } from "discord.js";

import type { CadeClient } from "../bot/cade.js";

import {
  createMainHelpEmbed,
  createCategoryHelpEmbed,
  createHelpButtons,
  type HelpPage,
} from "../commands/misc/help.js";

import { handleGetInteraction } from "./getInteraction.js";
import type { YouTubeDownloadFormat } from "../media/youtube.js";

export async function handleInteractionCreate(
  client: CadeClient,
  interaction: Interaction,
): Promise<void> {
  if (!interaction.isButton()) return;

  const getMatch = /^cade:get:([a-f0-9-]{36}):(video|audio)$/.exec(
    interaction.customId,
  );

  if (getMatch) {
    const [, requestId, format] = getMatch;

    await handleGetInteraction(
      interaction,
      requestId!,
      format as YouTubeDownloadFormat,
    );

    return;
  }

  const helpMatch = /^cade:help:(\d+):(none|Music|Misc|Media)$/.exec(
    interaction.customId,
  );

  if (!helpMatch) return;

  const [, ownerId, pageValue] = helpMatch;
  const page = pageValue as HelpPage;

  if (interaction.user.id !== ownerId) {
    await interaction.reply({
      content: "only the person who used .help can use these buttons",
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const prefix = await client.resolvePrefix(interaction.guildId);

  const embed =
    page === "none"
      ? createMainHelpEmbed(prefix)
      : createCategoryHelpEmbed(client, prefix, page);

  await interaction.update({
    embeds: [embed],
    components: createHelpButtons(ownerId, page),
  });
}

import { MessageFlags, type ButtonInteraction } from "discord.js";

import { claimGetRequest } from "../media/getRequests.js";

import {
  downloadYouTube,
  type YouTubeDownloadFormat,
} from "../media/youtube.js";

import { messages } from "../utils/messages.js";

export async function handleGetInteraction(
  interaction: ButtonInteraction,
  requestId: string,
  format: YouTubeDownloadFormat,
): Promise<void> {
  const result = claimGetRequest(requestId, interaction.user.id);

  if (result.status === "forbidden") {
    await interaction.reply({
      content: messages.media.get.onlyInvoker,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  if (result.status === "expired") {
    await interaction.reply({
      content: messages.errors.get.expired,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  await interaction.update({
    content: messages.media.get.downloading(format),
    components: [],
  });

  try {
    const download = await downloadYouTube(
      result.request.url,
      format,
      result.request.range,
    );

    await interaction.editReply({
      content: "",
      files: [
        {
          attachment: download.buffer,
          name: download.filename,
        },
      ],
    });
  } catch (error) {
    console.error("[Media/Get]", error);

    await interaction.editReply({
      content: messages.errors.get.failed,
      components: [],
    });
  }
}

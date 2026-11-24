import type { Message, Attachment } from "discord.js";

import type { MediaCandidate, MediaOptions } from "./types.js";

const MAX_FILES = 5;
const MAX_SKIPPED_MESSAGES = 5;

function attachmentToCandidate(
  attachment: Attachment,
  source: "attachment" | "reply",
): MediaCandidate {
  return {
    url: attachment.url,
    filename: attachment.name,
    source,
    size: attachment.size,
  };
}

function extractUrls(content: string): string[] {
  const matches = content.match(/https?:\/\/[^\s<>"']+/gi) ?? [];

  return matches.map((url) => url.replace(/[),.!?;:]+$/, ""));
}

function extractEmbedUrls(message: Message): string[] {
  const urls: string[] = [];

  for (const embed of message.embeds) {
    if (embed.image?.url) {
      urls.push(embed.image.url);
    }

    if (embed.video?.url) {
      urls.push(embed.video.url);
    }

    if (embed.thumbnail?.url) {
      urls.push(embed.thumbnail.url);
    }
  }

  return urls;
}

function getUrlFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split("/").pop();

    return filename || "media";
  } catch {
    return "media";
  }
}

function extractMessageCandidates(
  message: Message,
  source: "attachment" | "reply",
): MediaCandidate[] {
  const candidates: MediaCandidate[] = [];

  for (const attachment of message.attachments.values()) {
    candidates.push(attachmentToCandidate(attachment, source));
  }

  for (const url of extractUrls(message.content)) {
    candidates.push({
      url,
      filename: getUrlFilename(url),
      source: source === "reply" ? "reply" : "link",
    });
  }

  for (const url of extractEmbedUrls(message)) {
    candidates.push({
      url,
      filename: getUrlFilename(url),
      source: source === "reply" ? "reply" : "embed",
    });
  }

  return candidates;
}

export async function resolveMedia(
  message: Message,
): Promise<MediaCandidate[]> {
  const candidates = extractMessageCandidates(message, "attachment");

  if (message.reference?.messageId) {
    try {
      const referenced = await message.fetchReference();

      candidates.push(...extractMessageCandidates(referenced, "reply"));
    } catch (error) {
      console.warn("[Media] Could not fetch referenced message:", error);
    }
  }

  if (candidates.length === 0 && message.channel.isTextBased()) {
    try {
      const previousMessages = await message.channel.messages.fetch({
        before: message.id,
        limit: MAX_SKIPPED_MESSAGES + 1,
      });

      const sortedMessages = [...previousMessages.values()].sort(
        (a, b) => b.createdTimestamp - a.createdTimestamp,
      );

      let skippedMessages = 0;

      for (const previous of sortedMessages) {
        const previousCandidates = extractMessageCandidates(
          previous,
          "attachment",
        );

        if (previousCandidates.length > 0) {
          candidates.push(...previousCandidates);
          break;
        }

        skippedMessages++;

        if (skippedMessages > MAX_SKIPPED_MESSAGES) {
          break;
        }
      }
    } catch (error) {
      console.warn("[Media] Could not fetch previous messages:", error);
    }
  }

  const unique = new Map<string, MediaCandidate>();

  for (const candidate of candidates) {
    if (!unique.has(candidate.url)) {
      unique.set(candidate.url, candidate);
    }
  }

  return [...unique.values()].slice(0, MAX_FILES);
}

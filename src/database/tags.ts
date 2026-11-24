import { asc, eq, and } from "drizzle-orm";

import { db } from "./client.js";
import { guildTags } from "./schema.js";
import { getOrCreateGuild } from "./guilds.js";

function normalizeName(name: string): string {
  const normalized = name.trim().toLowerCase();

  if (!normalized) {
    throw new Error("Tag name cannot be empty");
  }

  return normalized;
}

export async function getTag(
  guildId: string,
  name: string,
): Promise<string | undefined> {
  const [tag] = await db
    .select()
    .from(guildTags)
    .where(
      and(
        eq(guildTags.guildId, guildId),
        eq(guildTags.name, normalizeName(name)),
      ),
    )
    .limit(1);

  return tag?.content;
}

export async function getTags(
  guildId: string,
): Promise<Record<string, string>> {
  const tags = await db
    .select({
      name: guildTags.name,
      content: guildTags.content,
    })
    .from(guildTags)
    .where(eq(guildTags.guildId, guildId))
    .orderBy(asc(guildTags.name));

  return Object.fromEntries(tags.map((tag) => [tag.name, tag.content]));
}

export async function createTag(
  guildId: string,
  name: string,
  content: string,
): Promise<boolean> {
  await getOrCreateGuild(guildId);

  const [tag] = await db
    .insert(guildTags)
    .values({
      guildId,
      name: normalizeName(name),
      content: content.trim(),
    })
    .onConflictDoNothing()
    .returning({ name: guildTags.name });

  return tag !== undefined;
}

export async function updateTag(
  guildId: string,
  name: string,
  content: string,
): Promise<boolean> {
  const [tag] = await db
    .update(guildTags)
    .set({ content: content.trim() })
    .where(
      and(
        eq(guildTags.guildId, guildId),
        eq(guildTags.name, normalizeName(name)),
      ),
    )
    .returning({ name: guildTags.name });

  return tag !== undefined;
}

export async function deleteTag(
  guildId: string,
  name: string,
): Promise<boolean> {
  const [tag] = await db
    .delete(guildTags)
    .where(
      and(
        eq(guildTags.guildId, guildId),
        eq(guildTags.name, normalizeName(name)),
      ),
    )
    .returning({ name: guildTags.name });

  return tag !== undefined;
}

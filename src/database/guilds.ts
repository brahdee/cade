import { eq, lt } from "drizzle-orm";

import { db } from "./client.js";
import { guilds } from "./schema.js";
import type { Guild } from "./schema.js";

export async function getGuild(guildId: string): Promise<Guild | undefined> {
  const [guild] = await db
    .select()
    .from(guilds)
    .where(eq(guilds.guildId, guildId))
    .limit(1);

  return guild;
}

export async function getOrCreateGuild(guildId: string): Promise<Guild> {
  const [created] = await db
    .insert(guilds)
    .values({ guildId })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const existing = await getGuild(guildId);

  if (!existing) {
    throw new Error(`Could not retrieve guild ${guildId}`);
  }

  return existing;
}

export async function getPrefix(
  guildId: string,
  defaultPrefix = ".",
): Promise<string> {
  const guild = await getGuild(guildId);

  return guild?.prefix ?? defaultPrefix;
}

export async function setPrefix(
  guildId: string,
  prefix: string,
): Promise<void> {
  if (prefix.length < 1 || prefix.length > 3) {
    throw new Error("Prefix must be between 1 and 3 characters");
  }

  await db.insert(guilds).values({ guildId, prefix }).onConflictDoUpdate({
    target: guilds.guildId,
    set: { prefix },
  });
}

export async function setWelcome(
  guildId: string,
  message: string | null,
  channelId: string | null,
): Promise<void> {
  if ((message === null) !== (channelId === null)) {
    throw new Error(
      "Welcome message and channel must both be set or both be null",
    );
  }

  await db
    .insert(guilds)
    .values({
      guildId,
      welcomeMessage: message,
      welcomeChannelId: channelId,
    })
    .onConflictDoUpdate({
      target: guilds.guildId,
      set: {
        welcomeMessage: message,
        welcomeChannelId: channelId,
      },
    });
}

export async function markGuildLeft(guildId: string): Promise<void> {
  const leftAt = new Date();

  await db.insert(guilds).values({ guildId, leftAt }).onConflictDoUpdate({
    target: guilds.guildId,
    set: { leftAt },
  });
}

export async function cancelGuildRemoval(guildId: string): Promise<void> {
  await db
    .insert(guilds)
    .values({ guildId, leftAt: null })
    .onConflictDoUpdate({
      target: guilds.guildId,
      set: { leftAt: null },
    });
}

export async function deleteGuildsLeftBefore(cutoff: Date): Promise<string[]> {
  const deleted = await db
    .delete(guilds)
    .where(lt(guilds.leftAt, cutoff))
    .returning({ guildId: guilds.guildId });

  return deleted.map((guild) => guild.guildId);
}

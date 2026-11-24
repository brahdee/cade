import { desc, eq, sql } from "drizzle-orm";

import { db } from "./client.js";
import { commandStats } from "./schema.js";

export async function incrementCommandCount(
  commandName: string,
): Promise<number> {
  const name = commandName.trim().toLowerCase();

  if (!name) {
    throw new Error("Command name cannot be empty");
  }

  const [result] = await db
    .insert(commandStats)
    .values({
      commandName: name,
      invocationCount: 1,
    })
    .onConflictDoUpdate({
      target: commandStats.commandName,
      set: {
        invocationCount: sql`
                    ${commandStats.invocationCount} + 1
                `,
      },
    })
    .returning({
      invocationCount: commandStats.invocationCount,
    });

  return result.invocationCount;
}

export async function getCommandCount(commandName: string): Promise<number> {
  const [result] = await db
    .select({
      invocationCount: commandStats.invocationCount,
    })
    .from(commandStats)
    .where(eq(commandStats.commandName, commandName.toLowerCase()))
    .limit(1);

  return result?.invocationCount ?? 0;
}

export async function getTotalCommandCount(): Promise<number> {
  const [result] = await db
    .select({
      total: sql<string>`
                coalesce(
                    sum(${commandStats.invocationCount}),
                    0
                )::text
            `,
    })
    .from(commandStats);

  return Number(result.total);
}

export async function getAllCommandStats() {
  return db
    .select()
    .from(commandStats)
    .orderBy(desc(commandStats.invocationCount));
}

export async function getStatsStartedAt(): Promise<Date | null> {
  const [result] = await db
    .select({
      startedAt: sql`
                min(${commandStats.createdAt})
            `.mapWith(commandStats.createdAt),
    })
    .from(commandStats);

  return result.startedAt;
}

import {
  pgTable,
  text,
  varchar,
  timestamp,
  bigint,
  primaryKey,
} from "drizzle-orm/pg-core";

export const guilds = pgTable("guilds", {
  guildId: text("guild_id").primaryKey(),

  prefix: varchar("prefix", { length: 3 }).notNull().default("."),

  welcomeMessage: text("welcome_message"),
  welcomeChannelId: text("welcome_channel_id"),

  leftAt: timestamp("left_at", {
    withTimezone: true,
    mode: "date",
  }),
});

export const guildTags = pgTable(
  "guild_tags",
  {
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.guildId, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),
    content: text("content").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.guildId, table.name],
    }),
  ],
);

export const commandStats = pgTable("command_stats", {
  commandName: text("command_name").primaryKey(),

  invocationCount: bigint("invocation_count", {
    mode: "number",
  })
    .notNull()
    .default(0),

  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

export type Guild = typeof guilds.$inferSelect;
export type NewGuild = typeof guilds.$inferInsert;

export type GuildTag = typeof guildTags.$inferSelect;
export type NewGuildTag = typeof guildTags.$inferInsert;

export type CommandStat = typeof commandStats.$inferSelect;

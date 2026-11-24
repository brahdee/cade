CREATE TABLE "command_stats" (
	"command_name" text PRIMARY KEY NOT NULL,
	"invocation_count" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_tags" (
	"guild_id" text NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	CONSTRAINT "guild_tags_guild_id_name_pk" PRIMARY KEY("guild_id","name")
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"prefix" varchar(3) DEFAULT '.' NOT NULL,
	"welcome_message" text,
	"welcome_channel_id" text,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "guild_tags" ADD CONSTRAINT "guild_tags_guild_id_guilds_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("guild_id") ON DELETE cascade ON UPDATE no action;
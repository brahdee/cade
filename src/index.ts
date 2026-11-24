import { Events } from "discord.js";

import { CadeClient } from "./bot/cade.js";
import { config } from "./config/loadConfig.js";

import { commands } from "./commands/registry.js";

import { handleMessageCreate } from "./events/messageCreate.js";
import { handleInteractionCreate } from "./events/interactionCreate.js";
import { handleGuildMemberAdd } from "./events/guildMemberAdd.js";
import { initializeLavalink } from "./music/lavalink.js";

const client = new CadeClient(config.discord.prefix);

client.registerCommands(commands);

client.on(Events.MessageCreate, (message) => {
  void handleMessageCreate(client, message);
});

client.on(Events.InteractionCreate, (interaction) => {
  void handleInteractionCreate(client, interaction);
});

client.on(Events.GuildMemberAdd, (member) => {
  void handleGuildMemberAdd(member);
});

client.once(Events.ClientReady, async (_) => {
  console.log("cade ready to rumble");

  try {
    await initializeLavalink(client);
  } catch (error) {
    console.error("[Lavalink] Initialization failed:", error);
  }
});

await client.login(config.discord.token);

import { Client, Collection, GatewayIntentBits } from "discord.js";

import type { CadeCommand } from "../commands/types.js";
import { getPrefix as getGuildPrefix } from "../database/guilds.js";
import type { LavalinkManager } from "lavalink-client";

export class CadeClient extends Client {
  public readonly commands = new Collection<string, CadeCommand>();
  public readonly startedAt = Date.now();

  public lavalink: LavalinkManager | null = null;

  /*  
        Intent info:
        - Guilds & guild messages are used to read guild and guild message info of course
        - Message content is necessary to read commands from user messages 
            (technically not required if using "slash" commands, but this bot mainly uses prefixes)
        - Guild members and guild voice states for certain permissions/checks (e.g. voice channel checks)
    */

  constructor(public readonly defaultPrefix: string) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });
  }

  registerCommands(commands: CadeCommand[]): void {
    for (const command of commands) {
      const name = command.name.toLowerCase();

      if (this.commands.has(name)) {
        throw new Error(`Duplicate command: ${name}`);
      }

      this.commands.set(name, command);
    }
  }

  getCommand(name: string): CadeCommand | undefined {
    const normalized = name.toLowerCase();

    const command = this.commands.get(name.toLowerCase());

    if (command) return command;

    for (const command of this.commands.values()) {
      if (
        command.aliases?.some((alias) => alias.toLowerCase() === normalized)
      ) {
        return command;
      }
    }

    return undefined;
  }

  async resolvePrefix(guildId: string | null): Promise<string> {
    if (!guildId) return this.defaultPrefix;

    return getGuildPrefix(guildId, this.defaultPrefix);
  }
}

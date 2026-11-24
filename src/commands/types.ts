import type { Message } from "discord.js";
import type { CadeClient } from "../bot/cade.js";

export enum CommandCategory {
  MUSIC = "Music",
  MISC = "Misc",
  MEDIA = "Media",
}

export interface CommandContext {
  client: CadeClient;
  message: Message;
  args: string[];
  prefix: string;
  rawArgs: string;
}

export abstract class CadeCommand {
  abstract name: string;
  abstract description: string;
  abstract category: CommandCategory;

  aliases?: string[];
  usage?: string;
  hidden?: boolean;

  abstract execute(context: CommandContext): Promise<void>;

  sendInfoToLog(info: string): void {
    console.log(
      `\x1b[90m[INFO]\x1b[0m ` +
        `\x1b[36m[\x1b[38;5;37m${this.category}` +
        `\x1b[36m/\x1b[38;5;30m${this.name}` +
        `\x1b[36m]\x1b[0m ` +
        `\x1b[38;5;116m${info}\x1b[0m`,
    );
  }

  sendErrorToLog(error: unknown): void {
    console.error(
      `\x1b[90m[ERROR]\x1b[0m ` +
        `\x1b[31m[\x1b[38;5;124m${this.category}` +
        `\x1b[31m/\x1b[38;5;88m${this.name}` +
        `\x1b[31m]\x1b[0m ` +
        `\x1b[38;5;217m${error}\x1b[0m`,
    );
  }
}

import { PermissionFlagsBits, type Message } from "discord.js";

export function isAdministrator(message: Message): boolean {
  return (
    message.member?.permissions.has(PermissionFlagsBits.Administrator) ?? false
  );
}

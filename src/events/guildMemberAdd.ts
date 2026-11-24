import { ChannelType, type GuildMember } from "discord.js";

import { getGuild } from "../database/guilds.js";

export async function handleGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    const guild = await getGuild(member.guild.id);

    if (!guild?.welcomeMessage || !guild.welcomeChannelId) {
      return;
    }

    const channel = await member.guild.channels.fetch(guild.welcomeChannelId);

    if (
      !channel ||
      (channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildAnnouncement)
    ) {
      console.warn(`[Welcome] Invalid welcome channel in ${member.guild.name}`);

      return;
    }

    const content = guild.welcomeMessage.replaceAll(
      "{user}",
      member.toString(),
    );

    await channel.send({
      content,
      allowedMentions: {
        parse: [],
        users: [member.id],
      },
    });

    console.log(
      `[Welcome] Welcomed ${member.user.tag} in ${member.guild.name}`,
    );
  } catch (error) {
    console.error(`[Welcome] Failed to welcome ${member.user.tag}:`, error);
  }
}

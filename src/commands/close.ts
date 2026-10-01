import {
	ChannelType,
	type ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { closeSoon, isTicket } from "../tickets.ts";

export const data = new SlashCommandBuilder()
	.setName("close")
	.setDescription("Close this application or support channel")
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function run(interaction: ChatInputCommandInteraction<"cached">) {
	const channel = interaction.channel;

	if (channel?.type !== ChannelType.GuildText || !isTicket(channel)) {
		return interaction.reply({
			content: "Use this inside an application or support channel.",
			flags: MessageFlags.Ephemeral,
		});
	}

	await interaction.reply("Closing this channel...");
	closeSoon(channel, `Closed by ${interaction.user.tag}`);
}

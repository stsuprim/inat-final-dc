import {
	type ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { ids } from "../config.ts";
import { announcePost } from "../posts/announce.ts";

export const announce = {
	data: new SlashCommandBuilder()
		.setName("announce")
		.setDescription("Post the announcement in this channel")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

	async run(interaction: ChatInputCommandInteraction<"cached">) {
		if (!interaction.member.roles.cache.has(ids.adminRole)) {
			return interaction.reply({
				content: "Only admins can post this.",
				flags: MessageFlags.Ephemeral,
			});
		}

		await interaction.reply({
			content: "Posting it now.",
			flags: MessageFlags.Ephemeral,
		});
		await interaction.channel?.send({
			content: announcePost(interaction.guild),
			// The one post meant to ping, and only the join role.
			allowedMentions: { roles: [ids.joinRole] },
		});
	},
};

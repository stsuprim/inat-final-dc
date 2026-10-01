import {
	type ButtonInteraction,
	type ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { ids } from "../config.ts";
import { fill } from "../emoji.ts";
import { supportPanel } from "../posts/support.ts";
import { claim, findOpen, openTicket } from "../tickets.ts";

export const data = new SlashCommandBuilder()
	.setName("support")
	.setDescription("Post the support panel in this channel")
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function run(interaction: ChatInputCommandInteraction<"cached">) {
	if (interaction.channelId !== ids.supportChannel) {
		return interaction.reply({
			content: `Use this in <#${ids.supportChannel}>.`,
			flags: MessageFlags.Ephemeral,
		});
	}

	await interaction.reply({
		content: "Posting it now.",
		flags: MessageFlags.Ephemeral,
	});
	await interaction.channel?.send({
		...supportPanel(interaction.guild),
		allowedMentions: { parse: [] },
	});
}

/** The panel's button. One open ticket per person. */
export async function openFromButton(interaction: ButtonInteraction<"cached">) {
	const { guild, user } = interaction;
	const say = (text: string) =>
		interaction.reply({
			content: fill(text, guild),
			flags: MessageFlags.Ephemeral,
		});

	const existing = findOpen(guild, "support", user.id);
	if (existing) {
		return say(
			`:mail: You already have a ticket open in ${existing}. Carry on there, and someone from the team will get back to you.`,
		);
	}

	const release = claim("support", user.id);
	if (!release) {
		return say(":mail: Your ticket is already being opened. Hang on a second.");
	}

	try {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const channel = await openTicket(guild, "support", user);

		await channel.send({
			content: fill(
				`# :inatlogo1024: How can we help?
${user} <@&${ids.adminRole}>
:bullet: Tell us what is going on, with as much detail as you can.
:bullet: Screenshots or links help a lot.

:check: Someone from the team will be with you shortly.`,
				guild,
			),
			allowedMentions: { users: [user.id], roles: [ids.adminRole] },
		});

		await interaction.editReply(
			fill(`:check: Your ticket is open: ${channel}`, guild),
		);
	} finally {
		release();
	}
}

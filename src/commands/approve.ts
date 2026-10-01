import {
	ChannelType,
	type ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { ids } from "../config.ts";
import { approveEmail } from "../db.ts";
import { syncMember } from "../ranks.ts";
import { closeSoon, readTopic } from "../tickets.ts";

export const data = new SlashCommandBuilder()
	.setName("approve")
	.setDescription("Approve the email this application channel applied with")
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function run(interaction: ChatInputCommandInteraction<"cached">) {
	const channel = interaction.channel;
	const ticket =
		channel?.type === ChannelType.GuildText &&
		channel.parentId === ids.applyCategory
			? readTopic(channel.topic)
			: null;

	if (channel?.type !== ChannelType.GuildText || ticket?.kind !== "apply") {
		return interaction.reply({
			content: "Use this inside an application channel.",
			flags: MessageFlags.Ephemeral,
		});
	}
	if (!ticket.email) {
		return interaction.reply({
			content: "This channel has no email on it.",
			flags: MessageFlags.Ephemeral,
		});
	}

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	let added: boolean;
	try {
		added = await approveEmail(ticket.email, ticket.userId);
	} catch (error) {
		console.error("Could not approve email:", error);
		return interaction.editReply(
			"Could not reach the database. Nothing was changed.",
		);
	}

	const why = `Approved by ${interaction.user.tag}`;
	const member = await interaction.guild.members
		.fetch(ticket.userId)
		.catch(() => null);
	let roleNote: string;

	if (!member) {
		// The email still counts. They can get the role when they come back.
		roleNote = "They have left the server, so no role was given.";
	} else {
		// Their rank comes from their level on the site, so someone who was
		// already clipping lands straight on Silver or above.
		try {
			await syncMember(member);
			roleNote = "Rank given.";
		} catch (error) {
			console.error("Could not give the rank:", error);
			roleNote = "I could not give them their rank.";
		}
	}

	await interaction.editReply(
		`${added ? "Added" : "Already had"} \`${ticket.email}\`. ${roleNote}`,
	);
	await channel.send("Approved. Closing this channel.").catch(() => {});
	closeSoon(channel, why);
}

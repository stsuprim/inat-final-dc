import {
	ChannelType,
	type ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { ids, rankRoles } from "../config.ts";
import { approveEmail } from "../db.ts";
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
		added = await approveEmail(ticket.email);
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
		try {
			if (rankRoles.some((rank) => member.roles.cache.has(rank))) {
				roleNote = "They already have a rank.";
			} else {
				await member.roles.add(ids.clipperRole, why);
				roleNote = "Role given.";
			}
		} catch (error) {
			console.error("Could not give the clipper role:", error);
			roleNote = "I could not give them the role.";
		}

		if (member.roles.cache.has(ids.joinRole)) {
			await member.roles.remove(ids.joinRole, why).catch((error) => {
				console.error("Could not take the join role off:", error);
				roleNote += " I could not take the join role off.";
			});
		}
	}

	await interaction.editReply(
		`${added ? "Added" : "Already had"} \`${ticket.email}\`. ${roleNote}`,
	);
	await channel.send("Approved. Closing this channel.").catch(() => {});
	closeSoon(channel, why);
}

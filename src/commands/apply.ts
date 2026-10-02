import {
	type ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { ids, rankRoles } from "../config.ts";
import { fill } from "../emoji.ts";
import { claim, findOpen, openTicket } from "../tickets.ts";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const data = new SlashCommandBuilder()
	.setName("apply")
	.setDescription("Apply to inat.gg with your email")
	.addStringOption((option) =>
		option
			.setName("email")
			.setDescription("The email you will use on inat.gg")
			.setRequired(true),
	);

export async function run(interaction: ChatInputCommandInteraction<"cached">) {
	const { guild, user, member } = interaction;
	const say = (text: string) =>
		interaction.reply({
			content: fill(text, guild),
			flags: MessageFlags.Ephemeral,
		});

	if (interaction.channelId !== ids.applyChannel) {
		return say(`Use this in <#${ids.applyChannel}>.`);
	}

	// Anyone still Unverified can apply, whatever other roles they hold. The
	// rest with a rank are already approved; the channel hides /apply from
	// them, and this covers anyone who slips past it.
	if (
		!member.roles.cache.has(ids.joinRole) &&
		rankRoles.some((rank) => member.roles.cache.has(rank))
	) {
		return say(
			":check: You are already approved, so there is nothing to apply for. Sign in at <https://inat.gg> with your email.",
		);
	}

	const email = interaction.options
		.getString("email", true)
		.trim()
		.toLowerCase();
	if (!emailPattern.test(email)) {
		return say(
			":cross1: That email does not look right. Check it and run the command again.",
		);
	}

	const existing = findOpen(guild, "apply", user.id);
	if (existing) {
		return say(
			`:mail: You already have an application open. Head over to ${existing} and carry on there.`,
		);
	}

	const release = claim("apply", user.id);
	if (!release) {
		return say(
			":mail: Your application is already being opened. Hang on a second.",
		);
	}

	try {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const channel = await openTicket(guild, "apply", user, email);

		await channel.send({
			content: fill(
				`# :inatlogo1024: Tell us about yourself
${user} <@&${ids.adminRole}>
:bullet: What device do you clip on?
:bullet: How long have you been clipping?
:bullet: Send us your past work, if you have any.

:check: Answer here and we will take it from there.
:mail: \`${email}\``,
				guild,
			),
			allowedMentions: { users: [user.id], roles: [ids.adminRole] },
		});

		// What the rest of the apply channel sees. The email stays out of it.
		await interaction.channel
			?.send({
				content: fill(
					`:mail: **Application received**
${user} we have your email, and a private channel is now open for you.
:rightarrow: Head to ${channel} and tell us about your clipping. Someone from the team will take it from there.`,
					guild,
				),
				allowedMentions: { users: [user.id] },
			})
			.catch((error) => console.error("Could not post the apply log:", error));

		await interaction.editReply(
			fill(`:check: Your channel is ready: ${channel}`, guild),
		);
	} finally {
		release();
	}
}

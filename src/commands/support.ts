import {
	type ButtonInteraction,
	type Client,
	MessageFlags,
	type Snowflake,
} from "discord.js";
import { ids } from "../config.ts";
import { fill } from "../emoji.ts";
import { supportPanel } from "../posts/support.ts";
import { claim, findOpen, openTicket } from "../tickets.ts";

// The support channel holds exactly one thing: the bot's panel. It is posted
// fresh on every start, and posted again if someone deletes it.
let panelId: Snowflake | null = null;

export async function postPanel(client: Client) {
	const channel = await client.channels
		.fetch(ids.supportChannel)
		.catch(() => null);
	if (!channel?.isSendable() || channel.isDMBased()) {
		console.error("Could not find the support channel.");
		return;
	}

	// The panel already there stays: only post when there is none. Any extra
	// copies from older runs go, keeping the newest.
	panelId = null;
	const recent = await channel.messages.fetch({ limit: 50 });
	const mine = [...recent.values()]
		.filter((message) => message.author.id === client.user?.id)
		.sort((x, y) => y.createdTimestamp - x.createdTimestamp);
	const [keep, ...extra] = mine;
	for (const message of extra) await message.delete().catch(() => {});
	if (keep) {
		panelId = keep.id;
		return;
	}

	const panel = await channel.send({
		...supportPanel(channel.guild),
		allowedMentions: { parse: [] },
	});
	panelId = panel.id;
}

export function panelGone(client: Client, deleted: Iterable<Snowflake>) {
	if (!panelId) return;
	for (const id of deleted) {
		if (id === panelId) {
			postPanel(client).catch((error) => {
				console.error("Could not repost the support panel:", error);
			});
			return;
		}
	}
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

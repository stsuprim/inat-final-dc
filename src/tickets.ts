import {
	ChannelType,
	type Guild,
	PermissionFlagsBits,
	type TextChannel,
	type User,
} from "discord.js";
import { ids } from "./config.ts";

// Applications and support tickets are the same thing: a private channel in a
// category, one per person, with the owner written into the topic so nothing
// else has to remember who it belongs to.

export type TicketKind = "apply" | "support";

const categoryFor: Record<TicketKind, string> = {
	apply: ids.applyCategory,
	support: ids.supportCategory,
};

// The prefixes the old bot wrote, kept so channels it opened still count.
const prefix: Record<TicketKind, string> = {
	apply: "applicant",
	support: "support",
};

/** Topic format: `applicant:<userId> <email>` or `support:<userId>`. */
export function readTopic(topic: string | null) {
	const match = topic?.match(/^(applicant|support):(\d{17,20})(?: (\S+))?/);
	if (!match) return null;
	return {
		kind: (match[1] === "support" ? "support" : "apply") as TicketKind,
		userId: match[2] as string,
		email: match[3] ?? null,
	};
}

export function isTicket(channel: { parentId?: string | null } | null) {
	return (
		channel?.parentId === ids.applyCategory ||
		channel?.parentId === ids.supportCategory
	);
}

export function findOpen(guild: Guild, kind: TicketKind, userId: string) {
	return guild.channels.cache.find(
		(channel): channel is TextChannel =>
			channel.type === ChannelType.GuildText &&
			channel.parentId === categoryFor[kind] &&
			readTopic(channel.topic)?.userId === userId,
	);
}

// A double click lands two interactions before either channel exists, so the
// cache check alone lets both through.
const opening = new Set<string>();

export function claim(kind: TicketKind, userId: string) {
	const key = `${kind}:${userId}`;
	if (opening.has(key)) return null;
	opening.add(key);
	return () => opening.delete(key);
}

function channelName(user: User) {
	const slug = user.username
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
	return slug || "ticket";
}

export async function openTicket(
	guild: Guild,
	kind: TicketKind,
	user: User,
	email?: string,
) {
	const me = guild.members.me;
	if (!me) throw new Error("Bot member is not cached.");

	return guild.channels.create({
		name: channelName(user),
		type: ChannelType.GuildText,
		parent: categoryFor[kind],
		topic: email
			? `${prefix[kind]}:${user.id} ${email}`
			: `${prefix[kind]}:${user.id}`,
		permissionOverwrites: [
			{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
			{
				id: user.id,
				allow: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.ReadMessageHistory,
					PermissionFlagsBits.AttachFiles,
					PermissionFlagsBits.EmbedLinks,
				],
			},
			{
				id: me.id,
				allow: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.ManageChannels,
				],
			},
		],
	});
}

/** A few seconds so whoever is in there can read the last message. */
export function closeSoon(channel: TextChannel, reason: string) {
	setTimeout(() => {
		channel.delete(reason).catch((error) => {
			console.error("Could not delete ticket channel:", error);
		});
	}, 3_000).unref();
}

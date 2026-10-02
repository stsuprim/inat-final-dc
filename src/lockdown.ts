import {
	type Client,
	type GuildChannel,
	type Message,
	OverwriteType,
	type PermissionOverwriteOptions,
	PermissionOverwrites,
} from "discord.js";
import { ids, rankRoles, roles } from "./config.ts";

// Everything a member could do in a channel besides read it. Buttons on the
// bot's messages still work without any of these.
const readOnly: PermissionOverwriteOptions = {
	ViewChannel: true,
	ReadMessageHistory: true,
	SendMessages: false,
	SendMessagesInThreads: false,
	CreatePublicThreads: false,
	CreatePrivateThreads: false,
	AddReactions: false,
	AttachFiles: false,
	EmbedLinks: false,
	UseExternalEmojis: false,
	UseExternalStickers: false,
	SendVoiceMessages: false,
	SendPolls: false,
	UseApplicationCommands: false,
	UseEmbeddedActivities: false,
	UseExternalApps: false,
	MentionEveryone: false,
};

// Read only, except /apply has to keep working for whoever is still applying.
const applyOnly: PermissionOverwriteOptions = {
	...readOnly,
	UseApplicationCommands: true,
};

const reason = "inat bot keeps this channel read only";

async function guildChannel(client: Client, id: string) {
	const channel = await client.channels.fetch(id).catch(() => null);
	return channel && "permissionOverwrites" in channel
		? (channel as GuildChannel)
		: null;
}

async function lock(
	client: Client,
	id: string,
	rules: PermissionOverwriteOptions,
	forRole: Record<string, PermissionOverwriteOptions> = {},
) {
	const me = client.user;
	const channel = await guildChannel(client, id);
	if (!me || !channel) {
		console.error(`Could not find channel ${id} to lock.`);
		return;
	}
	const overwrites = channel.permissionOverwrites;

	// Discord rate limits overwrite edits hard, so only write what changed.
	async function set(
		target: string,
		options: PermissionOverwriteOptions,
		type: OverwriteType,
	) {
		const current = overwrites.cache.get(target);
		const next = PermissionOverwrites.resolveOverwriteOptions(
			options,
			current ?? {},
		);
		if (
			current &&
			current.allow.bitfield === next.allow.bitfield &&
			current.deny.bitfield === next.deny.bitfield
		) {
			return;
		}
		await overwrites.edit(target, options, { reason, type });
	}

	const everyone = channel.guild.id;
	await set(everyone, rules, OverwriteType.Role);
	for (const [role, own] of Object.entries(forRole)) {
		await set(role, own, OverwriteType.Role);
	}

	// A role allow beats an @everyone deny, so any role already written on the
	// channel gets the same rules. Admins skip overwrites anyway.
	for (const overwrite of [...overwrites.cache.values()]) {
		if (
			overwrite.type === OverwriteType.Role &&
			overwrite.id !== everyone &&
			overwrite.id !== roles.admin &&
			!(overwrite.id in forRole)
		) {
			await set(overwrite.id, rules, OverwriteType.Role);
		}
	}

	// People the old bot muted and forgot about when it restarted.
	for (const overwrite of [...overwrites.cache.values()]) {
		if (overwrite.type === OverwriteType.Member && overwrite.id !== me.id) {
			await overwrite.delete("Old mute").catch(() => {});
		}
	}

	// The bot itself still has to post the panels and logs.
	await set(
		me.id,
		{ ViewChannel: true, SendMessages: true, EmbedLinks: true },
		OverwriteType.Member,
	);
	console.log(`Locked #${channel.name}.`);
}

/** Written on every start, so a hand edit in Discord cannot quietly undo it. */
export async function lockDoors(client: Client) {
	for (const id of [
		ids.infoChannel,
		ids.announcementChannel,
		ids.toolsChannel,
		ids.supportChannel,
	]) {
		await lock(client, id, readOnly);
	}

	// Every rank is an approved clipper, done with /apply for good. Unverified
	// always can, whatever else they hold (Editor, Marketer, an old rank): a
	// role allow beats a role deny in Discord. They need Send Messages too,
	// or Discord hides the box /apply is typed in; anything they type that is
	// not /apply is deleted by sweep().
	await lock(client, ids.applyChannel, applyOnly, {
		...Object.fromEntries(rankRoles.map((rank) => [rank, readOnly])),
		[roles.unverified]: { ...applyOnly, SendMessages: true },
	});
}

/** Anything that still gets through (a missed overwrite) is removed. */
export async function sweep(message: Message) {
	if (
		message.channelId !== ids.applyChannel &&
		message.channelId !== ids.supportChannel
	) {
		return;
	}
	if (message.author.id === message.client.user.id) return;

	await message.delete().catch((error) => {
		console.error("Could not clear a message:", error);
	});
}

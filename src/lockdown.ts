import {
	type Client,
	type GuildChannel,
	type Message,
	OverwriteType,
	type PermissionOverwriteOptions,
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

	await overwrites.edit(channel.guild.roles.everyone, rules, { reason });
	for (const [role, own] of Object.entries(forRole)) {
		await overwrites.edit(role, own, { reason });
	}

	// A role allow beats an @everyone deny, so any role already written on the
	// channel gets the same rules. Admins skip overwrites anyway.
	for (const overwrite of overwrites.cache.values()) {
		if (
			overwrite.type === OverwriteType.Role &&
			overwrite.id !== channel.guild.id &&
			overwrite.id !== roles.admin &&
			!(overwrite.id in forRole)
		) {
			await overwrites.edit(overwrite.id, rules, { reason });
		}
	}

	// People the old bot muted and forgot about when it restarted.
	for (const overwrite of overwrites.cache.values()) {
		if (overwrite.type === OverwriteType.Member && overwrite.id !== me.id) {
			await overwrite.delete("Old mute").catch(() => {});
		}
	}

	// The bot itself still has to post the panels and logs.
	await overwrites.edit(
		me.id,
		{ ViewChannel: true, SendMessages: true, EmbedLinks: true },
		{ reason },
	);
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

	// Every rank is an approved clipper, done with /apply for good.
	await lock(
		client,
		ids.applyChannel,
		applyOnly,
		Object.fromEntries(rankRoles.map((rank) => [rank, readOnly])),
	);
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

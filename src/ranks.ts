import type { Client, Guild, GuildMember } from "discord.js";
import { env, ids, rankRoles } from "./config.ts";
import { approvedClips } from "./db.ts";
import { levelFor, rankNames } from "./levels.ts";

// Rank roles follow site levels. Every member linked to an approved email
// (through /approve) holds exactly the rank their approved clips earn, and
// not Unverified. Unlinked members are left alone.

const EVERY = 2 * 60 * 1000;

/** Brings one member's roles in line with their clips. True if anything changed. */
async function fit(member: GuildMember, clips: number) {
	const want = rankRoles[levelFor(clips).rank] as string;
	const drop = [...rankRoles, ids.joinRole].filter(
		(role) => role !== want && member.roles.cache.has(role),
	);
	const add = member.roles.cache.has(want) ? [] : [want];
	if (!add.length && !drop.length) return false;

	const why = `Rank: ${rankNames[levelFor(clips).rank]} (${clips} approved clips)`;
	if (add.length) await member.roles.add(add, why);
	if (drop.length) await member.roles.remove(drop, why);
	return true;
}

/** Syncs one member now, e.g. right after /approve. False when not linked. */
export async function syncMember(member: GuildMember) {
	const clips = (await approvedClips([member.id])).get(member.id);
	if (clips === undefined) return false;
	await fit(member, clips);
	return true;
}

export async function syncAll(guild: Guild) {
	const clips = await approvedClips();
	const members = await guild.members.fetch();
	let changed = 0;
	for (const [id, count] of clips) {
		const member = members.get(id);
		if (!member || member.user.bot) continue;
		try {
			if (await fit(member, count)) changed++;
		} catch (error) {
			console.error(`Could not set the rank of ${member.user.tag}:`, error);
		}
	}
	if (changed) console.log(`Rank sync changed ${changed} member(s).`);
}

let running = false;
let lastProblem = "";

/** Syncs now, then every couple of minutes. Resolves after the first pass. */
export async function startRankSync(client: Client<true>) {
	const pass = async () => {
		if (running) return;
		running = true;
		try {
			const guild = await client.guilds.fetch(env.guildId);
			await syncAll(guild);
			lastProblem = "";
		} catch (error) {
			const problem = error instanceof Error ? error.message : String(error);
			// Logged once per new problem so a missing table does not flood logs.
			if (problem !== lastProblem) console.error("Rank sync failed:", error);
			lastProblem = problem;
			throw error;
		} finally {
			running = false;
		}
	};
	setInterval(() => pass().catch(() => {}), EVERY).unref();
	await pass();
}

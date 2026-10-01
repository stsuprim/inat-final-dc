import {
	type ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { ids } from "../config.ts";
import { approvedClips } from "../db.ts";
import { fill } from "../emoji.ts";
import { clipsToReach, levelFor, rankNames, rankStart } from "../levels.ts";

export const data = new SlashCommandBuilder()
	.setName("rank")
	.setDescription("Your level, XP and rank on inat.gg")
	.addUserOption((option) =>
		option.setName("user").setDescription("Someone else's rank"),
	);

function bar(xp: number, next: number) {
	const filled = Math.round((xp / next) * 12);
	return `${"█".repeat(filled)}${"░".repeat(12 - filled)}`;
}

export async function run(interaction: ChatInputCommandInteraction<"cached">) {
	const user = interaction.options.getUser("user") ?? interaction.user;
	const self = user.id === interaction.user.id;
	const clips = (await approvedClips([user.id])).get(user.id);

	if (clips === undefined) {
		return interaction.reply({
			content: fill(
				self
					? `:cross1: Your Discord is not linked to inat.gg yet. Apply in <#${ids.applyChannel}> and it links when you are approved.`
					: `:cross1: ${user} is not linked to inat.gg.`,
				interaction.guild,
			),
			flags: MessageFlags.Ephemeral,
			allowedMentions: { parse: [] },
		});
	}

	const { level, xp, next, rank } = levelFor(clips);
	const lines = [`## ${rankNames[rank]} · Level ${level}`, `${user}`];
	if (level === 100) {
		lines.push(`\`${bar(1, 1)}\` Max level`);
	} else {
		lines.push(`\`${bar(xp, next)}\` ${xp} / ${next} XP`);
	}
	const rest = [`${clips} approved clips`];
	if (level < 100) rest.push(`${next - xp} to level ${level + 1}`);
	if (rank < rankNames.length - 1) {
		const at = rankStart(rank + 1);
		rest.push(
			`${rankNames[rank + 1]} at level ${at} (${clipsToReach(at) - clips} more)`,
		);
	}
	lines.push(rest.join(" · "));

	return interaction.reply({
		content: lines.join("\n"),
		allowedMentions: { parse: [] },
	});
}

import { rankRoles } from "./config.ts";

// The site's level curve, ported from `src/levels/level.ts` on inat.gg. One
// approved clip is one XP; reaching level L takes
// round(2((L-1) + 0.194(L-1)²)) approved clips. Change both together.

const TOP = 100;
const PER_RANK = 20;

export const rankNames = ["Bronze", "Silver", "Gold", "Diamond", "Emerald"];

export function clipsToReach(level: number) {
	const n = level - 1;
	return Math.round(2 * (n + 0.194 * n * n));
}

export type Standing = {
	level: number;
	/** XP into this level, and what the whole level takes. */
	xp: number;
	next: number;
	/** 0 Bronze … 4 Emerald. */
	rank: number;
};

export function levelFor(approvedClips: number): Standing {
	let level = 1;
	while (level < TOP && clipsToReach(level + 1) <= approvedClips) level++;
	const rank = rankForLevel(level);
	if (level === TOP) return { level, xp: 1, next: 1, rank };
	const from = clipsToReach(level);
	return {
		level,
		xp: approvedClips - from,
		next: clipsToReach(level + 1) - from,
		rank,
	};
}

export function rankForLevel(level: number) {
	return Math.min(rankRoles.length - 1, Math.floor((level - 1) / PER_RANK));
}

/** The first level of a rank, e.g. 21 for Silver. */
export function rankStart(rank: number) {
	return rank * PER_RANK + 1;
}

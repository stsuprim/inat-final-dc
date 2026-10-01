import type { Guild } from "discord.js";
import { ids } from "../config.ts";
import { fill } from "../emoji.ts";

// Rewritten announcement to announcement. Pings the join role only.
const message = `# :announcement: <@&${ids.joinRole}>
:check: Everyone who applied with their email has been approved. You can now get into inat with that same email.

:cross1: If you have not applied yet, do it now in <#${ids.applyChannel}>. If you don't, we will have to kick you. We don't want inactive members in the server.`;

export function announcePost(guild: Guild | null) {
	return fill(message, guild);
}

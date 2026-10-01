import pg from "pg";
import { env } from "./config.ts";

export const pool = new pg.Pool({
	connectionString: env.databaseUrl,
	ssl: env.databaseUrl.includes("sslmode=disable")
		? false
		: { rejectUnauthorized: false },
});

/**
 * Approves the email and links it to the Discord account that applied with it.
 * One account, one email: a link to an older email moves over.
 * True when the email was new, false when it was already approved.
 */
export async function approveEmail(email: string, discordId: string) {
	const client = await pool.connect();
	try {
		await client.query("begin");
		await client.query(
			"update approved_email set discord_id = null where discord_id = $1 and email <> $2",
			[discordId, email],
		);
		const result = await client.query<{ added: boolean }>(
			`insert into approved_email (email, discord_id) values ($1, $2)
			on conflict (email) do update set discord_id = excluded.discord_id
			returning (xmax = 0) as added`,
			[email, discordId],
		);
		await client.query("commit");
		return result.rows[0]?.added ?? false;
	} catch (error) {
		await client.query("rollback").catch(() => {});
		throw error;
	} finally {
		client.release();
	}
}

/**
 * Approved clips for every linked Discord account, or just the ones asked
 * for. Counted live from submissions, the same way the site does: nothing
 * about levels is stored.
 */
export async function approvedClips(discordIds?: string[]) {
	const result = await pool.query<{ discord_id: string; clips: number }>(
		`select a.discord_id, count(s.id)::int as clips
		from approved_email a
		left join "user" u on lower(u.email) = a.email
		left join submission s on s.user_id = u.id and s.state = 'approved'
		where a.discord_id is not null
			and ($1::text[] is null or a.discord_id = any($1))
		group by a.discord_id`,
		[discordIds ?? null],
	);
	return new Map(result.rows.map((row) => [row.discord_id, row.clips]));
}

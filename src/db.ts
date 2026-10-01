import pg from "pg";
import { env } from "./config.ts";

export const pool = new pg.Pool({
	connectionString: env.databaseUrl,
	ssl: env.databaseUrl.includes("sslmode=disable")
		? false
		: { rejectUnauthorized: false },
});

/** True when the email was new, false when it was already approved. */
export async function approveEmail(email: string) {
	const result = await pool.query(
		"insert into approved_email (email) values ($1) on conflict (email) do nothing",
		[email],
	);
	return (result.rowCount ?? 0) > 0;
}

function required(name: string) {
	const value = process.env[name]?.trim();
	if (!value) {
		console.error(`Missing ${name}.`);
		process.exit(1);
	}
	return value;
}

const snowflake = /^\d{17,20}$/;

function id(name: string, value: string) {
	if (!snowflake.test(value)) {
		console.error(`${name} is not a Discord ID.`);
		process.exit(1);
	}
	return value;
}

export const env = {
	token: required("DISCORD_TOKEN"),
	clientId: id("DISCORD_CLIENT_ID", required("DISCORD_CLIENT_ID")),
	guildId: id("DISCORD_GUILD_ID", required("DISCORD_GUILD_ID")),
	databaseUrl: required("DATABASE_URL"),
	port: Number.parseInt(process.env.PORT ?? "3000", 10),
};

// Everything in the server the bot leans on, in one place.
export const roles = {
	admin: "1546424650773303377",
	team: "1547238285204783175",
	marketer: "1549403054124826714",
	editor: "1552705591804170360",
	// Everyone lands with this one and keeps it until they are approved.
	unverified: "1547527812443803688",
	// The five ranks, lowest first. /approve hands out Bronze.
	bronze: "1547238027233988608",
	silver: "1554460740994338976",
	gold: "1554460735633891338",
	diamond: "1554460783176450059",
	emerald: "1554460805028913213",
	booster: "1549328606923325461",
	// The bot's own managed role.
	bot: "1546424572386087013",
};

export const rankRoles = [
	roles.bronze,
	roles.silver,
	roles.gold,
	roles.diamond,
	roles.emerald,
];

export const ids = {
	adminRole: roles.admin,
	joinRole: roles.unverified,
	clipperRole: roles.bronze,

	infoChannel: "1547298862639743197",
	announcementChannel: "1547270442752938085",
	toolsChannel: "1547252353357451374",
	applyChannel: "1547298562772181153",
	applyCategory: "1547527317855670312",
	supportChannel: "1547573352204472480",
	supportCategory: "1547573541157863535",
	// Admins and Team only. The bot reports here when it comes back up.
	statusChannel: "1547531487107219508",

	suprim: "1516108902297501697",
};

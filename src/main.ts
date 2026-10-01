import { createServer } from "node:http";
import {
	type ChatInputCommandInteraction,
	Client,
	Events,
	GatewayIntentBits,
	type Interaction,
	MessageFlags,
	REST,
	Routes,
} from "discord.js";
import * as apply from "./commands/apply.ts";
import * as approve from "./commands/approve.ts";
import * as clear from "./commands/clear.ts";
import * as close from "./commands/close.ts";
import { announce, info, tool } from "./commands/posts.ts";
import * as support from "./commands/support.ts";
import { env, ids } from "./config.ts";
import { pool } from "./db.ts";
import { lockDoors, sweep } from "./lockdown.ts";
import { SUPPORT_BUTTON } from "./posts/support.ts";

type Command = {
	data: { name: string; toJSON(): unknown };
	run(interaction: ChatInputCommandInteraction<"cached">): Promise<unknown>;
};

const commands = new Map<string, Command>(
	[apply, approve, close, clear, support, info, tool, announce].map(
		(command) => [command.data.name, command],
	),
);

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		// So a re-uploaded emoji reaches the cache without a restart.
		GatewayIntentBits.GuildExpressions,
	],
});

async function registerCommands() {
	const rest = new REST().setToken(env.token);
	await rest.put(Routes.applicationGuildCommands(env.clientId, env.guildId), {
		body: [...commands.values()].map((command) => command.data.toJSON()),
	});
}

async function failed(interaction: Interaction, what: string, error: unknown) {
	console.error(`Could not ${what}:`, error);
	if (!interaction.isRepliable()) return;
	const content = "Something went wrong. Try again in a moment.";
	if (interaction.deferred || interaction.replied) {
		await interaction.editReply(content).catch(() => {});
	} else {
		await interaction
			.reply({ content, flags: MessageFlags.Ephemeral })
			.catch(() => {});
	}
}

client.once(Events.ClientReady, async (ready) => {
	ready.user.setPresence({ activities: [], status: "dnd" });
	console.log(`Ready as ${ready.user.tag}.`);

	const notes: string[] = [];

	const application = await ready.application.fetch().catch(() => null);
	if (application?.interactionsEndpointURL) {
		notes.push(
			"An Interactions Endpoint URL is set in the Developer Portal, so slash commands will not reach me.",
		);
	}

	await registerCommands().catch((error: Error) => {
		console.error("Could not register commands:", error);
		notes.push(`Commands did not register: ${error.message}`);
	});

	await lockDoors(ready).catch((error: Error) => {
		console.error("Could not lock the apply and support channels:", error);
		notes.push(
			`Could not lock the apply and support channels: ${error.message}`,
		);
	});

	const status = await ready.channels
		.fetch(ids.statusChannel)
		.catch(() => null);
	if (status?.isSendable()) {
		await status
			.send({
				content: [`<@&${ids.adminRole}> the bot is back up.`, ...notes].join(
					"\n",
				),
				allowedMentions: { roles: [ids.adminRole] },
			})
			.catch((error) => console.error("Could not post to status:", error));
	}
});

client.on(Events.GuildMemberAdd, async (member) => {
	if (member.user.bot) return;
	await member.roles.add(ids.joinRole, "Joined the server").catch((error) => {
		console.error(`Could not give the join role to ${member.user.tag}:`, error);
	});
});

client.on(Events.MessageCreate, sweep);

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.inCachedGuild()) return;

	if (interaction.isButton() && interaction.customId === SUPPORT_BUTTON) {
		await support
			.openFromButton(interaction)
			.catch((error) => failed(interaction, "open a support ticket", error));
		return;
	}

	if (!interaction.isChatInputCommand()) return;
	const command = commands.get(interaction.commandName);
	if (!command) return;

	await command
		.run(interaction)
		.catch((error) =>
			failed(interaction, `run /${interaction.commandName}`, error),
		);
});

client.on(Events.Error, (error) =>
	console.error("Discord client error:", error),
);
client.on(Events.Warn, (warning) => console.warn("Discord warning:", warning));

// Railway checks this to know whether the bot is actually connected.
const health = createServer((request, response) => {
	if (request.url !== "/" && request.url !== "/health") {
		response.writeHead(404).end();
		return;
	}
	const ready = client.isReady();
	response
		.writeHead(ready || request.url === "/" ? 200 : 503, {
			"Content-Type": "application/json",
		})
		.end(JSON.stringify({ discord: ready ? "connected" : "disconnected" }));
});

let stopping = false;
async function stop(signal: string) {
	if (stopping) return;
	stopping = true;
	console.log(`${signal} received, shutting down.`);
	await client.destroy();
	await pool.end().catch(() => {});
	health.close();
	process.exit(0);
}

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));
process.on("unhandledRejection", (error) => {
	console.error("Unhandled rejection:", error);
});

health.listen(env.port, "0.0.0.0", () => {
	console.log(`Health check on port ${env.port}.`);
});

await client.login(env.token);

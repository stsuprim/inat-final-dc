import {
	type ChatInputCommandInteraction,
	type Guild,
	MessageFlags,
	type MessageMentionOptions,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { ids } from "../config.ts";
import { announcePost } from "../posts/announce.ts";
import { infoPost } from "../posts/info.ts";
import { toolsPost } from "../posts/tools.ts";

// /info, /tool and /announce all do the same thing: post fixed copy here.
function post(
	name: string,
	description: string,
	build: (guild: Guild) => string | string[],
	options: { mentions?: MessageMentionOptions; noEmbeds?: boolean } = {},
) {
	const data = new SlashCommandBuilder()
		.setName(name)
		.setDescription(description)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

	async function run(interaction: ChatInputCommandInteraction<"cached">) {
		if (!interaction.member.roles.cache.has(ids.adminRole)) {
			return interaction.reply({
				content: "Only admins can post this.",
				flags: MessageFlags.Ephemeral,
			});
		}

		await interaction.reply({
			content: "Posting it now.",
			flags: MessageFlags.Ephemeral,
		});

		const parts = [build(interaction.guild)].flat();
		for (const content of parts) {
			await interaction.channel?.send({
				content,
				allowedMentions: options.mentions ?? { parse: [] },
				flags: options.noEmbeds ? MessageFlags.SuppressEmbeds : undefined,
			});
		}
	}

	return { data, run };
}

export const info = post("info", "Post what inat is in this channel", infoPost);

export const tool = post(
	"tool",
	"Post the clipping tools in this channel",
	toolsPost,
	{
		noEmbeds: true,
	},
);

export const announce = post(
	"announce",
	"Post the announcement in this channel",
	announcePost,
	{
		mentions: { roles: [ids.joinRole] },
	},
);

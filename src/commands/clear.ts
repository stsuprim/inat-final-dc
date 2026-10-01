import {
	ChannelType,
	type ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
	.setName("clear")
	.setDescription("Delete messages from this channel")
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
	.addIntegerOption((option) =>
		option
			.setName("amount")
			.setDescription(
				"1-100 messages, 0 for all recent, -1 to recreate the channel",
			)
			.setRequired(true)
			.setMinValue(-1)
			.setMaxValue(100),
	);

export async function run(interaction: ChatInputCommandInteraction<"cached">) {
	const channel = interaction.channel;
	const amount = interaction.options.getInteger("amount", true);

	if (channel?.type !== ChannelType.GuildText) {
		return interaction.reply({
			content: "Use this in a text channel.",
			flags: MessageFlags.Ephemeral,
		});
	}

	if (amount === -1) {
		if (
			!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)
		) {
			return interaction.reply({
				content: "You need Manage Channels for `/clear -1`.",
				flags: MessageFlags.Ephemeral,
			});
		}
		await interaction.reply({
			content: "Recreating this channel...",
			flags: MessageFlags.Ephemeral,
		});
		const reason = `Channel cleared by ${interaction.user.tag}`;
		const clone = await channel.clone({ reason });
		await clone.setPosition(channel.rawPosition, { reason });
		await channel.delete(reason);
		return;
	}

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	if (amount > 0) {
		const deleted = await channel.bulkDelete(amount, true);
		return interaction.editReply(
			`Deleted ${deleted.size} message${deleted.size === 1 ? "" : "s"}.`,
		);
	}

	// Discord only bulk deletes messages under two weeks old.
	let total = 0;
	while (true) {
		const deleted = await channel.bulkDelete(100, true);
		total += deleted.size;
		if (deleted.size < 100) break;
	}

	await interaction.editReply(
		`Deleted ${total} recent message${total === 1 ? "" : "s"}. Use \`/clear -1\` for older ones too.`,
	);
}

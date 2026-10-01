import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type Guild,
} from "discord.js";
import { emojiId, fill } from "../emoji.ts";

export const SUPPORT_BUTTON = "support:open";

const panel = `# :infobook: Need help?
Open a ticket and someone from the team will get back to you.
:bullet: Payouts, campaigns, your account on inat.gg, anything at all.
:rightarrow: Click the button below to open a private channel.`;

export function supportPanel(guild: Guild | null) {
	const button = new ButtonBuilder()
		.setCustomId(SUPPORT_BUTTON)
		.setLabel("Open a ticket")
		.setStyle(ButtonStyle.Primary);
	const mail = emojiId("mail", guild);
	if (mail) button.setEmoji(mail);

	return {
		content: fill(panel, guild),
		components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
	};
}

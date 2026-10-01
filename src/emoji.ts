import type { Guild } from "discord.js";

// Copy is written with plain :name: shortcodes and filled in from the server's
// own emoji on the way out, so re-uploading one never leaves a dead id behind.

export function emojiId(name: string, guild: Guild | null) {
	return guild?.emojis.cache.find((emoji) => emoji.name === name)?.id;
}

export function fill(text: string, guild: Guild | null) {
	return text.replace(/:([a-z0-9_]+):/g, (tag, name: string) => {
		const id = emojiId(name, guild);
		return id ? `<:${name}:${id}>` : tag;
	});
}

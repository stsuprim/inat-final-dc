import type { Guild } from "discord.js";
import { fill } from "../emoji.ts";

const message = `# :clip: Everything you need for clipping
ㅤ
# :capcut: CapCut
### :links: https://capcut.en.uptodown.com/windows/download/1076991318
:bullet: Install this exact version, then turn **automatic updates off** the moment it opens.
:bullet: Use the method below to export with the pro features for free.
### :youtube: https://www.youtube.com/watch?v=NNKVQahCMiU
ㅤ
ㅤ
# :download: Video Downloader
### :links: https://github.com/stsuprim/inat-clipper
:bullet: A simple frontend GUI for yt-dlp with clipping built in.`;

export function toolsPost(guild: Guild | null) {
	return fill(message, guild);
}

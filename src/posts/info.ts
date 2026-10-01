import type { Guild } from "discord.js";
import { ids } from "../config.ts";
import { fill } from "../emoji.ts";

// Two messages, since one would run past Discord's 2000 characters. Split on a
// section break so it still reads as one post.
const parts = [
	`# :inatlogo1024: What is inat?

inat is an officially registered agency in the UK. We sign deals with brands and streamers directly. There is no middle man sitting between us and the client, because we are the middle man ourselves. Every campaign is hosted by us and our own clients, so all you do is join, clip and get paid.
We used to run these campaigns with international clippers, but we are putting the focus on Nepali clippers now. It creates opportunities for skilled Nepali people to earn good money from clipping, and it costs us less than using international clippers. Win win for both ends.

:money: This is not our first time either. We ran a 40K+ USD campaign for **NEEM** and another for the streamer **TBVNKS**, and many more clients. We know what we're doing.
ㅤ
ㅤ
# :shield1: Why inat is different
:rightarrow: We never charge for mentorship, courses or teaching. Not once.
:rightarrow: You choose how you get paid. Crypto if you want it, or straight into your Nepali bank account.
:rightarrow: Everything here is legit. Real company, real contracts.
:rightarrow: We are not gurus selling you a course.
:rightarrow: We will not pay you in crypto and leave you to work out how to withdraw it.
:rightarrow: We will never point you at a shady way to withdraw.
:rightarrow: No burner phones, no proxies, no accounts of your own to set up.
ㅤ
# :globe: inat.gg
Everything in one place. The videos to clip, the live campaigns, and you submit right there.
### :links: <https://inat.gg>
ㅤ
ㅤ`,
	`# :mail: How to apply
:rightarrow: Go to <#${ids.applyChannel}>
:rightarrow: Type \`/apply your@email.com\`
:rightarrow: A channel opens. Tell us your clipping experience, what device you clip on, and what you already know.

:bullet: Use the email you will use on the site. inat.gg is open to our clippers only.`,
];

export function infoPost(guild: Guild | null) {
	return parts.map((part) => fill(part, guild));
}

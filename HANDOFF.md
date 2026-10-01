# inat discord — handoff

Where the INAT Discord bot stands, how it fits together, and what is next.
Written 2026-10-01. Read this top to bottom before changing anything.

---

## 1. What this is

The bot for the INAT Discord server. It runs the apply flow (people apply with
their email, admins approve them onto inat.gg), private support tickets, and
keeps the server's read-only channels locked.

This is a **from-scratch rebuild**. The old bot (`C:\inat\inatdc`, also copies
at `Desktop\inatdc` and `Desktop\INAT (DC)`) is reference only — ported and
improved, never copied. The old bot is gone from Railway; this one replaced it.

The website is a separate project: `Desktop\INAT FINAL` → `stsuprim/inat-final`.
Both share one Postgres.

---

## 2. Working rules (from the owner)

- **Git:** remote `github.com/stsuprim/inat-final-dc`, branch `main`. Identity
  `stsuprim` / `stsuprimthapa@gmail.com`. Every commit message is exactly `inat`.
  **No Claude / AI attribution anywhere.** Push from the `stsuprim` gh account
  (`gh auth switch -u stsuprim`).
- **Replies:** short. Say what happened and stop.
- **Emoji:** always the server's custom emoji, never stock unicode ones, in
  anything the bot posts.
- Ask before mass changes to members (roles, kicks).

---

## 3. Running and deploying

- Node 24, pnpm. Runs TypeScript directly (`node src/main.ts`, type stripping) —
  no build step. `pnpm check` = biome + tsc.
- **Railway:** project `inat`, environment `main`, service **`inat bot`**,
  connected to `stsuprim/inat-final-dc`. **Every push to `main` deploys.**
- Variables (set on Railway): `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`,
  `DISCORD_GUILD_ID`, `DATABASE_URL`. Railway injects `PORT`; the bot serves
  `/health` on it.
- Logs: `railway logs --service "inat bot"` (link first with
  `railway link --project inat --service "inat bot" --environment main`).
- To run one-off scripts with the live token: `railway run node script.mjs`.
  Old tokens in the old bot folders are dead.
- Commands register to the one guild on every start (instant, no global wait).

---

## 4. Code map

| File | What |
| --- | --- |
| `src/main.ts` | Client, startup sequence, event wiring, health server. |
| `src/config.ts` | Env vars + **every role/channel ID**. Change IDs here only. |
| `src/lockdown.ts` | Locks read-only channels on start; deletes stray messages in apply/support. |
| `src/tickets.ts` | Shared private-channel logic for applications and support. |
| `src/emoji.ts` | Fills `:name:` shortcodes from the server's emoji by name. |
| `src/db.ts` | Postgres pool; `approveEmail()` writes `approved_email` + `discord_id`; `approvedClips()` counts approved clips per linked account. |
| `src/levels.ts` | The site's level curve, ported. Change it together with the site's `src/levels/level.ts`. |
| `src/ranks.ts` | Rank sync: linked members hold exactly the rank their level earns. |
| `src/commands/*` | `apply`, `approve`, `rank`, `close`, `clear`, `announce`, support button + panel. |
| `src/posts/*` | Copy the bot posts (support panel, announcement). |

**On every start, in order:** register commands → lock channels → delete old
support panel and post a fresh one → rank sync (then every 2 min) → post "the bot is back up" (pings Admin) in
the team channel, with any problems listed.

---

## 5. How the flows work

**Apply** (`#📤・apply`)
- Nobody can type there; only `/apply email` works. All 5 rank roles lose
  `/apply` too (approved people can never re-apply).
- `/apply` opens a private channel in the Applications category, pings the user
  + Admin, shows the questions and the email at the bottom. Also posts a public
  "Application received" line (no email) in #apply.
- One open application per person. A double-click can't open two.
- Owner + email live in the channel **topic**: `applicant:<userId> <email>`.
  Nothing else stores it.
- `/approve` (inside the channel): inserts the email into `approved_email` and
  links it to the applicant (`discord_id`), gives the rank their site level
  earns (Bronze for a new clipper), removes **Unverified**, closes after 3s.

**Ranks** (`src/ranks.ts`)
- Link: `approved_email.discord_id` (one account, one email; re-approving with
  another email moves the link). Site `user` is matched by email.
- Level = approved clips through the site's curve; rank = Bronze 1–20 … Emerald
  81–100. Every 2 min the bot gives each linked member exactly that rank role
  and takes Unverified off. Only changes are written. Unlinked members are
  never touched.
- `/rank [user]`: level, XP bar, clips to next level and next rank.

**Support** (`#🎫・support`)
- Read-only; only the bot's button. The panel is reposted on every start and
  again instantly if someone deletes it.
- Button opens a private channel in the Support category. One per person —
  a second click says "You already have a ticket open in #…".
- Topic: `support:<userId>`. `/close` (staff) closes either kind of ticket.

**Joining:** everyone gets **Unverified** automatically.

**`/announce`:** posts `src/posts/announce.ts`, pings Unverified only. Edit the
file per announcement.

`/clear amount` — bulk delete; `-1` recreates the channel.

Removed on purpose: `/info`, `/tool`, `/support` (the owner posts info/tools by
hand; the support panel is automatic).

---

## 6. The server

Full snapshot (roles, channels, permission patterns) is mirrored in
`src/config.ts`. Key points:

- **Roles:** Admin · inat (bot) · Team · Marketer · Editor · Emerald · Diamond ·
  Gold · Silver · Bronze · Unverified · Booster. Ranks Bronze→Emerald match the
  site's levelling system (XP from approved clips).
- **INAT category:** info, announcement, tools, apply, support are **read-only,
  enforced by the bot on every start** (any hand edit gets reverted). 💸・wins is
  the one open chat there.
- **GENERAL:** 🤝・community-help (forum, clippers help each other; tags +
  guidelines set by hand), campaign chats (🗨️・reroll, 🗨️・neem).
- **VC:** 🎙️・private (Team only can join), 🎙️・public.
- **team** channel: Admin + Team only. Bot status posts go here.
- Naming style: `emoji・name`.
- Discord rate limits permission edits hard — the lock only writes what
  changed, so restarts are cheap.

---

## 7. Open / next

- **Bronze → Unverified reset — done 2026-10-01.** All 42 Bronze holders
  (Marketers included) lost Bronze and got Unverified; they re-apply. Emails stay
  approved on the site.
- Not tested live yet: a real `/apply` → `/approve` round trip on the new bot.
- Rank sync needs the site's migration `0020_discord_link` live first;
  `/approve` fails without the column.
- Not done: taking ranks off when an email is removed on the site, rank-up
  posts, campaign announcements from the site.

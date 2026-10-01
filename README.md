# inat discord

The bot for the INAT Discord server. It handles applications, support tickets, and the role a member gets after approval.

## Commands

| Command | Who | What |
| --- | --- | --- |
| `/apply email` | anyone in the apply channel | Opens a private application channel. One per person. |
| `/approve` | admins, inside an application | Adds the email to inat.gg, gives the clipper role, takes the join role off, then closes the channel. |
| `/close` | admins, inside a ticket | Closes an application or support channel. |
| `/announce` | admins | Posts the announcement from `src/posts/announce.ts`. |
| `/clear amount` | Manage Messages | Bulk delete. `-1` recreates the channel. |

On every start the bot makes info, announcement, tools, apply and support read only. Every rank loses `/apply`. It also reposts the support panel, and posts it again if someone deletes it.

## Variables

`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `DATABASE_URL`. Copy `.env.example` to `.env` and fill these in to run it locally.

```bash
pnpm install
pnpm dev
```

Server IDs (roles, channels, categories) are in `src/config.ts`.

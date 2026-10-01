# inat discord

The bot for the INAT Discord server. It handles applications, support tickets, and the role a member gets after approval.

## Commands

| Command | Who | What |
| --- | --- | --- |
| `/apply email` | anyone in the apply channel | Opens a private application channel. One per person. |
| `/approve` | admins, inside an application | Adds the email to inat.gg, gives the clipper role, takes the join role off, then closes the channel. |
| `/close` | admins, inside a ticket | Closes an application or support channel. |
| `/support` | admins, in the support channel | Posts the "Open a ticket" panel. One open ticket per person. |
| `/info` `/tool` `/announce` | admins | Post fixed copy from `src/posts`. |
| `/clear amount` | Manage Messages | Bulk delete. `-1` recreates the channel. |

On every start the bot locks the apply and support channels so nobody can type in them. The clipper role also loses `/apply` in the apply channel.

## Variables

`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `DATABASE_URL`. Copy `.env.example` to `.env` and fill these in to run it locally.

```bash
pnpm install
pnpm dev
```

Server IDs (roles, channels, categories) are in `src/config.ts`.

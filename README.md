# Finnberry

An open-source baby tracking app with MCP (Model Context Protocol) integration.

## Features

- **Sleep Tracking**: Timer-based tracking for naps and night sleep with quality ratings
- **Feeding Tracking**: Breastfeeding with per-side duration tracking and side switching, bottle (with amounts), and solids
- **Diaper Tracking**: Wet, dirty, or both with optional color/consistency/amount
- **Pumping Tracking**: Timer-based pumping sessions with left/right amounts
- **Growth Tracking**: Weight, height, and head circumference with imperial/metric support
- **Temperature Tracking**: Body temperature logging with C/F conversion and fever status
- **Activity Tracking**: Bath, tummy time, outdoor play, screen time, and more with timer support
- **Medicine Tracking**: Log medicine doses with custom medicines and dosage tracking
- **Multi-Caregiver Support**: Share access with family members and caregivers
- **Caregiver Sync**: Another caregiver's entries appear within 30 seconds, or as soon as you return to the app
- **Multiple Report Views**: Day view, week view, and list view for activity history
- **Visual Timeline**: Daily activity timeline with visual representation of all activity types
- **Activity Editing**: Edit logged activities with duration sliders and detailed controls
- **AI Chat Interface**: Natural language interaction for logging and querying baby data
- **MCP Integration**: AI agent integration for logging and analyzing baby data

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **API**: tRPC v11
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Auth**: NextAuth.js v5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **MCP**: @modelcontextprotocol/sdk
- **State**: Zustand
- **Monorepo**: Turborepo

## Project Structure

```
finnberry/
├── apps/
│   ├── web/                 # Next.js webapp
│   └── mcp-server/          # MCP Server
├── packages/
│   ├── db/                  # Prisma schema + client
│   ├── api/                 # tRPC routers
│   ├── schemas/             # Shared Zod schemas
│   └── utils/               # Shared utilities
└── turbo.json
```

## Deploy to Vercel

The easiest way to deploy Finnberry is with Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbckenstler%2Ffinnberry&env=DATABASE_URL,DIRECT_URL,AUTH_SECRET,NEXTAUTH_URL&envDescription=Required%20environment%20variables%20for%20Finnberry&envLink=https%3A%2F%2Fgithub.com%2Fbckenstler%2Ffinnberry%23environment-variables&project-name=finnberry&repository-name=finnberry&root-directory=apps/web)

### Manual Vercel Setup

1. Import your repository in the [Vercel dashboard](https://vercel.com/new)
2. Set **Root Directory** to `apps/web`
3. Configure the required environment variables (see [Environment Variables](#environment-variables))
4. Deploy

### API Timeout (Vercel Plans)

The AI chat feature uses streaming responses. The default timeout is 60 seconds (Pro plan). For Hobby (free) plan, edit `apps/web/src/app/api/chat/route.ts` and change `maxDuration` to `10`.

| Plan | Max Duration |
|------|--------------|
| Hobby (free) | 10 seconds |
| Pro | 60 seconds |
| Enterprise | 900 seconds |

## Getting Started

For local development:

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase project (or local PostgreSQL)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/finnberry.git
   cd finnberry
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp apps/web/.env.example apps/web/.env
   ```

4. Configure your `apps/web/.env` file (see [Environment Variables](#environment-variables) below)

5. Generate Prisma client and push schema:
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

6. Start the development server:
   ```bash
   pnpm dev
   ```

The app will be available at `http://localhost:3000`.

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL pooler connection string |
| `DIRECT_URL` | Direct PostgreSQL connection (for migrations) |
| `AUTH_SECRET` | NextAuth secret - generate with `openssl rand -base64 32` |

### Optional

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | App URL - required for production, auto-detected in dev |
| `ADMIN_EMAIL` | The only address allowed to become the instance admin (see [Accounts and Approval](#accounts-and-approval)) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `EMAIL_SERVER` | SMTP connection string for magic link emails |
| `EMAIL_FROM` | Sender email address for magic links |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI Chat feature |
| `CHAT_ALLOWED_MODELS` | Models offered in chat, comma separated. Default `haiku,sonnet` |
| `CHAT_DAILY_REQUEST_LIMIT` | Model calls each user may make per day. Default `200` |
| `CHAT_DAILY_TOKEN_LIMIT` | Tokens each user may use per day. Default `2000000` |

### Email Configuration

For magic link authentication, configure `EMAIL_SERVER` with your SMTP provider:

```bash
# Resend
EMAIL_SERVER="smtps://resend:re_YOUR_API_KEY@smtp.resend.com:465"

# Gmail (requires app password)
EMAIL_SERVER="smtps://you@gmail.com:app-password@smtp.gmail.com:465"
```

## Accounts and Approval

Anyone who can use one of the configured sign-in methods can sign in, but a new account can do nothing until the instance admin approves it. This keeps a public deployment private to the people you choose.

- **The admin** is the first account to sign in. To make sure that is you and not whoever finds the login page first, set `ADMIN_EMAIL` to your address before deploying: then only that address can become the admin, whenever it signs in. There is one admin per instance.
- **Everyone else** lands on a "Waiting for approval" page after signing in. This includes people invited to a household.
- **The admin approves or rejects accounts** under **Accounts** in the avatar menu. An approved account can be revoked at any time; revoking or rejecting also signs the account out, and it takes effect on the next request.
- Google sign-in is accepted only for addresses Google reports as verified.

The admin account cannot be rejected or deleted from the app. To hand the role to a different address, clear it in the database, set `ADMIN_EMAIL` to the new address, and sign in with it:

```sql
DELETE FROM instance_admin_claims;
UPDATE users SET is_admin = false WHERE is_admin;
```

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)

2. Get your connection strings from Project Settings → Database:
   - **Connection string (pooler)** → `DATABASE_URL`
   - **Connection string (direct)** → `DIRECT_URL`

3. Create the tables with `pnpm db:push`. This also locks the database down (see below), so use it every time the schema changes.

Finnberry needs only the two connection strings. It does not use the project's API keys, and nothing in the browser talks to Supabase.

### Database Lockdown

Supabase publishes every table in the `public` schema through an auto-generated REST API, readable and writable by anyone who has the project's anon key, unless Row Level Security is enabled on the table. Those tables include sign-in sessions and all tracking data.

`pnpm db:push` therefore finishes by running `packages/db/prisma/rls.sql`, which enables Row Level Security on every table with no policies, removes the API roles' table grants, and takes the tables out of the Realtime publication. The app is unaffected because it connects as the table owner. Run `pnpm db:rls` to apply the lockdown on its own, for example after creating tables some other way.

To confirm, this query returns no rows in the Supabase SQL editor:

```sql
SELECT relname FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND NOT relrowsecurity;
```

## Database Commands

| Command | Use Case |
|---------|----------|
| `pnpm db:push` | Sync the schema (no migration files), then apply the database lockdown |
| `pnpm db:rls` | Apply the database lockdown on its own |
| `pnpm db:migrate` | Production - creates migration history |
| `pnpm db:generate` | Regenerate Prisma client after schema changes |
| `pnpm db:studio` | Open Prisma Studio to browse data |

These commands read the database settings from `apps/web/.env`, the same file the app uses. A variable set in the shell takes precedence over the file.

### Accessing from Other Devices

Development mode (`pnpm dev`) is for the machine you are developing on. It trusts whatever host a request claims to come from, which is convenient on `localhost` and unsafe anywhere else, so do not use it to serve other devices or to hold real data.

To use Finnberry from a phone, another computer, or the internet, run a production build:

```bash
pnpm build
pnpm --filter @finnberry/web start
```

#### Production/Self-Hosted Deployment

A production build needs `NEXTAUTH_URL` set in your `.env` file to the address people will open. Sign-in does not work without it, and magic links are built from it:

```bash
# For a home server on your LAN
NEXTAUTH_URL="http://192.168.1.100:3000"

# For a cloud server (EC2, DigitalOcean, etc.)
NEXTAUTH_URL="http://your-server-ip:3000"

# For production with a domain
NEXTAUTH_URL="https://finnberry.yourdomain.com"
```

Because links are built from this value and not from the request, a forged Host header cannot redirect a magic link.

#### Network Access

**For remote servers (e.g., EC2)**:
- Open port 3000 in your security group/firewall
- Set `NEXTAUTH_URL` to your server's public IP or domain
- Consider using a reverse proxy (nginx/caddy) with SSL for internet-facing deployments

**Security Best Practices**:
- Use HTTPS in production (via reverse proxy with Let's Encrypt)
- Don't expose the app directly to the internet without proper security
- Use a strong database password and a generated `AUTH_SECRET`
- Set `ADMIN_EMAIL` so that only you can become the instance admin
- Keep dependencies updated

A production server refuses to serve anything if `AUTH_SECRET` is missing, shorter than 32 characters, or still the example value, if `NEXTAUTH_URL` is not set, or if the test seed endpoint is switched on. Every request gets an error, and the server log names what to fix.

Every response carries a Content Security Policy and related headers that forbid framing by other sites and loading scripts from other origins. Requests for sign-in links are limited to 3 per address in 10 minutes and 100 per hour across the instance.

## AI Chat Interface

The dashboard includes a Chat tab that allows natural language interaction with your baby tracking data.

### Features

- **Natural Language Logging**: Say "Log a wet diaper" or "Start a nap for the baby"
- **Query Data**: Ask "What did the baby do today?" or "How much sleep did the baby get this week?"
- **Photos**: Attach up to 4 photos (a handwritten log, a daycare sheet, a screenshot from another app, a thermometer) and the assistant reads the entries and offers to log them. It lists what it read and asks before logging more than one entry. Photos are resized in the browser, sent to Anthropic with the message, and not stored by Finnberry
- **Streaming Responses**: Real-time streaming of AI responses with tool execution visualization
- **Model Selection**: Choose between Haiku (fast) and Sonnet (balanced). Opus (most capable) is available when the deployment allows it

### Setup

1. Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. Add to your `.env` file:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. The Chat tab will appear in the dashboard alongside Home and Reports

### Usage Limits

Chat runs on your Anthropic API key, so every approved user's chat is paid for by you. Each user has a daily allowance, counted in UTC days:

- `CHAT_DAILY_REQUEST_LIMIT` caps model calls. One message uses one call, plus one more for each round of tool use, up to 8 per message.
- `CHAT_DAILY_TOKEN_LIMIT` caps tokens, counting input and output.
- `CHAT_ALLOWED_MODELS` chooses which of `haiku`, `sonnet` and `opus` the picker offers. Opus costs several times what the others do and is off unless listed.

A user who reaches a limit is told so and can chat again the next day.

A message with photos can be a few megabytes. If the app sits behind a reverse proxy, allow request bodies of at least 6 MB (nginx: `client_max_body_size 6m;`, its default is 1 MB).

### Example Interactions

- "Log a wet diaper"
- "Start tracking sleep"
- "Log a 4oz bottle of formula"
- Attach a photo of the daycare sheet and say "Log everything on this"
- "What time was the last feeding?"
- "Give me a summary of today's activities"

## MCP Server

The MCP server allows AI agents (like Claude) to interact with your baby tracking data.

### Available Tools

| Tool | Description |
|------|-------------|
| `start-sleep` | Start a sleep timer |
| `end-sleep` | End an active sleep session |
| `log-sleep` | Log a completed sleep |
| `get-sleep-summary` | Get sleep statistics |
| `log-breastfeeding` | Log breastfeeding session |
| `log-bottle` | Log bottle feeding |
| `log-solids` | Log solid food |
| `get-feeding-summary` | Get feeding statistics |
| `log-diaper` | Log diaper change |
| `get-diaper-summary` | Get diaper statistics |
| `list-children` | List all children |
| `get-daily-summary` | Get all activity for a day |

Every tool except `list-children` takes a `childId`. Tools that act on an existing record, such as `end-sleep`, take the record id as well and only match a record that belongs to that child.

### Available Resources

| URI | Description |
|-----|-------------|
| `finnberry://children` | List all children |
| `finnberry://children/{id}` | Child profile |
| `finnberry://children/{id}/today` | Today's activity |
| `finnberry://children/{id}/sleep?period=week` | Sleep records |
| `finnberry://children/{id}/feeding?period=week` | Feeding records |

### Available Prompts

| Prompt | Description |
|--------|-------------|
| `analyze-sleep-patterns` | Get AI insights on sleep patterns |
| `daily-summary` | Generate parent-friendly daily summary |

### Using with Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "finnberry": {
      "command": "node",
      "args": ["/path/to/finnberry/apps/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "your-database-url"
      }
    }
  }
}
```

Build the MCP server first:
```bash
cd apps/mcp-server
pnpm build
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development servers |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run linting |
| `pnpm type-check` | Run TypeScript checks |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Run database migrations |

## Testing

```bash
pnpm test           # Run all tests (Vitest)
pnpm test:e2e       # Run Playwright E2E tests (requires dev server)
pnpm test:coverage  # Run tests with coverage report
```

See `CLAUDE.md` for detailed testing documentation.

## License

MIT

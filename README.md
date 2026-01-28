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
- **Real-time Sync**: Changes sync instantly across all devices
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
- **Real-time**: Supabase Realtime
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

## Getting Started

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
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (for realtime) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (for realtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side access) |
| `EMAIL_SERVER` | SMTP connection string for magic link emails |
| `EMAIL_FROM` | Sender email address for magic links |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI Chat feature |

### Email Configuration

For magic link authentication, configure `EMAIL_SERVER` with your SMTP provider:

```bash
# Resend
EMAIL_SERVER="smtps://resend:re_YOUR_API_KEY@smtp.resend.com:465"

# Gmail (requires app password)
EMAIL_SERVER="smtps://you@gmail.com:app-password@smtp.gmail.com:465"
```

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)

2. Get your connection strings from Project Settings → Database:
   - **Connection string (pooler)** → `DATABASE_URL`
   - **Connection string (direct)** → `DIRECT_URL`

3. Get API keys from Project Settings → API:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

4. Enable Realtime for tables (optional, for real-time sync):
   - Go to Database → Replication
   - Enable replication for: `sleep_records`, `feeding_records`, `diaper_records`, `pumping_records`, `growth_records`, `activity_records`, `temperature_records`, `medicine_records`

## Database Commands

| Command | Use Case |
|---------|----------|
| `pnpm db:push` | Development - quick schema sync, no migration files |
| `pnpm db:migrate` | Production - creates migration history |
| `pnpm db:generate` | Regenerate Prisma client after schema changes |
| `pnpm db:studio` | Open Prisma Studio to browse data |

### Accessing from Other Devices

#### Development Mode

In development (`NODE_ENV=development`), the app automatically detects the host from request headers for convenience:

- **Localhost**: Works at `http://localhost:3000`
- **LAN access**: Works at `http://<your-local-ip>:3000` (e.g., from your phone)
- **Test server**: Works at `http://<server-ip>:3000`

Magic links will automatically use the correct URL you accessed the app from.

#### Production/Self-Hosted Deployment

**IMPORTANT**: For production or when exposing to the internet, you **must** set `NEXTAUTH_URL` explicitly in your `.env` file for security:

```bash
# For a home server on your LAN
NEXTAUTH_URL="http://192.168.1.100:3000"

# For a cloud server (EC2, DigitalOcean, etc.)
NEXTAUTH_URL="http://your-server-ip:3000"

# For production with a domain
NEXTAUTH_URL="https://finnberry.yourdomain.com"
```

This prevents Host header injection attacks.

#### Network Access

**For remote servers (e.g., EC2)**:
- Open port 3000 in your security group/firewall
- Set `NEXTAUTH_URL` to your server's public IP or domain
- Consider using a reverse proxy (nginx/caddy) with SSL for internet-facing deployments

**Security Best Practices**:
- Use HTTPS in production (via reverse proxy with Let's Encrypt)
- Don't expose the app directly to the internet without proper security
- Use strong passwords for database and `NEXTAUTH_SECRET`
- Keep dependencies updated

## AI Chat Interface

The dashboard includes a Chat tab that allows natural language interaction with your baby tracking data.

### Features

- **Natural Language Logging**: Say "Log a wet diaper" or "Start a nap for the baby"
- **Query Data**: Ask "What did the baby do today?" or "How much sleep did the baby get this week?"
- **Streaming Responses**: Real-time streaming of AI responses with tool execution visualization
- **Model Selection**: Choose between Haiku (fast), Sonnet (balanced), or Opus (most capable)

### Setup

1. Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. Add to your `.env` file:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. The Chat tab will appear in the dashboard alongside Home and Reports

### Example Interactions

- "Log a wet diaper"
- "Start tracking sleep"
- "Log a 4oz bottle of formula"
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

# Finnberry

An open-source baby tracking app with MCP (Model Context Protocol) integration.

## Features

- **Sleep Tracking**: Timer-based tracking for naps and night sleep with quality ratings
- **Feeding Tracking**: Breastfeeding (with side tracking), bottle (with amounts), and solids
- **Diaper Tracking**: Wet, dirty, or both with optional color/consistency
- **Multi-Caregiver Support**: Share access with family members and caregivers
- **Real-time Sync**: Changes sync instantly across all devices
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
   cp .env.example .env
   ```

4. Configure your `.env` file with:
   - `DATABASE_URL` - Your Supabase PostgreSQL connection string
   - `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
   - Google OAuth credentials (optional)
   - Email server settings (optional)

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

## License

MIT

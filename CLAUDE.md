# Finnberry - Claude Context

This file provides context for Claude when working on this codebase.

## Project Overview

Finnberry is an open-source baby tracking application (clone of Huckleberry) with MCP integration. It helps parents track sleep, feeding, diapers, and more with real-time sync across caregivers.

## Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19
- **Language**: TypeScript (strict mode)
- **API**: tRPC v11 with SuperJSON transformer
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma 6
- **Auth**: NextAuth.js v5 (email magic link + Google OAuth)
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **State**: Zustand with localStorage persistence
- **Real-time**: Supabase Realtime WebSocket subscriptions
- **MCP**: @modelcontextprotocol/sdk for AI agent integration
- **Monorepo**: Turborepo with pnpm workspaces

## Project Structure

```
finnberry/
├── apps/
│   ├── web/                     # Next.js webapp
│   │   ├── src/
│   │   │   ├── app/             # App Router pages
│   │   │   │   ├── (auth)/      # Auth pages (login, verify)
│   │   │   │   ├── (dashboard)/ # Protected dashboard routes
│   │   │   │   └── api/         # API routes (tRPC, NextAuth)
│   │   │   ├── components/
│   │   │   │   ├── ui/          # shadcn/ui components
│   │   │   │   ├── tracking/    # Sleep, feeding, diaper components
│   │   │   │   └── dashboard/   # Dashboard layout components
│   │   │   ├── hooks/           # React hooks (use-timer, use-toast, use-realtime)
│   │   │   ├── lib/             # Config (auth, trpc, supabase, utils)
│   │   │   └── stores/          # Zustand stores (timer-store)
│   │   └── package.json
│   │
│   └── mcp-server/              # MCP Server for AI integration
│       └── src/
│           ├── index.ts         # Server entry point (stdio transport)
│           ├── tools/           # MCP tools (sleep, feeding, diaper, etc.)
│           ├── resources/       # MCP resources (children, activity data)
│           └── prompts/         # MCP prompts (analyze-sleep, daily-summary)
│
├── packages/
│   ├── db/                      # Prisma schema + client
│   │   ├── prisma/schema.prisma # Database schema (13 models)
│   │   └── src/index.ts         # Prisma client singleton
│   │
│   ├── api/                     # tRPC routers
│   │   └── src/
│   │       ├── trpc.ts          # tRPC context, procedures, middleware
│   │       ├── root.ts          # Root router combining all routers
│   │       └── routers/         # Individual routers (9 total)
│   │
│   ├── schemas/                 # Shared Zod validation schemas
│   │   └── src/                 # One file per domain (sleep, feeding, etc.)
│   │
│   └── utils/                   # Shared utilities
│       └── src/
│           ├── date.ts          # Date formatting, ranges, duration calc
│           └── format.ts        # ML, weight, height formatters
│
└── Configuration files
```

## Common Commands

```bash
# Development
pnpm dev                    # Start all apps in development mode
pnpm build                  # Build all packages and apps
pnpm lint                   # Run ESLint across all packages
pnpm type-check             # Run TypeScript checks

# Database
pnpm db:generate            # Generate Prisma client
pnpm db:push                # Push schema to database (no migration)
pnpm db:migrate             # Run database migrations
pnpm --filter @finnberry/db db:studio  # Open Prisma Studio

# Individual apps
pnpm --filter @finnberry/web dev       # Run only web app
pnpm --filter @finnberry/mcp-server build  # Build MCP server
```

## Key Patterns

### tRPC Procedures

Three procedure types in `packages/api/src/trpc.ts`:
- `publicProcedure` - No auth required
- `protectedProcedure` - Requires authenticated session
- `householdProcedure` - Requires auth + validates household/child access

### Timer System

Timers persist in localStorage via Zustand (`apps/web/src/stores/timer-store.ts`):
- Start timer → store in Zustand + create DB record
- Stop timer → remove from Zustand + update DB record with endTime
- Page refresh → timers restored from localStorage

### Real-time Sync

Supabase Realtime in `apps/web/src/hooks/use-realtime.ts`:
- Subscribe to postgres_changes on record tables
- Filter by child_id
- Invalidate tRPC queries on changes

### MCP Server

The MCP server (`apps/mcp-server/`) provides:
- **Tools**: Actions like `start-sleep`, `log-feeding`, `log-diaper`
- **Resources**: Read-only data like `finnberry://children/{id}/today`
- **Prompts**: AI analysis prompts like `analyze-sleep-patterns`

## Database Schema

Key models in `packages/db/prisma/schema.prisma`:
- `User`, `Account`, `Session` - NextAuth.js models
- `Household`, `HouseholdMember`, `HouseholdInvite` - Multi-caregiver
- `Child` - Child profiles
- `SleepRecord`, `FeedingRecord`, `DiaperRecord` - Core tracking
- `PumpingRecord`, `GrowthRecord`, `ActivityRecord` - Extended tracking
- `Medicine`, `MedicineRecord` - Medicine tracking

## Conventions

### File Naming
- React components: PascalCase (`QuickLogGrid.tsx`)
- Utilities/hooks: kebab-case (`use-timer.ts`)
- Routes: lowercase with brackets for params (`[childId]/page.tsx`)

### Imports
- Use `@/` alias for web app internal imports
- Use `@finnberry/` for monorepo package imports

### Component Structure
- UI components in `components/ui/` (shadcn/ui style)
- Feature components co-located with routes or in `components/`
- Server components by default, `"use client"` only when needed

### API Patterns
- All mutations invalidate relevant queries
- Use optimistic updates for timer actions
- Toast notifications for user feedback

## Environment Variables

Create `.env` in `apps/web/` (see `apps/web/.env.example`):
```
DATABASE_URL=            # Supabase PostgreSQL connection
DIRECT_URL=              # Direct connection (for migrations)
AUTH_SECRET=             # Generate with: openssl rand -base64 32

# Optional
NEXTAUTH_URL=            # http://localhost:3000 for dev (auto-detected if not set)
GOOGLE_CLIENT_ID=        # For Google OAuth
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Testing the MCP Server

1. Build: `pnpm --filter @finnberry/mcp-server build`
2. Add to Claude Desktop config:
```json
{
  "mcpServers": {
    "finnberry": {
      "command": "node",
      "args": ["/path/to/finnberry/apps/mcp-server/dist/index.js"],
      "env": { "DATABASE_URL": "..." }
    }
  }
}
```
3. Test tools: `list-children`, `get-daily-summary`, `log-diaper`, etc.

## Known Limitations / TODOs

- No photo upload for children yet
- Growth charts with percentiles not implemented
- PWA support not added
- No data export (CSV/JSON) UI yet
- Email sending for magic links needs SMTP config

# Finnberry - Claude Context

This file provides context for Claude when working on this codebase.

## Project Overview

Finnberry is an open-source baby tracking application (clone of Huckleberry) with MCP integration. It helps parents track sleep, feeding, diapers, pumping, growth, temperature, activities, and medicine with sync across caregivers.

## Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19
- **Language**: TypeScript (strict mode)
- **API**: tRPC v11 with SuperJSON transformer
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma 6
- **Auth**: NextAuth.js v5 (email magic link + Google OAuth)
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **State**: Zustand with localStorage persistence
- **Caregiver sync**: React Query polling and refetch on focus
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
│   │   │   │   └── api/         # API routes (tRPC, NextAuth, chat, test/seed)
│   │   │   ├── components/
│   │   │   │   ├── ui/          # shadcn/ui components
│   │   │   │   ├── tracking/    # Sleep, feeding, diaper, timer components
│   │   │   │   ├── reports/     # Day/week/list views, activity rows, timeline
│   │   │   │   ├── chat/        # AI chat interface components
│   │   │   │   └── dashboard/   # Dashboard layout, child selector
│   │   │   ├── hooks/           # React hooks (use-timer, use-toast, use-chat)
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
│   │   ├── prisma/schema.prisma # Database schema (19 models)
│   │   └── src/index.ts         # Prisma client singleton
│   │
│   ├── api/                     # tRPC routers
│   │   └── src/
│   │       ├── trpc.ts          # tRPC context, procedures, middleware
│   │       ├── root.ts          # Root router combining all routers
│   │       └── routers/         # Individual routers (13 total)
│   │
│   ├── schemas/                 # Shared Zod validation schemas
│   │   └── src/                 # One file per domain (sleep, feeding, etc.)
│   │
│   └── utils/                   # Shared utilities
│       └── src/
│           ├── date.ts          # Date formatting, ranges, duration calc
│           ├── format.ts        # ML, oz, weight, height, temperature formatters
│           └── timeline.ts      # Timeline data utilities
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

# Fresh worktree/clone setup
# The web app imports from @finnberry/mcp-server/tools which requires the dist folder.
# On a fresh clone or worktree, build the MCP server first:
pnpm --filter @finnberry/mcp-server build

# Database
pnpm db:generate            # Generate Prisma client
pnpm db:push                # Push schema to database (no migration), then apply prisma/rls.sql
pnpm db:migrate             # Run database migrations
pnpm --filter @finnberry/db db:studio  # Open Prisma Studio

# Individual apps
pnpm --filter @finnberry/web dev       # Run only web app
pnpm --filter @finnberry/mcp-server build  # Build MCP server

# Testing
pnpm test                   # Run all tests (Vitest)
pnpm test:unit              # Run utils + schemas tests only
pnpm test:integration       # Run API integration tests only
pnpm test:components        # Run web component tests only
pnpm test:e2e               # Run Playwright E2E tests (requires dev server)
pnpm test:coverage          # Run tests with coverage report
```

## Testing

### Test Coverage

| Suite | Framework | Tests | Description |
|-------|-----------|-------|-------------|
| Unit | Vitest | ~240 | Utils + Schemas validation |
| Integration | Vitest | ~120 | tRPC routers with mocked Prisma |
| E2E | Playwright | 25 | Full browser tests with real DB |

### Test Structure

```
finnberry/
├── packages/
│   ├── utils/src/*.test.ts        # Unit tests for utilities
│   ├── schemas/src/*.test.ts      # Schema validation tests (11 files)
│   └── api/src/
│       ├── test/                   # Test setup and helpers
│       │   ├── setup.ts            # Prisma mock setup
│       │   └── helpers.ts          # Test context creators, factories
│       ├── trpc.test.ts            # Middleware tests
│       └── routers/*.test.ts       # Router integration tests (9 routers)
└── apps/web/
    ├── src/stores/*.test.ts        # Zustand store tests
    └── e2e/                         # Playwright E2E tests
        ├── fixtures/
        │   ├── auth.ts              # Authenticated page/context fixtures
        │   └── database.ts          # Test data seeding via API
        ├── auth.spec.ts             # Login, magic link, error pages
        ├── household.spec.ts        # Dashboard, child navigation
        ├── tracking.spec.ts         # Sleep, feeding, diaper tracking
        ├── timer-persistence.spec.ts # Timer survives refresh
        └── realtime-sync.spec.ts    # Optimistic updates
```

### Writing API Tests

API tests use mocked Prisma. Import helpers from `test/helpers.ts`:

```typescript
import { prismaMock } from "../test/setup";
import { createTestContext, createTestMembership, TEST_IDS } from "../test/helpers";
import { createCallerFactory } from "../trpc";
import { myRouter } from "./my-router";

const createCaller = createCallerFactory(myRouter);

it("does something", async () => {
  const ctx = createTestContext();
  const caller = createCaller(ctx);

  // Setup mocks
  prismaMock.householdMember.findUnique.mockResolvedValue(
    createTestMembership({ role: "OWNER" }) as never
  );

  // Call procedure
  const result = await caller.myProcedure({ ... });

  // Assert
  expect(result).toBeDefined();
});
```

### Test IDs

Use valid CUID format IDs from `TEST_IDS` constant:
```typescript
import { TEST_IDS } from "../test/helpers";
// TEST_IDS.userId, TEST_IDS.householdId, TEST_IDS.childId, etc.
```

### E2E Test Infrastructure

E2E tests use a test seed API (`/api/test/seed`) to create real database records:
- Answers only outside a production build, with `ENABLE_TEST_SEED=1`, to a caller sending `TEST_SEED_SECRET` (16+ characters) in the `x-test-seed-secret` header; otherwise it returns 404. Put both variables in `apps/web/.env`: the dev server and Playwright both read it
- Only touches users, households and children whose email or name starts with `e2e-test`
- Creates test users, sessions, households, and children. Test users are created `APPROVED` unless the call passes a `status`
- Cleanup removes all records prefixed with `e2e-test`

Tests run serially (`workers=1`) to avoid race conditions. Run with:
```bash
# Requires dev server running on port 3001
BASE_URL=http://localhost:3001 pnpm test:e2e
```

## Key Patterns

### tRPC Procedures

Procedure types in `packages/api/src/trpc.ts`:
- `publicProcedure` - No auth required
- `protectedProcedure` - Requires authenticated session
- Household-scoped procedures - Require auth and membership of the household that owns the target. Each one validates a single input key and authorizes on it, so pick the one matching the key the handler acts on:
  - `householdProcedure` - input has `householdId`
  - `childProcedure` - input has `childId`
  - `medicineProcedure` - input has `medicineId`
  - `byIdProcedure("sleepRecord")` etc. - input has `id`; the argument says what kind of resource `id` names

A household-scoped handler always has `ctx.householdId` and `ctx.memberRole`. A resource that does not exist is `NOT_FOUND`; a caller outside its household is `FORBIDDEN`. Add the rest of the input with a second `.input(schema)`. Never authorize on raw input, and never add a handler that looks a record up by `id` under `protectedProcedure`.

Household roles: `OWNER` comes only from creating a household. Invites and role changes accept `ADMIN`, `CAREGIVER` or `VIEWER` (`assignableRoleSchema`), only an owner can invite or remove an admin, and an owner cannot be removed or demoted.

### Accounts and Approval

Signing in is open; using the app is not. `User.status` starts `PENDING` and the single instance admin (`User.isAdmin`) sets it to `APPROVED` or `REJECTED`.

- The first sign-in claims admin in `apps/web/src/lib/instance-admin.ts`, called from `events.signIn` in `apps/web/src/lib/auth.ts`. The `InstanceAdminClaim` table holds at most one row with a fixed primary key, which is what makes the claim race-safe. `ADMIN_EMAIL` restricts who may claim
- Sessions are database-backed, so the session callback reads `status` and `isAdmin` from the user row on every request
- Approval is enforced in three places, and a new entry point must add its own check: `protectedProcedure` (every tRPC procedure), `(dashboard)/layout.tsx` (redirects to `/pending`), and `/api/chat`
- `adminProcedure` and `packages/api/src/routers/admin.ts` back the Accounts page (`dashboard/admin`). Rejecting an account deletes its sessions
- The user-facing description, including how to hand the admin role over, is in the README under "Accounts and Approval"

### Configuration Hardening

- `apps/web/src/lib/env.ts`, called from `src/instrumentation.ts`, makes a production server fail every request (and log why) when started with a missing, short or placeholder `AUTH_SECRET`, no `NEXTAUTH_URL`, or `ENABLE_TEST_SEED` set. It is skipped during `next build`
- `apps/web/next.config.ts` sets the Content Security Policy and other security headers. A new external origin (script, API, websocket) must be added to the policy there or the browser blocks it
- `apps/web/src/lib/magic-link-throttle.ts` limits sign-in link requests per address and per instance, called from the `signIn` callback

### Timer System

Timers persist in localStorage via Zustand (`apps/web/src/stores/timer-store.ts`):
- Start timer → store in Zustand + create DB record
- Stop timer → remove from Zustand + update DB record with endTime
- Page refresh → timers restored from localStorage
- Breastfeeding timers support per-side duration tracking (leftDurationSeconds, rightDurationSeconds)
- Side switching during active breastfeeding timer
- When activities are started via Chat/MCP (database only), the UI syncs on modal open via `getActive` queries

### AI Chat Interface

The dashboard includes a Chat tab (`apps/web/src/components/chat/`) for natural language interaction:
- Uses Anthropic SDK with streaming responses (`/api/chat` route)
- Tool calling for logging activities and querying data
- Model selection, limited to `CHAT_ALLOWED_MODELS` (default Haiku and Sonnet). `GET /api/chat` tells the UI which are offered
- Per-user daily limits in `apps/web/src/lib/chat-usage.ts`, stored in `ChatUsage`: each model call is reserved before it is made, tokens are recorded after, and one message may make at most 8 model calls. Defaults and env names are in the README under "Usage Limits"
- Errors sent to the client are generic; the real error is logged. `handleToolCall` passes on a handler's own message but replaces Prisma errors
- Streaming text and tool execution visualization
- Image attachments: the browser resizes each photo to a JPEG (`apps/web/src/lib/image.ts`) and sends it base64 in the request; the route passes it to the model as an image block. Images are not stored. History resends images only for the latest turn that had any, and only until a tool call succeeds after it
- The request body is validated by `chatRequestSchema` (`packages/schemas/src/chat.ts`), which owns the image count and size limits
- Tool calls are scoped in the route: only tools that take a `childId` are offered (so `list-children` is not), only offered tools run, and `childId` is always overwritten with the authorized one. A `VIEWER` is offered only the read tools (`get-`, `query-`, `list-` prefixes). Text in images is untrusted, so do not relax this
- Key files:
  - `chat-interface.tsx` - Main chat container with messages and input
  - `chat-message.tsx` - User/assistant message bubbles with tool call display
  - `use-chat.ts` hook - Manages chat state, streaming, and abort handling

### Timeline Views

Reports section has three views, all showing all 8 activity types:
- **Day View** (`day-view.tsx` + `timeline/track.tsx`) - Vertical timeline with clickable event blocks
- **Week View** (`week-view.tsx`) - 7-column grid with activity markers
- **List View** (`list-view.tsx`) - Chronological list grouped by date

The `timeline.ts` router fetches all record types (sleep, feeding, diaper, pumping, medicine, growth, temperature, activity) for each view. Cache invalidation in `activity-row.tsx` ensures all views update after edits/deletes.

### Caregiver Sync

Another caregiver's changes arrive by polling: the React Query defaults in `apps/web/src/components/providers.tsx` refetch every query every 30 seconds while the tab is visible, and on window focus. Nothing in the browser connects to Supabase, and the app does not use the Supabase API keys.

### Database Lockdown

Supabase serves every `public` table over a REST API to anyone with the project's anon key unless Row Level Security is on. `packages/db/prisma/rls.sql` enables RLS on every table with no policies (Prisma connects as the owner and is unaffected), revokes the API roles' grants, and empties the Realtime publication. `pnpm db:push` runs it after each push, so a new table is covered automatically; do not create tables by another route without running `pnpm db:rls`.

### MCP Server

The MCP server (`apps/mcp-server/`) provides:
- **Tools**: Actions like `start-sleep`, `log-feeding`, `log-diaper`
- **Resources**: Read-only data like `finnberry://children/{id}/today`
- **Prompts**: AI analysis prompts like `analyze-sleep-patterns`

Tools that act on an existing record (`end-sleep`, `end-pumping`, `end-activity`, `log-medicine`, `get-medicine-records`) require the `childId` alongside the record id and only match a record of that child. A new tool must take a `childId` and filter on it, or the chat will not offer it.

## Database Schema

Key models in `packages/db/prisma/schema.prisma`:
- `User`, `Account`, `Session` - NextAuth.js models (`User` also carries `status` and `isAdmin`)
- `InstanceAdminClaim` - Single-row latch recording which user is the instance admin
- `Household`, `HouseholdMember`, `HouseholdInvite` - Multi-caregiver
- `Child` - Child profiles
- `SleepRecord`, `FeedingRecord`, `DiaperRecord` - Core tracking
- `ChatUsage` - Per-user, per-day chat usage for the spend limits
- `PumpingRecord`, `GrowthRecord`, `ActivityRecord`, `TemperatureRecord` - Extended tracking
- `Medicine`, `MedicineRecord` - Medicine tracking

## Git Workflow

**CRITICAL: Never commit directly to main. All work must happen on feature/fix branches.**

### Before Starting Any Work

1. Check current branch: `git branch --show-current`
2. If on `main`, create and switch to a new branch BEFORE making any changes:
   ```bash
   # For bug fixes
   git checkout -b fix/descriptive-name

   # For new features
   git checkout -b feature/descriptive-name

   # For refactoring
   git checkout -b refactor/descriptive-name

   # For documentation
   git checkout -b docs/descriptive-name
   ```

### After Completing Work

```bash
git push -u origin <branch-name>
gh pr create --fill
# Then merge via GitHub PR
```

### Branch Naming Conventions

- `fix/` - Bug fixes (e.g., `fix/timer-stop-bug`)
- `feature/` - New features (e.g., `feature/chat-interface`)
- `refactor/` - Code refactoring (e.g., `refactor/timeline-queries`)
- `docs/` - Documentation updates (e.g., `docs/update-readme`)

### Enforcement

If a user requests changes while on `main`:
1. **Do not make any code changes yet**
2. Create an appropriately named branch based on the request
3. Switch to that branch
4. Then proceed with the requested changes
5. Commit and push to the new branch
6. Create a PR for review

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
DATABASE_URL=            # Supabase PostgreSQL pooler connection
DIRECT_URL=              # Direct connection (for migrations)
AUTH_SECRET=             # Generate with: openssl rand -base64 32

# Optional
NEXTAUTH_URL=            # http://localhost:3000 for dev (auto-detected if not set)
ADMIN_EMAIL=             # Only this address can become the instance admin
GOOGLE_CLIENT_ID=        # For Google OAuth
GOOGLE_CLIENT_SECRET=
EMAIL_SERVER=            # SMTP connection string for magic links
EMAIL_FROM=              # Sender email address
ANTHROPIC_API_KEY=       # For AI Chat feature (sk-ant-...)
CHAT_ALLOWED_MODELS=     # Chat models offered, default haiku,sonnet
CHAT_DAILY_REQUEST_LIMIT=  # Per-user model calls per day, default 200
CHAT_DAILY_TOKEN_LIMIT=  # Per-user tokens per day, default 2000000
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

## Deploying to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbckenstler%2Ffinnberry&env=DATABASE_URL,DIRECT_URL,AUTH_SECRET,NEXTAUTH_URL&envDescription=Required%20environment%20variables%20for%20Finnberry&envLink=https%3A%2F%2Fgithub.com%2Fbckenstler%2Ffinnberry%23environment-variables&project-name=finnberry&repository-name=finnberry&root-directory=apps/web)

### Manual Setup

1. Import your repository in the Vercel dashboard
2. Set **Root Directory** to `apps/web`
3. Configure the required environment variables (see below)
4. Deploy

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL pooler connection string |
| `DIRECT_URL` | Supabase direct connection (for migrations) |
| `AUTH_SECRET` | Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your Vercel deployment URL (e.g., `https://finnberry.vercel.app`) |

### Optional Environment Variables

| Variable | Description |
|----------|-------------|
| `ADMIN_EMAIL` | The only address allowed to become the instance admin |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `EMAIL_SERVER` | SMTP connection string for magic links |
| `EMAIL_FROM` | Sender email address |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI chat feature |

### API Timeout Configuration

The AI chat feature uses streaming responses that may require longer timeouts. The timeout is configured in `apps/web/src/app/api/chat/route.ts` via the `maxDuration` export. Adjust based on your Vercel plan:

| Plan | Max Duration |
|------|--------------|
| Hobby (free) | 10 seconds |
| Pro | 60 seconds |
| Enterprise | 900 seconds |

The default is set to 60 seconds (Pro plan). For Hobby plan, change `maxDuration` to `10`.

## Known Limitations / TODOs

- No photo upload for children yet
- Growth charts with percentiles not implemented
- PWA support not added
- No data export (CSV/JSON) UI yet
- Email sending for magic links needs SMTP config

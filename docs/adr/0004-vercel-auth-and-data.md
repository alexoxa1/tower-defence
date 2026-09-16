# Vercel for hosting, Clerk for identity, Neon for records

Status: proposed. Not implemented. The Watch stays a client Vite SPA. A later public deploy may add optional accounts, prefs, Campaign records, and a Score board. Auth and the database must not own gold, lives, targeting, placement, or combat.

Citadel Watch is a Vite + React + TypeScript + Three.js arcade. There is no backend, no save/load, and no user identity in the repo today. `GameState` lives in memory. Mute lives on `AudioEngine` through `GameEngine`. HUD already reads `UiSnapshot` and calls `HudCommands`. Only `useGameEngine` imports `GameEngine`. That seam stays.

## Context

A public web build needs a host, preview URLs, and (later) a place to hang an account. Play must work signed out. Sign-in is a boundary for prefs and records, not a gate on the board.

The 3D view still must not own gold, lives, Waves, or targeting (`docs/adr/0001`). The new server must not own them either. `advanceWatch` remains the Watch tick. Rift Broken remains a client state transition.

What is worth storing later:

- **Account.** Clerk user id plus a display name. Optional.
- **Watch prefs.** Mute and default Speed. Applied at the start of a Watch through existing HUD commands. Not live `GameState`.
- **Campaign record.** Highest Wave cleared and best Score. A summary after a Watch, not the board.
- **Score board.** Submitted Score plus Wave. Honor system until a replay exists.

What must not go in the database: `GameState`, enemies, projectiles, particles, gold and lives during a Watch, placement legality, or anything `WorldRenderer` holds.

## Decision

**Host: Vercel.** Keep the Vite SPA. Git-push preview deploys. Static `dist` on the CDN. When an API exists, add Vercel Functions under `/api`. Do not migrate to Next.js. The canvas Watch is a client RAF loop. SSR does not help it.

**Auth: Clerk**, `@clerk/react` on the client and `@clerk/backend` on Functions. Optional sign-in. Clerk session cookies (`__session` JWT), same-origin `/api`, `credentials: "include"`. Verify every mutating request with `authenticateRequest`. Do not put tokens in `localStorage`. Do not use the legacy package name `@clerk/clerk-react`.

**Database: Neon Postgres** via the Vercel Marketplace, queried with Drizzle and `@neondatabase/serverless`. Lazy `getDb()`. Server-only `DATABASE_URL`. Rows key by Clerk `userId`. Clerk remains the identity store. Neon holds Watch prefs, Campaign records, and Score board rows.

**API: one Hono app in `/api`, Vite stays the framework.** Export `handle(app)` from `hono/vercel` in `api/index.ts`. Rewrite `/api/(.*)` to that function. Node runtime (Clerk + Neon). Fluid compute is Vercel’s default for Functions. Do not put a Hono entry at `src/index.ts` or `src/app.ts`. Vercel would treat the project as a Hono app and stop building the Vite SPA.

Ship in this order: static SPA first, then Clerk (still no database), then Neon + prefs/Campaign, then the Score board. Rate-limit Score writes later (Upstash Redis) if abuse shows up.

### Why not the other hosts and backends

**Next.js rewrite.** Would fight the existing Vite + Three.js loop. HUD and `GameEngine` seams are already correct. Do not pay an App Router migration to get `/app/api`.

**Nitro on Vite.** Vercel’s documented way to add Functions to a Vite app. It also pulls SSR and a different Vite pipeline. Four JSON routes do not need that.

**No server at all.** Fine for the current local Watch. A public Score board or cross-device Campaign record needs a trusted writer. The client must not be the authority for those rows.

**A second Node host (Fly, Railway, a Hono process).** Extra deploy, extra URL, CORS, and ops for a repo this size.

### Why not the other auth options

**Auth.js (NextAuth v5).** Better Auth now maintains it. Security-patch-only. Next-centric. Database sessions need a split edge/Node config. Wrong default for a Vite SPA.

**Better Auth.** Strong TypeScript fit with Drizzle and Hono. Own the user tables, no per-MAU bill. Rejected as the first auth because this repo has no backend yet. It adds session tables, OAuth apps, and email. Clerk ships identity without that. Revisit if MAU cost or data ownership becomes the constraint.

**Supabase Auth.** Pulls a second identity vendor next to (or instead of) Clerk, plus client RLS habits. The API is the boundary. Do not let the browser talk to Postgres.

**Hand-rolled JWT in `localStorage`.** XSS can steal it. No rotation, no password recovery. Clerk cookies exist so we do not do this.

Play stays ungated. `ClerkProvider` wraps `App` in `main.tsx` later. Header can host sign-in. `GameEngine` never imports Clerk.

### Why not the other databases

**Turso / libSQL.** Fast edge SQLite. Weaker SQL ecosystem for aggregates, and weaker Vercel preview branching than Neon. Not worth a second dialect.

**Convex.** Reactive backend of its own. Tempts putting Watch state on the server. Lock-in. A second runtime beside Vercel Functions.

**Supabase Postgres.** Fine database, bundled auth/realtime/storage we do not want. Direct-from-client RLS fights the API seam.

**Upstash Redis as the primary store.** Good for rate limits and short caches. Wrong shape for Campaign records and a Score board. Optional later, not the source of truth.

**`@vercel/postgres` and `@vercel/kv`.** Sunset. Use Neon and `@upstash/redis` if Redis appears.

Do not run an authoritative combat sim on the server. A cheat-proof Score board would need a replay or a seed plus full `advanceWatch` on the server. That is a different product. Until then, treat submitted Score as honor-system and cap obvious nonsense (negative Score, Wave far past Campaign).

## Consequences

**Environment.** Secrets live in the Vercel project, scoped per Production / Preview / Development. `vercel env pull .env.local` for local Functions. Never commit secrets. Vite only inlines `VITE_*`. Clerk Marketplace often injects `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. This app needs `VITE_CLERK_PUBLISHABLE_KEY` on the client and `CLERK_SECRET_KEY` plus a server publishable key for `authenticateRequest`. Set the Vite name explicitly. `DATABASE_URL` is server-only. Preview must not share the production database. Neon branching can wait until schema changes ride on pull requests.

Likely names (not created yet):

```
VITE_CLERK_PUBLISHABLE_KEY
CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
DATABASE_URL
```

**Ownership.** Client owns the Watch: `advanceWatch`, `GameState`, gold, lives, combat, placement. Server owns Account identity checks and durable rows. HUD still must not import `GameEngine`. Account UI uses a new hook beside `useGameEngine`. Prefs apply by calling `HudCommands` (`toggleMute`, `setSpeed`) after load. The 3D view stays a view.

**Routing.** No client router today, so a SPA fallback is optional for the first static deploy. The day `/api` exists, any `/(.*)` → `/index.html` rewrite must exclude `/api`, or Functions 404 into `index.html`. Put the `/api/(.*)` rewrite first.

**Cost.** Static CDN is cheap. Functions scale to zero. Neon scale-to-zero fits a hobby Watch. Clerk is free on a MAU tier, then billed. Score-board POSTs are the abuse surface. Add Upstash rate limits before advertising a public board.

**Local dev.** `bun run dev` stays the SPA. `vercel dev` (or a Vite proxy to `/api`) is required once Functions exist. Drizzle Kit does not load `.env.local` by itself. Use `dotenv` for migrations.

**Migration.** Linking a Vercel project is the first unblocker. There is no `.vercel/` directory and no `.env.example` today. Git remote exists. Claim Clerk before production. Temporary Clerk keys are not production-ready.

## Module map (later, not in tree)

Keep server code out of `src/game/`. Do not import `api/` from HUD components.

```
api/
  index.ts              Hono app. Default export handle(app)
  lib/auth.ts           requireUser(request)
  lib/db.ts             getDb()
  lib/schema.ts         Drizzle tables
  routes/prefs.ts
  routes/campaign.ts
  routes/leaderboard.ts
src/account/types.ts    DTOs shared as types only
src/hooks/useAccount.ts HUD identity. Must not import GameEngine
```

`vercel.json` sketch (when API exists):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

Signatures to implement against:

```ts
import type { GameSpeed } from "../game/constants";

export type AccountId = string;

export interface WatchPrefs {
  muted: boolean;
  speed: GameSpeed;
}

export interface CampaignRecord {
  accountId: AccountId;
  highestWaveCleared: number;
  bestScore: number;
  updatedAt: string;
}

export interface LeaderboardEntry {
  accountId: AccountId;
  displayName: string;
  score: number;
  wave: number;
  submittedAt: string;
}

export interface WatchApi {
  getPrefs(): Promise<WatchPrefs>;
  putPrefs(prefs: WatchPrefs): Promise<void>;
  getCampaign(): Promise<CampaignRecord | null>;
  putCampaign(
    record: Pick<CampaignRecord, "highestWaveCleared" | "bestScore">,
  ): Promise<void>;
  listLeaderboard(limit: number): Promise<LeaderboardEntry[]>;
  submitScore(input: { score: number; wave: number }): Promise<void>;
}

export function getDb(): unknown;
export function requireUser(
  request: Request,
): Promise<{ userId: AccountId }>;
```

`WatchApi` is called from `useAccount` / App, never from `advanceWatch`, `WorldRenderer`, or `src/components/*` importing `GameEngine`. Score submit happens after Rift Broken or a Campaign clear, from App, using snapshot Score. The server does not tick the Watch.

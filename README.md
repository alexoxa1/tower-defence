# Citadel Watch

Arcade tower defense. A Watch defends the citadel. Enemies walk the Road from In to Out. Place Hex Gun, Mortar Post, and Rail Sniper from the Armory. Vite, React, TypeScript, Three.js.

## Run

```bash
bun install
bun run dev
```

Production build:

```bash
bun run build
```

Product look is in `DESIGN.md`.

## Auth

The game is gated behind a Supabase email/password login. You must sign in before playing.

Copy `.env.example` to `.env.local` and set the browser credentials:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

If these are missing the app shows a configuration message instead of the game.

### Create a user

There is no self-serve sign up. Create users with the admin script, which needs the service role key (server-only, never commit it):

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
NEO_USER_EMAIL=player@example.com \
NEO_USER_PASSWORD=a-strong-password \
bun run create-user
```

These values can also live in `.env.local` (Bun loads it automatically). The script uses `auth.admin.createUser` with `email_confirm: true`, so the account can sign in immediately.

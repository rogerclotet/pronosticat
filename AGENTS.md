<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Testing the app yourself (no human in the loop)

The full recipe (Docker profiles, env vars, dev fixtures, manual QA flow) is in
`README.md` — read it first. This section only covers the parts that trip up an agent
running headless with no browser login and no `.env` checked in.

1. **Start Postgres + apply migrations** (idempotent, safe to rerun):

   ```bash
   docker compose -f compose.yaml -f compose.dev.yaml up -d
   ```

   This starts `db` and runs the one-shot `migrate` service (exits 0 when done — that's
   expected, not a failure). It does **not** start the app; `app`/`cron` are behind the
   `full` Docker profile and are for the containerized-app workflow, not this one.

2. **Env for the host-run dev server** — nothing is checked in, so:

   ```bash
   cp .env.example .env
   ```

   The defaults in `.env.example` already match the compose defaults
   (`postgresql://pronosticat:pronosticat@localhost:5432/pronosticat`), so no edits are
   needed for local testing. Delete `.env` when done if you don't want it lingering.

3. **Run the app**: `pnpm dev` (Next.js dev server on `:3000`).

4. **Log in without a browser.** Auth is Google OAuth + magic link (Better Auth). With no
   `RESEND_API_KEY` set, magic links aren't emailed — the sign-in URL is logged to the
   dev server's stdout instead (`src/lib/auth.ts`). Script it:

   ```bash
   curl -s -X POST http://localhost:3000/api/auth/sign-in/magic-link \
     -H "Content-Type: application/json" \
     -d '{"email":"agent-test@example.com","callbackURL":"/"}'
   # then grep the dev server log:
   grep "magic link for agent-test@example.com" /path/to/dev-server.log
   # GET that URL (in the browser tool, so the session cookie sticks) to be signed in.
   ```

5. **Creating a group and saving picks are Next.js Server Actions**, not REST endpoints —
   they're not practical to `curl` directly. Do that part through the `mcp__t3-code__preview_*`
   browser tools once signed in (see README's "Estructura de navegació" for where things
   live: Grup tab → crea un grup).

6. **Match/round data**: use the `/api/dev/fixtures` and `/api/dev/score` endpoints
   documented in README's "Proves manuals (dev fixtures)" section — those *are* plain
   REST and fine to `curl`. Requires `NODE_ENV=development`, which `pnpm dev` sets.

7. **Cleanup**: `docker compose -f compose.yaml -f compose.dev.yaml down` (add `-v` only
   if you intend to discard the Postgres volume — ask first if it might hold someone
   else's test data, since the volume is named per-project and can outlive a single
   session).

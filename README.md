# adsyscript

Next.js 16 + Supabase Auth/Postgres + Vercel. Each account owns its themes (workrooms), categories, weekly focus, scripts, and encrypted OpenAI credential.

## Local development

Use Node.js 22 or newer.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Fill `.env.local` locally or use the platform's secret settings. Do not commit secrets. No mock account, database, or API credential is built in. Without Supabase configuration, `/` shows setup status. `/login` previews the real authentication UI.

## Supabase

1. Create a Supabase project and run `supabase/migrations/202611090001_adsyscript.sql` in the SQL editor or through `supabase db push` for a linked project. The migration creates the tables, RLS policies, and transactional generation functions. The `btree_gist` extension prevents overlapping weekly focus periods.
2. Enable email/password sign-in. Keep email confirmation enabled and set a password minimum of 10 characters in Auth settings. Configure production SMTP for reliable confirmation/reset emails.
3. Set the Auth Site URL to your exact Vercel production origin. Add these redirect URLs: `https://YOUR_DOMAIN/auth/callback`, `https://YOUR_DOMAIN/auth/callback?next=/reset-password`, and `https://YOUR_DOMAIN/auth/confirm`. Add equivalent localhost URLs for local development only.
4. The default confirmation URL can use the PKCE callback. For token-hash templates, use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup` for signup and `type=recovery` for reset. The callback only permits `/studio` or `/reset-password`, preventing arbitrary redirects.
5. Create the first real account through `/login`. Users do not share a workspace and must connect their own OpenAI API key under Settings.

RLS applies to the normal authenticated client. Server-only administrative access is restricted to credential storage, daily generation, and retention. Foreign keys include owner and room IDs to prevent records from being attached to another account's category or theme. Browser roles cannot read encrypted credentials or call service-only generation functions.

## GitHub and Vercel

1. Push this repository to a **private GitHub repository**. Connect that repository to a new Vercel project using the Next.js preset; use the repository root as the project root.
2. Set these environment variables in Vercel (Production; use a separate Supabase project for previews):

| Name | Value | Visibility |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon project key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side service-role key | Secret |
| `APP_ENCRYPTION_KEY` | `openssl rand -base64 32` | Secret |
| `CRON_SECRET` | A separate `openssl rand -hex 32` value | Secret |
| `APP_URL` | Exact production HTTPS origin, no path | Server |
| `OPENAI_MODEL` | `gpt-4.1-mini` by default | Server |
| `AUTOMATION_ENABLED` | `false` until verification completes, then `true` | Server |

Set `NEXT_PUBLIC_*` variables before building; Next.js embeds them in the browser bundle. Never use the service-role key as a public key. Keep `APP_ENCRYPTION_KEY` stable: changing it requires re-saving users' OpenAI credentials. No OpenAI secret is required in Vercel: each account saves its own key through the authenticated app.

3. Deploy, register/sign in, create a theme, create a category, and schedule it for this week. Save an OpenAI credential under Settings and test manual generation. Check that 5 scripts persist and a second run adds none.
4. Vercel Cron in `vercel.json` invokes `/api/cron` daily at `00:00 UTC` (07:00 WIB / Asia/Jakarta). Vercel supplies `Authorization: Bearer CRON_SECRET`. Cron must also be enabled/supported by the Vercel project/plan. Hobby scheduling may run within its permitted daily time window rather than at the exact minute. No hourly or per-user time setting is advertised.
5. Verify `/api/cron` with its authorization header from a secure client, read the returned results and persisted jobs, then enable `AUTOMATION_ENABLED=true` and redeploy. Enable the desired workrooms in each account. Do not put a secret in the URL, browser, repository, or CI logs. If Vercel Deployment Protection blocks internal calls, configure its automation bypass secret as `VERCEL_AUTOMATION_BYPASS_SECRET`.

Each workroom runs in a separate authenticated Vercel Function. PostgreSQL leases and a commit transaction ensure concurrent/manual retries cannot exceed 5 scripts per theme/day. Failed jobs can be retried manually. Cron and workers require the server secret. Plan duration/concurrency and OpenAI rate limits still apply; inspect failed jobs/logs when scaling to many accounts.

## Archive retention

User-facing reads hide scripts older than 30 days. The daily Cron removes expired scripts and old generation logs from Postgres. Configure database backup retention separately; application deletion does not control Supabase backups. Users can download `.txt` scripts before expiry.

## Import from the previous Sites deployment

Keep the existing site live until the new deployment and import are verified. Export its authenticated `/api/state` to a private local JSON file. Do not commit it. Create the target Supabase account, then run with the destination project environment securely configured:

```sh
npm run import:legacy -- --source /absolute/path/export.json --owner DESTINATION_USER_UUID
```

The importer validates the destination user, maps IDs deterministically, assigns old weekly topics to categories if needed, and preserves script timestamps. Upserts are retryable and do not delete source records. Imported workrooms have automatic generation disabled until schedules and keys are reviewed. Only scripts still within the 30-day retention window are imported. The import does not transfer ChatGPT sign-in sessions or API secrets. Verify source/target counts and sample bodies before directing users to the new URL.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

Tests execute the actual SQL migration on an embedded PostgreSQL engine (PGlite), including row-level security, cross-account foreign keys, weekly overlap rejection, atomic category creation, generation leases/quotas, and retention. Separate tests cover encryption tampering, Cron authorization, timezone boundaries, and input/AI validation. Production Supabase auth/email and Vercel Cron still require deployment verification with real connected projects.

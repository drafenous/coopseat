# Supabase setup (CoopSeat)

One-time steps for a new Supabase project. Everything after step 2 is scripted.

1. **Create the project** (region `sa-east-1`). In *Database > Extensions* enable `pg_cron`.
2. **Database roles.** In the SQL editor run `supabase/sql/000_prisma_role.sql` after replacing
   `CHANGE_ME` with a strong password. Use the **session pooler** (port 5432) URLs in `.env.local`:
   `DATABASE_URL` with user `prisma.<ref>` (BFF runtime), `DIRECT_URL` and `SQL_ADMIN_URL` with user
   `postgres.<ref>` (migrations: only `postgres` may add the FK and trigger on `auth.users`).
   The Prisma 8 Supabase runtime binds roles per session, so the 6543 transaction pooler is not supported.
3. **Schema.**
   ```bash
   npx prisma contract emit
   npx prisma db migrate          # tables, indexes, FKs, RLS and policies
   npm run db:sql                 # trigger on auth.users, access token hook, grants, pg_cron jobs
   ```
   Later contract changes: `npx prisma migration plan --from <last-hash> --name <slug>`, review, then `db migrate`.
4. **Auth settings.** Create a personal access token (Account > Access tokens) and run
   ```bash
   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... npm run supabase:configure
   ```
   It sets: email confirmation on, secure email change, manual identity linking, password policy
   (8+ chars, letters and digits, leaked-password check), TOTP MFA, the Custom Access Token Hook
   (`public.custom_access_token_hook`), redirect allow list (`https://coopseat.com/**`),
   PT-BR email templates from `supabase/templates/`, and any OAuth provider / SMTP whose env vars are present:

   | Provider | Env vars | Callback URL to register at the provider |
   | --- | --- | --- |
   | Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `https://<ref>.supabase.co/auth/v1/callback` |
   | Facebook | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` | same |
   | X (OAuth 2.0) | `X_CLIENT_ID`, `X_CLIENT_SECRET` | same |
   | Discord | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | same |
   | SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | sender `no-reply@coopseat.com` (SPF/DKIM on the domain) |

5. **Captcha.** Create a Turnstile widget for `coopseat.com` and `localhost`; set
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` in Vercel. The BFF verifies it; Supabase
   captcha stays off because GoTrue is only reached through the BFF (the publishable key is server-only).
6. **Vercel env.** Copy every key from `.env.example` (except `SUPABASE_ACCESS_TOKEN`, `SQL_ADMIN_URL`)
   into Production and Preview. GitHub Actions needs the `DIRECT_URL` and `SQL_ADMIN_URL` secrets in the
   `production` environment for the migrate job.
7. **Verify the database** (dev project only): `npm run db:test`.

## Manual end-to-end check (mock KYC)

With `KYC_PROVIDER=mock` on a dev/preview deployment:

1. `/cadastro` with email and password → confirmation email → link opens `/auth/confirmado`.
2. `/entrar` → `/conta` asks for a nickname if needed; a taken nickname (any casing) is refused.
3. *Verificar idade* → `/verificacao/mock` → choose **Aprovado (18+)** → `/conta` shows age verified and
   chat, voice and host unlocked. Repeat with a second account and the same document number: it must be rejected.
4. Enable TOTP in `/conta`, sign out, sign in again: the 2FA step must appear.
5. Link and unlink Google/Discord in `/conta`; unlinking the last login method must be refused.
6. Desktop (`COOPSEAT_BFF_URL=<preview url> npm run dev` in `coopseat/`): *Entrar com Google* opens the
   browser and returns via `coopseat://auth/callback`; email login, 2FA and *Minha conta* work in the app.

## Why X users may have no email

X does not always return an email. Those accounts get `needsEmail: true` from `/api/me`; the web and
desktop ask for an email (`PATCH /api/me { email }`), which Supabase confirms before it is attached.

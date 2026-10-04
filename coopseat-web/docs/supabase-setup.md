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
   bilingual (English + pt-BR) email templates and security notifications (password, e-mail, 2FA and sign-in
   method changes) from `supabase/templates/emails.mjs`, Google sign-in and SMTP when their env vars
   are present. Google is the only OAuth provider; the script turns the others off.

   Every e-mail shares one layout in `emails.mjs`. Run `npm run email:preview` to render them all with sample data
   into `.email-preview/` and open `index.html` in a browser; `tests/email-templates.test.ts` checks that each
   template only uses the variables GoTrue gives it and that every link is accepted by `/api/auth/confirm`.

   | Service | Env vars | Notes |
   | --- | --- | --- |
   | Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | see **Google OAuth client** below |
   | E-mail (Resend) | `RESEND_API_KEY` | sender `no-reply@coopseat.com` via `smtp.resend.com:465` |
   | Other SMTP (overrides Resend) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | same sender |

   **Google OAuth client.** In Google Cloud Console (APIs & Services):
   1. *OAuth consent screen*: user type *External*, app name `CoopSeat`, support e-mail, authorized domain
      `coopseat.com`, scopes `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`. Publish the app
      (while in *Testing* only the listed test users can sign in).
   2. *Credentials > Create credentials > OAuth client ID*, type *Web application*:
      - Authorized JavaScript origins: `https://coopseat.com`, `http://localhost:3000`
      - Authorized redirect URIs: `https://coopseat.com/api/auth/callback`, `http://localhost:3000/api/auth/callback`
   3. Put the client id and secret in `.env.local` and in Vercel as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`,
      then run `npm run supabase:configure`.

   The BFF runs the Google OAuth flow itself (so the consent screen shows `coopseat.com`, not the Supabase
   domain): it exchanges the code with Google and signs in to Supabase Auth with the `id_token`
   (`grant_type=id_token`, `link_identity` when linking from `/account`). Supabase only needs the same client id to
   accept the token. Google requires exact redirect URIs, so Vercel preview URLs cannot use Google sign-in unless
   they are added to the list.

   **Resend domain.** In Resend > Domains add `coopseat.com`, create the SPF (`send` MX + TXT) and DKIM
   (`resend._domainkey`) records it lists at the DNS provider, and wait for *Verified*. Add a DMARC record
   (`_dmarc` TXT `v=DMARC1; p=none;`) if the domain has none. Then create an API key with *Sending access*
   for that domain and set it as `RESEND_API_KEY` locally and in Vercel. The BFF uses the same key for its
   own e-mails (`sendEmail` in `src/server/email.ts`).

5. **Captcha.** Create a Turnstile widget for `coopseat.com` and `localhost`; set
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` in Vercel. The BFF verifies it; Supabase
   captcha stays off because GoTrue is only reached through the BFF (the publishable key is server-only).
6. **Vercel env.** Copy every key from `.env.example` (except `SUPABASE_ACCESS_TOKEN`, `SQL_ADMIN_URL`)
   into Production and Preview. GitHub Actions needs the `DIRECT_URL` and `SQL_ADMIN_URL` secrets in the
   `production` environment for the migrate job.
7. **Verify the database** (dev project only): `npm run db:test`.

## Manual end-to-end check (mock KYC)

With `KYC_PROVIDER=mock` on a dev/preview deployment:

1. `/signup` with email and password → confirmation email → link opens `/auth/confirmed`.
2. `/login` → `/account` asks for a nickname if needed; a taken nickname (any casing) is refused.
3. *Verify my age* → `/verification/mock` → choose **Approve (over 18)** → `/account` shows age verified and
   chat and host unlocked. Repeat with a second account and the same document number: it must be rejected.
4. Enable TOTP in `/account`, sign out, sign in again: the 2FA step must appear. A "two-step verification added"
   e-mail must arrive.
5. Link and unlink Google in `/account`; unlinking the last login method must be refused. Each change sends a
   security e-mail.
6. Desktop (`COOPSEAT_BFF_URL=<preview url> npm run dev` in `coopseat/`): *Continue with Google* opens the
   browser and returns via `coopseat://auth/callback`; email login, 2FA and *My account* work in the app.
7. Switch the language (footer on the site, the language icon in the app header) and repeat a step: pages, API errors
   and the app follow the choice. The old Portuguese paths (`/entrar`, `/conta`, ...) redirect permanently.

## Languages

The site, the API and `@coopseat/ui` speak English (default) and Brazilian Portuguese. The site reads the
`locale` cookie, then `Accept-Language`; the desktop app stores its choice locally and sends it as
`Accept-Language`. Dictionaries live in `src/i18n/dictionaries/` and `packages/ui/src/i18n/`; a test keeps
the pt-BR keys in sync with `en`. Supabase emails are bilingual (English first) because GoTrue renders one
template for everyone.

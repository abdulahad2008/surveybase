# SurveyBank.uz

An open web archive of anonymized survey results about Uzbekistan and Central
Asia. Researchers upload the CSV export from their Google Forms surveys; the
app strips anything that looks like personal data, renders interactive tables
and charts, and lets anyone browse, filter, and re-download the data.

Planning docs live in [`docs/`](./docs).

## Stack

Next.js (App Router) + TypeScript + Tailwind · Supabase (Postgres, Auth,
Storage) · PapaParse · SheetJS (xlsx) · TanStack Table · Recharts ·
next-intl (`uz` / `ru` / `en`) · deployed on Vercel, DNS on Cloudflare.

## Local setup

1. `npm install`
2. Create a Supabase project (free tier) at [supabase.com](https://supabase.com).
3. Copy `.env.example` to `.env.local` and fill in the values from
   **Project Settings → API** in the Supabase dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (not used until Phase 4's seed script —
     keep it out of the browser bundle)
4. Apply the schema: open the Supabase SQL editor and run
   `supabase/migrations/0001_init.sql`. This creates all tables, the
   profile-on-signup trigger, and Row-Level Security policies.
5. Enable auth providers in **Authentication → Providers**:
   - **Email** is on by default.
   - **Google**: create an OAuth client in Google Cloud Console, add
     `https://<your-project-ref>.supabase.co/auth/v1/callback` as an
     authorized redirect URI, then paste the client ID/secret into
     Supabase's Google provider settings.
6. `npm run dev` and open [http://localhost:3000](http://localhost:3000).

## Domain wiring (surveybank.uz)

The domain is registered at **ahost.uz**; DNS and TLS are handled by
Cloudflare in front of Vercel:

1. In ahost.uz's domain management, change the nameservers to the two
   Cloudflare nameservers shown when you add the site in Cloudflare.
2. In Vercel, add `surveybank.uz` (and `www.surveybank.uz` if desired) as a
   custom domain on this project. Vercel will show the DNS records to add.
3. In Cloudflare DNS, add those records (typically an `A`/`CNAME` per
   Vercel's instructions) with the proxy status set as Vercel recommends.
4. In Cloudflare **SSL/TLS**, set the encryption mode to **Full (strict)**.
5. Wait for DNS propagation, then confirm `https://surveybank.uz` resolves
   to the Vercel deployment.

## Deploying

Push to the connected Git repo, or run `vercel --prod`. Set the same three
env vars from `.env.local` in the Vercel project's Environment Variables
settings before the first deploy.

## Project structure

- `src/app/[locale]/` — localized routes (`uz`/`ru`/`en`), including auth
  pages under `(auth)/`.
- `src/app/auth/callback/` — OAuth callback route (outside the locale
  segment; the redirect URI must be a fixed URL).
- `src/lib/supabase/` — browser, server, and middleware Supabase clients
  (`@supabase/ssr`).
- `src/i18n/` — next-intl routing/navigation/request config.
- `messages/{en,ru,uz}.json` — UI strings. `ru`/`uz` currently mirror `en`;
  translation happens in Phase 3.
- `supabase/migrations/` — SQL schema + RLS, applied manually via the
  Supabase SQL editor (see above).
- `docs/` — the original planning documents.

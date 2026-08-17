# SurveyBase.uz

An open web archive of anonymized survey results about Uzbekistan and Central
Asia. Researchers upload the CSV export from their Google Forms surveys; the
app strips anything that looks like personal data, renders interactive tables
and charts, and lets anyone browse, filter, and re-download the data.

Live at [surveybase.uz](https://surveybase.uz). Planning docs live in
[`docs/`](./docs) — they predate the rename and still say "SurveyBank".

## Stack

Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4 · Supabase
(Postgres, Auth, Storage) · PapaParse · SheetJS (xlsx) · TanStack Table ·
Recharts · next-intl (`uz` / `ru` / `en`) · self-hosted Inter and Bricolage
Grotesque via `@fontsource-variable` · deployed on Vercel, DNS on Cloudflare.

## Local setup

1. `npm install`
2. Create a Supabase project (free tier) at [supabase.com](https://supabase.com).
3. Copy `.env.example` to `.env.local` and fill in the values from
   **Project Settings → API** in the Supabase dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — used by the seed script and
     `src/lib/supabase/admin.ts`; keep it out of the browser bundle)
4. Apply the schema: open the Supabase SQL editor and run the files in
   `supabase/migrations/` **in order**, `0001` through `0004`. Together they
   create the tables, the profile-on-signup trigger, Row-Level Security
   policies, the `dataset-files` storage bucket, full-text search, and
   link-only dataset support.
5. Enable auth providers in **Authentication → Providers**:
   - **Email** is on by default.
   - **Google**: create an OAuth client in Google Cloud Console, add
     `https://<your-project-ref>.supabase.co/auth/v1/callback` as an
     authorized redirect URI, then paste the client ID/secret into
     Supabase's Google provider settings.
6. `npm run dev` and open [http://localhost:3000](http://localhost:3000).

Once running, `GET /api/health` reports whether the env vars, tables, storage
bucket, and RPC function are all wired up correctly.

## Seeding

`seed/seed-manifest.json` catalogues the launch datasets — `hosted` records get
downloaded, run through the PII pipeline, and stored; `link_only` records are
catalogue metadata pointing at an external source. Verify each license on its
source page before importing, then:

```
npm run seed
```

## Domain wiring (surveybase.uz)

The domain is registered at **ahost.uz**; DNS and TLS are handled by
Cloudflare in front of Vercel:

1. In ahost.uz's domain management, change the nameservers to the two
   Cloudflare nameservers shown when you add the site in Cloudflare.
2. In Vercel, add `surveybase.uz` (and `www.surveybase.uz` if desired) as a
   custom domain on this project. Vercel will show the DNS records to add.
3. In Cloudflare DNS, add those records (typically an `A`/`CNAME` per
   Vercel's instructions) with the proxy status set as Vercel recommends.
4. In Cloudflare **SSL/TLS**, set the encryption mode to **Full (strict)**.
5. Wait for DNS propagation, then confirm `https://surveybase.uz` resolves
   to the Vercel deployment.

## Deploying

Push to the connected Git repo, or run `vercel --prod`. Set the same three
env vars from `.env.local` in the Vercel project's Environment Variables
settings before the first deploy.

**Prefer pushing to git.** Deploying with `vercel --prod` from a local folder
uploads whatever is on disk, committed or not — that is how production ended
up three weeks ahead of `main` between 2026-07-23 and 2026-08-17.

## Project structure

- `src/app/[locale]/` — localized routes (`uz`/`ru`/`en`), including auth
  pages under `(auth)/`.
- `src/app/api/health/` — deployment health check.
- `src/app/api/datasets/[slug]/download/[format]/` — CSV/XLSX/JSON downloads.
- `src/app/auth/callback/` — OAuth callback route (outside the locale
  segment; the redirect URI must be a fixed URL).
- `src/components/` — shared UI: header, footer, logo, icons, mobile nav,
  locale switcher, copy button.
- `src/lib/pii.ts` — the single source of truth for which columns get
  stripped. Runs server-side as the final word before anything is persisted.
- `src/lib/csv-analysis.ts` — column type inference and summary statistics.
- `src/lib/supabase/` — browser, server, admin, and middleware Supabase
  clients (`@supabase/ssr`).
- `src/proxy.ts` — Next.js 16's replacement for `middleware.ts`; handles i18n
  routing and Supabase session refresh.
- `src/i18n/` — next-intl routing/navigation/request config.
- `messages/{en,ru,uz}.json` — UI strings, fully translated.
- `supabase/migrations/` — SQL schema + RLS, applied manually via the
  Supabase SQL editor (see above).
- `docs/` — the original planning documents.

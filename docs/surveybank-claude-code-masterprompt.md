# SurveyBank.uz — Master Prompt for Claude Code (Sonnet 5)

> **How to use this:** Paste everything below the line into Claude Code at the root of an empty repo. Build **phase by phase** — do not skip ahead. Commit at the end of each phase. Stop and ask me before any destructive action or before adding anything not listed in scope.

---

You are building **SurveyBank.uz**, an open web archive of anonymized survey results about Uzbekistan and Central Asia. Researchers upload the CSV export from their Google Forms surveys; the app parses it, renders interactive tables and charts, and lets anyone browse, filter, and re-download the data in multiple formats. Ship a working MVP fast. Favor a working vertical slice over breadth.

## Golden rules (do not violate)

1. **Anonymized data only.** The app must never store personal/identifiable data. On every CSV upload, detect and strip columns that look like email, phone, full name, address, or ID, plus the Google Forms `Timestamp` column. Require the depositor to confirm "this data is anonymized" before publishing. This is a legal requirement, not a preference.
2. **Stay in scope.** Build only what's in the phases below. Do NOT add: live survey creation, payments, DOIs, ORCID login, or a public API. If you think something is needed, ask me first.
3. **Free tier only.** Everything must run on Supabase free tier + Vercel free tier. No paid services.
4. **Build in phases, commit per phase, keep it deployable.** After each phase the app must build and deploy to Vercel.
5. **Ask before destructive or irreversible actions** (dropping tables, deleting data, force-pushing).

## Tech stack (pinned — do not substitute)

- Next.js (latest stable, App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres, Auth with email + Google, Storage) via `@supabase/supabase-js` and `@supabase/ssr`
- CSV parsing: `papaparse`
- XLSX export: `xlsx` (SheetJS)
- Tables: `@tanstack/react-table`
- Charts: `recharts`
- i18n: `next-intl` (locales: `uz`, `ru`, `en`; default `uz`)
- Deploy target: **Vercel** (do not target Cloudflare Workers — the app runs on Vercel)
- DNS: **Cloudflare**, sitting in front of Vercel. Domain `surveybank.uz` is registered at ahost.uz with nameservers delegated to Cloudflare; the app is added as a custom domain in Vercel with Cloudflare SSL set to Full (strict). This is infra config, not code — just document the exact steps in the README.

## Conventions

- TypeScript strict mode. Prefer React Server Components; use client components only where interactivity requires it (charts, tables, forms).
- Keep all secrets in `.env.local`; never commit them. Provide a `.env.example`.
- Use Supabase Row-Level Security on every table. Server-side mutations via server actions or route handlers.
- Clean, accessible, responsive UI. Match the Pencil designs I provide (home/search, dataset page, deposit flow, auth). If a design is missing, build a clean, minimal version and note it.
- Write a short `README.md` with setup + env vars.

## Data model (create as Supabase migrations / SQL)

```sql
-- profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  affiliation text,
  role text not null default 'user' check (role in ('user','depositor','moderator','admin')),
  created_at timestamptz not null default now()
);

create table datasets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  abstract text,
  country text not null default 'Uzbekistan',
  region text,
  topics text[] not null default '{}',
  collection_method text,
  sample_size int,
  target_population text,
  fieldwork_start date,
  fieldwork_end date,
  languages text[] not null default '{}',
  license text not null default 'CC-BY',
  status text not null default 'pending' check (status in ('draft','pending','published','rejected')),
  depositor_id uuid references profiles(id),
  download_count int not null default 0,
  created_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  storage_path text not null,
  format text not null check (format in ('csv','xlsx','json','pdf')),
  is_codebook boolean not null default false,
  size_bytes bigint,
  checksum text
);

create table survey_columns (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  question_text text not null,
  column_type text not null check (column_type in ('categorical','numeric','date','text')),
  summary_json jsonb
);

create table publications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  authors text,
  year int,
  doi_or_url text
);

create table dataset_publications (
  dataset_id uuid references datasets(id) on delete cascade,
  publication_id uuid references publications(id) on delete cascade,
  primary key (dataset_id, publication_id)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (dataset_id, user_id)
);

create table download_log (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references datasets(id) on delete cascade,
  user_id uuid references profiles(id),
  format text not null,
  created_at timestamptz not null default now()
);
```
RLS: published datasets are world-readable; only the depositor (or moderator/admin) can edit their own drafts/pending; only moderators/admins can change `status` to `published`.

---

## PHASE 0 — Foundations
- Scaffold Next.js + TypeScript + Tailwind. Install all stack deps above.
- Wire Supabase (client + server helpers via `@supabase/ssr`). Add `.env.example`.
- Apply the SQL migrations above; enable email + Google auth.
- Auth pages: sign up, log in, log out; auto-create a `profiles` row on signup.
- Set up `next-intl` with `uz`/`ru`/`en` and a locale switcher (message files can start mostly in English; wire the plumbing now).
- Deploy to Vercel; confirm it builds. In the README, document the domain wiring: ahost.uz nameservers → Cloudflare, Vercel DNS records added in Cloudflare, Cloudflare SSL = Full (strict), `surveybank.uz` added as a custom domain in Vercel.
- **Exit criteria:** deployed on Vercel, a user can sign up / log in, all tables exist with RLS.

## PHASE 1 — Vertical slice: deposit → view → download (highest priority)
- **Deposit form** (`/deposit`, auth required): metadata fields (title, abstract, topics[], country, region, collection_method, sample_size, target_population, fieldwork_start/end, languages[], license default CC-BY, optional linked publication, optional questionnaire text) with validation. Creates a `datasets` row with status `pending`.
- **CSV upload + ingestion:**
  - Parse the uploaded CSV with PapaParse.
  - **PII guard:** scan headers and sample values; flag columns matching email / phone / name / address / id patterns, and the Google Forms `Timestamp` column. Show the depositor which columns will be removed; require them to confirm removal and tick "this data is anonymized." Do not store dropped columns.
  - Infer each remaining column's type: `categorical` / `numeric` / `date` / `text`.
  - Compute `summary_json` per column (categorical: value counts; numeric: min/max/mean/median + histogram bins; date: range; text: top terms + response count). Store cleaned CSV in Supabase Storage and one `survey_columns` row per column.
- **Dataset page** (`/datasets/[slug]`): metadata block, "How to cite" citation block, per-question charts (Recharts: bar/pie for categorical, histogram for numeric, top-terms list for text), a paginated/sortable data table (TanStack Table).
- **Downloads:** re-export the cleaned dataset as CSV, XLSX (SheetJS), and JSON; each download inserts a `download_log` row and increments `download_count`.
- **Exit criteria:** a logged-in user uploads a real Google Forms CSV, PII columns are stripped, and anyone can view the charts/table and download it as CSV/XLSX/JSON.

## PHASE 2 — Discovery
- **Archive listing** (`/` and `/datasets`): grid/list of published datasets, newest + most-downloaded.
- **Search + faceted filters:** Postgres full-text search over title/abstract/topics; filters for topic, year (fieldwork), sample-size range, collection_method, language.
- **Publications:** display linked papers on the dataset page; allow the depositor to attach a publication (title/authors/year/DOI-or-URL).
- **Reviews:** logged-in users can leave one rating (1–5) + comment per dataset; show average rating.
- **Exit criteria:** a visitor can find a relevant dataset via search/filters without knowing its title.

## PHASE 3 — Trust, language, launch-readiness
- Finish `uz`/`ru`/`en` translations for all UI strings.
- **Moderation view** (`/moderate`, moderator/admin only): list `pending` datasets, approve → `published` or reject → `rejected`.
- Verify end-to-end that PII never reaches a published dataset.
- Responsive + accessibility polish; empty states; error handling on upload.
- **Exit criteria:** deposit → moderate → publish → download loop is solid; UI works in three languages on mobile and desktop.

## PHASE 4 — Seed & handoff
- Build a small admin/seed script to import externally-sourced open datasets (I will provide CSVs + metadata for ~15–30 datasets from World Bank Microdata, data.egov.uz, Central Asia Barometer, Life in Kyrgyzstan). Each seeded dataset links back to its original source and respects its license.
- Final deploy; confirm the seeded archive renders.
- **Exit criteria:** the live site at surveybank.uz shows a populated, browsable archive.

---

## Definition of done (MVP)
A visitor lands on surveybank.uz, sees a populated archive, searches/filters to a dataset, views its charts + table, and downloads it as CSV/XLSX/JSON. A registered user uploads a Google Forms CSV; PII is stripped; after moderation it appears in the archive with a citation block. All on free tiers, all anonymized, UI in uz/ru/en.

## Start now
Begin with **Phase 0**. Before writing code, briefly list the files you'll create and the env vars I need to set, then proceed. Commit at the end of each phase with a clear message. If anything is ambiguous or tempts you outside scope, ask me first.

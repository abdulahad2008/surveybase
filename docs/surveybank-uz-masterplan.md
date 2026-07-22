# SurveyBank.uz — Masterplan

*An open archive of survey data and results from Uzbekistan and Central Asia. Solo/AI-built (Claude Code with Sonnet 5 + Codex), Pencil for design, free-tier hosting. Optimized to ship fast.*

---

## 1. The one-line vision

**One place to find, read, and reuse survey data about Uzbekistan** — so researchers stop re-running the same surveys and wasting responses. Depositors get citation credit; everyone gets clean, browsable, re-exportable results.

## 2. Positioning (who you are, who you're not)

- **You ARE:** a curated *archive of completed survey results* — upload once, browsable and reusable by anyone, linked to the papers that used it.
- **You are NOT:** a live-survey distribution tool. OpenSurveyX already does the "earn respondents" karma game; that's a different, more crowded product. Don't copy it.
- **You are NOT** rebuilding Harvard Dataverse's storage tech. Your edge is regional focus, an Uzbek/Russian/English interface, paper linkage, and turning raw Google Forms exports into readable charts and tables.

## 3. The hard constraint that shapes everything: **anonymized data only**

[Certain] Uzbekistan's data law regulates *personal (identifiable)* data. The simplest safe path for a free-tier, globally hosted MVP is to **never store personal data at all.**

Rules baked into the product:
- Accept only **anonymized / aggregated** survey results. No names, emails, phone numbers, exact addresses, or ID numbers.
- On every CSV upload, **auto-detect and strip** email/phone/name-like columns (plus the Google Forms `Timestamp` and any "email address" column), and make the depositor confirm the data is anonymized before publish.
- No feature that stores "who took the survey." Trust comes from sample size, depositor identity, methodology, and linked papers — not respondent lists.
- The `.uz` domain points to global free hosting; that's fine because no personal data is stored.
- **Before you ever accept personal/identifiable data, talk to an Uzbek IT lawyer and move to Uzbekistan-based hosting.** Not needed for the anonymized MVP.

*(This document is planning guidance, not legal advice.)*

## 4. Scope

**In scope for v1 (ship this):**
- Register / log in (email + Google).
- Deposit a dataset: upload a CSV (from Google Forms) + fill a metadata form.
- Automatic parsing → data table + per-question charts + summary stats.
- Re-export in CSV / XLSX / JSON.
- Browse & search/filter the archive (topic, year, sample size, method, language).
- Dataset page with metadata, files, questionnaire, linked paper(s), and a **"How to cite"** block.
- Ratings + feedback on a dataset.
- Uzbek / Russian / English interface.

**Explicitly OUT for v1 (later):**
- Running/hosting live surveys.
- Any payment / "pay per vote."
- DOIs via DataCite (needs an institution — phase 2).
- Storing personal/identifiable data.
- API for programmatic access.
- ORCID login (add in phase 2; Google login is enough for v1).

## 5. Core user flows

**Visitor → finds data**
1. Homepage → featured/seeded datasets + search bar.
2. Filters by country, topic, year, sample size, method, language.
3. Opens a dataset → reads metadata, views auto-charts + table, checks linked paper, downloads in preferred format.

**Depositor → shares results**
1. Registers (email or Google login).
2. In Google Forms: **Responses → ⋮ → Download responses (.csv)** (or Sheet → Download → CSV).
3. On SurveyBank: **Deposit** → upload CSV → platform previews parsed columns and flags likely personal-data columns for removal.
4. Fills metadata: title, abstract, topic tags, country/region, target population, sample size, collection method, fieldwork dates, language, license (default **CC-BY**), optional linked paper, optional questionnaire text.
5. Confirms "data is anonymized" → submits → light moderation → live, with an auto-generated citation block.

## 6. Google Forms → SurveyBank ingestion (the core value-add)

On CSV upload the app:
1. Parses the CSV (PapaParse) and **auto-detects column types**: categorical (multiple-choice), numeric, date, free-text.
2. **PII guard:** flags columns that look like email/phone/name and the Forms `Timestamp`; depositor drops or confirms.
3. Renders automatically:
   - **Data table** — sortable, filterable, paginated.
   - **Per-question charts** — bar/pie for categorical, histogram for numeric, top-terms list for free-text.
   - **Summary stats** — response count, top answer, distribution per question.
4. Stores the cleaned dataset; offers **download as CSV / XLSX / JSON**.

This "raw Forms export → interactive charts + clean re-exports" is the reason to use SurveyBank instead of a shared Google Sheet.

## 7. Data model (Supabase / Postgres)

- **profiles** — id, name, affiliation, role (user/depositor/moderator/admin), created_at.
- **datasets** — id, title, slug, abstract, country, region, topics (text[]), collection_method, sample_size, target_population, fieldwork_start, fieldwork_end, languages (text[]), license (default `CC-BY`), status (draft/pending/published), depositor_id, download_count, created_at.
- **files** — id, dataset_id, storage_path, format (csv/xlsx/json/pdf), is_codebook (bool), size_bytes, checksum.
- **survey_columns** — id, dataset_id, question_text, column_type (categorical/numeric/date/text), summary_json (precomputed chart/stat data).
- **publications** — id, title, authors, year, doi_or_url. Join table **dataset_publications** (dataset_id, publication_id).
- **reviews** — id, dataset_id, user_id, rating (1–5), comment, created_at.
- **download_log** — id, dataset_id, user_id (nullable), format, created_at.

Precompute `summary_json` at upload time so dataset pages render charts instantly without reprocessing the CSV on every visit.

## 8. Tech stack (AI-agent-friendly + free tier)

Chosen because Claude Code (Sonnet 5) and Codex are fluent in it and every piece has a free tier:

- **Framework:** Next.js (App Router) + TypeScript + Tailwind CSS. One codebase for frontend + API routes.
- **Backend / DB / Auth / Storage:** **Supabase** free tier — Postgres, row-level security, auth (email + Google), file storage for CSVs.
- **Hosting:** **Vercel** free tier for the Next.js app (chosen over Cloudflare Workers because it has full Next.js support and more memory headroom for server-side CSV parsing).
- **DNS:** **Cloudflare** (free) in front of Vercel. Domain is registered at **ahost.uz**; delegate its nameservers to Cloudflare, manage DNS there, and point the records at Vercel (SSL mode: **Full (strict)**). Cloudflare handles DNS/CDN/DDoS; Vercel runs the app.
- **CSV parsing:** PapaParse. **Spreadsheet export:** SheetJS (xlsx).
- **Tables:** TanStack Table. **Charts:** Recharts.
- **Search:** Postgres full-text search + faceted filters (no separate search service for v1).
- **i18n:** `next-intl` with uz / ru / en message files.
- **Design:** build the key screens in **Pencil**, export, and hand them to Claude Code / Codex to implement.

Everything above stays within free tiers at launch volume.

## 9. Phased roadmap (design-first, ship the vertical slice early)

**Phase 0 — Design & foundations**
- Design **four screens** in Pencil, low-fidelity: (1) home/search, (2) dataset page, (3) deposit flow, (4) auth. Timebox this — rough layouts, not a full design system.
- Scaffold Next.js + Tailwind; create Supabase project; apply the schema (Section 7); enable auth (email + Google).
- Deploy the app to Vercel. Wire the domain: at ahost.uz set the nameservers to Cloudflare's, add the Vercel DNS records in Cloudflare, set Cloudflare SSL to **Full (strict)**, and add `surveybank.uz` as a custom domain in Vercel.
- *Exit criteria:* app deploys to Vercel, a user can sign up and log in, DB tables exist.

**Phase 1 — The vertical slice (deposit → view → download)**
*This is the heart of the product. Build it end-to-end before anything else.*
- Deposit form with metadata fields + validation.
- CSV upload → PapaParse → column-type detection → **PII guard** → store file + `survey_columns` with precomputed `summary_json`.
- Dataset page: metadata, data table, auto-charts, summary stats, citation block.
- Re-export as CSV / XLSX / JSON.
- *Exit criteria:* a depositor can upload a Google Forms CSV and anyone can view its charts/table and download it in three formats.

**Phase 2 — Discovery**
- Archive listing with faceted filters (topic, year, sample size, method, language) + full-text search.
- Linked-paper display + "How to cite" block polish.
- Ratings + feedback on datasets.
- *Exit criteria:* a visitor can find a relevant dataset without knowing its title.

**Phase 3 — Trust, language & launch-readiness**
- uz / ru / en interface toggle.
- Basic moderation view (approve/reject pending deposits).
- Anonymization confirmation + PII-strip verified end-to-end.
- Responsive polish from the Pencil designs.
- *Exit criteria:* the deposit→moderate→publish→download loop is solid and PII never reaches a published dataset.

**Phase 4 — Seed & launch**
- Import 15–30 existing open datasets (Section 10) so launch isn't empty.
- Soft-launch to the group chat that requested this; ask 5–10 people to deposit their first datasets.

## 10. Seed the shelf BEFORE announcing

Don't launch empty. Pre-load 15–30 well-documented, already-open Uzbek/Central Asian datasets so the first visitor sees a working, populated archive:
- World Bank Microdata Library — Uzbekistan surveys (e.g., "Listening to the Citizens of Uzbekistan").
- Open Data Portal of Uzbekistan (data.egov.uz).
- Central Asia Barometer (public-opinion data).
- Life in Kyrgyzstan (open longitudinal — a great reference example too).

Respect each source's license and link back to the original.

## 11. Launch & feedback loop

1. Seed → soft-launch to the group chat that requested this.
2. Personally ask 5–10 people who already have Google Forms results to deposit the first datasets.
3. Collect feedback via a simple widget; ship improvements weekly.
4. Track: # datasets, # depositors, # downloads, # searches with zero results (tells you what data people want).

## 12. Phase 2+ (after traction — do NOT build now)

- DOIs via DataCite (requires an institutional partner — pursue a university to host under its name; also unlocks trust and legal cover).
- ORCID login.
- Variable-level search ("find datasets containing a household-income question").
- Dataset versioning + reuse/citation counts.
- Public API.
- Only much later, as separate modules: live survey hosting, or any monetization.

## 13. Top risks & mitigations

- **Empty archive on launch** → seed 15–30 datasets first (Section 10).
- **Design phase eats the timeline** → Phase 0 is low-fidelity and timeboxed; build the vertical slice early.
- **Low-quality / undocumented deposits** → required metadata + light moderation + anonymization confirmation.
- **Privacy/legal exposure** → anonymized-only rule + automatic PII stripping; lawyer + local hosting only if you later store personal data.
- **Scope creep (survey hosting / payments)** → out of v1 by decision; revisit only after the archive has real usage.

---

### Bottom line

Ship a **curated, anonymized, free-tier archive** on Next.js + Supabase + Vercel behind `surveybank.uz`. Design four screens fast in Pencil, then have Claude Code build the deposit→view→download vertical slice first, add discovery and language, seed with existing open data, and launch. Keep personal data out and you stay both legal and free.

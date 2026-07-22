# Uzbekistan / Central Asia Survey Archive — Strategy & Architecture

*Prepared for Andre — solo/student builder. Scope decision: build the **data archive** first; survey-hosting and paid-respondent features are deferred.*

---

## Part 1 — Strategy (read this before writing any code)

### The one thing that decides success or failure: data supply

Your plan is to announce the platform in social-media group chats and ask survey owners to share. **I disagree with this as your primary supply strategy, and it's the biggest risk in the whole project.** Here's why:

- The people in general group chats mostly hold *student projects and one-off surveys* — small samples, no codebook, no ethics consent allowing redistribution, often collected via Google Forms with no documentation. That is exactly the data nobody can reuse. You'd fill the shelf with material that fails the purpose ("future researchers reuse this").
- A platform that launches empty and stays empty looks dead in week two. Visitors leave and don't come back. Social media gives you a spike of attention *once* — if the shelf is empty when they arrive, you've spent your one launch.
- Serious researchers (the depositors you actually want) will not hand raw data to an unknown student platform with no legal entity, no data-use agreement, and no track record. They'll worry about scooping, consent violations, and being blamed for a privacy leak.

**What I'd do instead — seed first, then announce:**

1. **Seed the archive with existing open data before launch.** These sources are already openly licensed and importable, and they're *about Uzbekistan/Central Asia*:
   - World Bank Microdata Library (e.g., "Listening to the Citizens of Uzbekistan," 2018–present).
   - Open Data Portal of Uzbekistan (data.egov.uz) — 10,000+ government datasets.
   - Central Asia Barometer (public-opinion data, released after a 2-year embargo).
   - Life in Kyrgyzstan (longitudinal, open-access — your single best model).
   Launch with 30–50 well-documented, citable datasets already indexed. Now the shelf is full on day one.
2. **Then** use social media — but to attract *users* (researchers searching for data), not primarily depositors. Some users become depositors once they see a working, populated, credible platform.
3. **Convert the first depositors through 1:1 outreach, not broadcast.** Email 10 named researchers who have published on Uzbekistan and ask them to deposit their dataset with a DOI and citation credit. One yes from a respected name is worth more than 100 group-chat forwards.

The risk in the broadcast-only approach: you get a trickle of unusable submissions, the archive looks amateur, and credible researchers stay away because of who's already there. Supply quality is a reputation flywheel — it spins the wrong way just as easily.

### The reframe: you are a *curated index*, not a storage company

[Certain] Harvard's **Dataverse** is open-source, free, and was built for exactly this — dataset storage, DOIs, versioning, metadata, access controls. You do **not** need to rebuild that. Your defensible value is the three things Dataverse does *not* give you for Uzbekistan:

1. **Curation & regional focus** — one place that indexes *all* Uzbek/Central Asian survey data wherever it lives, in Uzbek and Russian, with local context.
2. **Paper linkage** — every dataset connected to the papers that used it (and vice versa). This is genuinely useful and rare.
3. **Community layer** — ratings, feedback, reuse counts, "who cited this."

This changes your build dramatically: you can either **run Dataverse and put a custom curation/community layer on top**, or **build a lightweight catalog that links out to where data already lives**. Both are 10x less work than building a storage platform from scratch. (See Part 2, "Build vs. reuse.")

### The incentive that actually makes researchers deposit: **citation credit**

[Likely] The #1 reason academics deposit data is getting a *citable, DOI'd data publication* they can list on their CV and that earns citations. Your feedback/rating/"pay per vote" ideas are secondary. Make DOI issuance and a clean "How to cite this dataset" block the centerpiece of every dataset page.

### On "pay per vote" and monetization

Set this aside for now — it belongs to a *different product* (a paid-respondent marketplace like Prolific) and it contradicts "fully open and free." Mixing paid-respondent data into an open archive also creates licensing problems (whoever paid usually owns/controls that data). Keep v1 free and open. If you ever monetize, the honest options are grants, institutional hosting fees, or premium curation — not charging per vote.

### MVP scope (what "done" means for v1)

A researcher can: **search/filter** datasets by country, topic, year, sample size, method, and language; **open a dataset page** with full metadata, downloadable files in multiple formats, a codebook, linked papers, and a citation block; **download** under a clear license after accepting a data-use agreement; and **leave a rating/feedback**. A depositor can: **submit a dataset** through a guided form that enforces required metadata, gets a DOI, and goes live after light moderation.

Everything else — live survey hosting, payments, running new surveys — is explicitly **out of scope for v1**.

---

## Part 2 — Architecture

### Build vs. reuse (decide this first — it changes everything below)

| Option | What it is | Effort | Best if |
|---|---|---|---|
| **A. Run Dataverse + custom front layer** | Deploy open-source Dataverse for storage/DOI/versioning; build your own search + community UI on top via its API | Medium | You want real data hosting without building storage/DOI/preservation yourself. **Recommended.** |
| **B. Lightweight catalog / index** | You store only *metadata + links*; files live on the source repository or depositor's link | Low | Solo builder, want to launch fast, mostly indexing data that already exists elsewhere |
| **C. Full custom build** | Build storage, DOIs, versioning, preservation from scratch | Very high | Don't. You'll rebuild Dataverse worse. |

For a solo student launching fast, **start with B (a metadata catalog)**, and migrate hosted files to A (Dataverse) once you have depositors who need you to *store* their files. B lets you seed 30–50 datasets in weeks by pointing at World Bank / egov.uz / Life in Kyrgyzstan.

### Core data model

The heart of the system is a small set of linked entities:

- **Dataset** — id (DOI), title, abstract, country/region, geographic coverage, topics (tags), collection method (household survey, phone, panel, experiment…), sample size, population/sampling frame, fieldwork start/end dates, language(s), license, access level (open / registered / restricted), version, deposit date, depositor.
- **File** — belongs to a Dataset; format (CSV, Stata .dta, SPSS .sav, XLSX, JSON, PDF questionnaire), size, checksum, is-codebook flag.
- **Questionnaire / Codebook** — the instrument and variable documentation (often the most reused artifact — surface it prominently).
- **Publication** — papers/reports that used the dataset; DOI/URL, authors, year. Many-to-many with Dataset.
- **Person / Depositor** — name, affiliation, ORCID, contact.
- **Review** — rating (1–5), free-text feedback, reuse note; belongs to Dataset + User.
- **User** — role (visitor, registered, depositor, moderator, admin).
- **DataUseAgreement / DownloadLog** — who accepted what and when (needed for restricted data and for showing reuse counts).

### Metadata standard — don't invent your own

[Certain] Use **DDI (Data Documentation Initiative)** — the international standard for survey/social-science metadata — plus **Dublin Core** for basic discovery and **DataCite** schema for DOI registration. Reasons: it makes your records interoperable with World Bank, ICPSR, and Dataverse (you can import/export), and it forces depositors to document variables properly. Map your form fields to DDI from day one even if you only expose a simplified subset in the UI.

### System components

- **Catalog/API service** — CRUD for datasets, search, DDI import/export. This is your core backend.
- **Search index** — for fast faceted filtering (by country, topic, year, method, sample size, language). Use PostgreSQL full-text + a facet layer to start; add OpenSearch/Elasticsearch only if volume demands it.
- **Storage** — object storage (S3-compatible / MinIO) for hosted files; or just store links in catalog-only mode.
- **DOI issuance** — register via **DataCite** (through a member institution — see "legal" below) or defer by linking to source DOIs in catalog mode.
- **Ingest/curation workflow** — depositor form → validation (required metadata, file format, basic PII check) → moderator review → publish.
- **Community layer** — ratings, feedback, reuse/citation counts.
- **Auth** — email + ORCID login (ORCID matters for academic trust and auto-fills affiliation).
- **i18n** — Uzbek (Latin + Cyrillic), Russian, English from the start. This is a real differentiator; don't bolt it on later.

### Recommended tech stack (solo-builder friendly)

- **Frontend:** Next.js (React) + TypeScript, Tailwind. SSR helps search-engine discoverability, which matters a lot for a discovery platform.
- **Backend:** either Next.js API routes (simplest) or a separate Python (FastAPI) / Node service if you prefer. Python pairs well with survey-data tooling (pandas, pyreadstat for Stata/SPSS conversion).
- **Database:** PostgreSQL (JSONB for flexible metadata + strong full-text search).
- **File storage:** S3-compatible (MinIO self-hosted or a cloud bucket).
- **Format conversion:** a worker that auto-generates CSV/XLSX/JSON previews from uploaded Stata/SPSS files (`pyreadstat`) — this delivers your "multiple easy-to-read formats" promise automatically.
- **Search:** Postgres FTS first; OpenSearch later.
- **Hosting:** start on a single VPS or a platform like Railway/Render; containerize (Docker) so you can move.
- **Open source:** MIT or AGPL license, public GitHub, contribution guide. AGPL if you want to force downstream forks to stay open.

### Features to add that you didn't mention (prioritized)

**High value, do early:**
- **DOIs + auto-generated citation block** on every dataset — the core deposit incentive.
- **Auto format conversion** (Stata/SPSS → CSV/XLSX/JSON) so every dataset is readable without proprietary software.
- **Variable-level search** — let researchers find datasets that contain a *specific variable* (e.g., "household income," "internal migration"). This is what makes an archive actually save research time, and few regional archives do it well.
- **Data-use agreement + access tiers** (open / registered / restricted-on-request) — essential for datasets with consent limits; without it, serious depositors won't come.
- **PII / anonymization checklist** at deposit — protects you legally and protects respondents.

**Medium value:**
- Dataset **versioning** and changelogs.
- **Reuse tracking** — show "cited by N papers / downloaded N times."
- **Harmonization notes** — flag datasets that are comparable across waves/countries (Life in Kyrgyzstan does this well).
- **Saved searches / alerts** for new datasets in a topic.

**Later / nice-to-have:**
- API for programmatic access.
- Embeddable charts/visual summaries of results.
- Collections/dossiers curated around a theme.

### Legal & ethics (non-optional — a solo builder's real blockers)

- **A legal home.** DataCite DOIs require going through a member institution; restricted data and liability are much safer under a university or registered NGO. As a solo student, **partner with your university or a research institute** to host this under their name. This also solves your credibility problem for depositors far better than any feature.
- **Licensing.** Default datasets to **CC-BY** (credit required, reuse allowed). Never accept a dataset without an explicit license and a confirmation that the depositor has the right to share it.
- **Consent & privacy.** Require depositors to confirm respondent consent permits redistribution, and to submit anonymized microdata. You do **not** want to be the platform that leaked identifiable survey respondents. Uzbekistan has a personal-data protection law; check localization/hosting requirements before storing personal data.

### Suggested roadmap

1. **Weeks 1–4 — Catalog MVP (option B).** Data model, deposit/curation form with DDI-mapped fields, faceted search, dataset pages with citation blocks. Metadata + links only.
2. **Weeks 3–6 — Seed content.** Import/curate 30–50 existing open datasets (World Bank, egov.uz, Central Asia Barometer, Life in Kyrgyzstan) so launch isn't empty.
3. **Weeks 5–8 — Trust layer.** ORCID login, data-use agreements, ratings/feedback, i18n (UZ/RU/EN).
4. **Then — Hosting & DOIs (migrate toward option A).** File uploads, auto format conversion, DataCite DOIs via an institutional partner.
5. **Only after traction — consider** survey-hosting or any monetization, as *separate* modules with their own validation.

---

### Bottom line

The software is the easy part and mostly already exists (Dataverse). Your project succeeds or fails on **(a) seeding a credible, full shelf before you announce, (b) getting an institutional home so real researchers trust you, and (c) making citation credit the reason people deposit.** Build the catalog, seed it, get a university's name on it, and *then* post in those group chats.

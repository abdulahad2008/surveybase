# SurveyBank.uz — Phase 4 Seed Sources (Uzbekistan only)

Concrete, verified open datasets **about Uzbekistan** to seed the archive before launch. Read the licensing model first — it decides how each record is stored.

## The two record types (build both into the seed script)

- **`hosted`** — openly licensed, redistribution allowed. Download → PII-guard + column-analysis pipeline → store → `status = 'published'`.
- **`link_only`** — registration-gated or non-redistributable. Do **NOT** store the file. Insert a catalog record with metadata + a link to the original (`is_hosted = false` / `external_url`), so the dataset page shows "View at source" instead of a download button.

Re-hosting World Bank microdata, MICS, or EBRD LiTS violates their data-use terms. The seed script is the moment you add link-only support to the schema.

## Verified Uzbekistan sources

| Source | Uzbekistan coverage | Redistribution | Record type |
|---|---|---|---|
| **Central Asia Barometer — Discuss Data** | Waves 1–14 (2017–2023), one combined deposit | "Open Access" is a *viewing* designation, not a redistribution licence — permission still needed | **hosted, on licence hold** |
| ~~Harvard Dataverse~~ | 309 datasets licence-checked | — | **rejected — see below** |
| ~~data.egov.uz~~ | 13,095 datasets enumerated | CC BY-SA 4.0 (licence is fine) | **rejected on content — see below** |
| **World Bank L2CU** | "Listening to Citizens of Uzbekistan," monthly since 2018 | Microdata Research License, no redistribution | **link_only** |
| **UNICEF/UZSTAT MICS 2021–2022** | National MICS Round 6 | Registration + request review | **link_only** |
| **EBRD Life in Transition (LiTS)** | Rounds I–IV incl. UZ (2006/2010/2016/2022–23) | EBRD terms; via WB Microdata (registration) | **link_only** |
| **WB Uzbekistan Survey of Conflict Prevention 2004** | UZ household survey | WB terms | **link_only** |

## Current state of the batch

1. **CAB Uzbekistan** (Discuss Data) — the only source that is authoritative,
   Uzbekistan-specific, and genuine survey microdata. Seeds as `draft`, not
   `published`, until CAB grants written permission (`needsLicenseHold` in
   `scripts/seed.mts`). **This is the critical path: every other re-hostable route has
   been checked and is empty.**
2. ~~Harvard Dataverse~~ and ~~data.egov.uz~~ — both investigated exhaustively and
   removed from the manifest. See "Evaluated and rejected" below. Do not re-harvest.
3. **4 link-only catalog entries**: World Bank L2CU, MICS 2021–2022, EBRD LiTS, WB
   Conflict Prevention 2004 → adds breadth and exercises the link-only record type.

SurveyBase currently hosts **no** data: all four published records are `link_only`.
Unblocking CAB is what changes that.

## Exact links & searches

- CAB on Discuss Data: https://discuss-data.net/dataset/1afc5235-eb1f-4a23-80b6-036515ce1916/ — DOI 10.48320/1AFC5235-EB1F-4A23-80B6-036515CE1916. Now published as one combined deposit, **"Central Asia Barometer Survey Waves 1-14 (2017-2023)"**; the four wave-split entries in the manifest predate it.
- World Bank L2CU: https://microdata.worldbank.org/index.php/catalog/6412
- Uzbekistan MICS 2021–2022: https://microdata.worldbank.org/index.php/catalog/5961/study-description · https://mics.unicef.org/surveys
- EBRD LiTS data: https://www.ebrd.com/home/what-we-do/office-of-the-chief-economist/lits/life-in-transition-survey-data.html

## Before you import (checklist)

- Confirm each source's license/terms on the source page; store the license string in the `license` column and the original URL in every record.
- For `hosted` records, keep the attribution/citation the source requires (CAB requires a specific citation with DOI).
- Run every hosted file through the same PII guard as user deposits — even "clean" microdata sometimes carries identifiers.
- For CAB, import the **Excel/CSV** file (your pipeline's shape); attach the questionnaire PDF as an `is_codebook` file.

*Machine-readable version: `seed/seed-manifest.json` (Uzbekistan-only, 8 records).*

---

# Evaluated and rejected

A source belongs in the manifest only if it clears four gates, in this order:

1. **Licence** permits re-hosting (not merely "free to view" or "open access").
2. **Subject** is Uzbekistan. A survey covering Uzbekistan as one country among many
   is out of scope, however good its licence.
3. **Shape** is respondent-level survey microdata, not aggregate indicators.
4. **Format** is machine-parseable by the seed pipeline.

Both rejections below died at gate 2 or 3 — not gate 1. Licence is the cheapest gate
to check and, in practice, the least likely to be the blocker. Check shape early.

## Harvard Dataverse — no usable data

Checked 2026-08-20 via `/api/search` for `Uzbekistan`, `Tashkent`, `Karakalpakstan`,
`Samarkand` and `Uzbek`, then reading
`/api/datasets/:persistentId/versions/:latest` for **every** unique DOI to get its
real licence. 309 datasets licence-checked individually.

| Gate | Surviving |
|---|---|
| Total matches | 309 |
| Openly licensed (CC0 or CC BY 4.0) | 118 |
| …containing any tabular data file | 15 |
| …that are Uzbekistan-focused survey microdata | 2 |
| …usable | **0** |

API caveat, since it costs an hour to rediscover: the **search** endpoint does not
return a licence field, and the **version** endpoint does not return `dataTables`.
Neither call alone can filter this, and row/variable counts need
`/api/files/{id}/metadata`.

The two survivors were rejected on inspection:

- **`doi:10.7910/DVN/BXCA1T`** — "A Tale of Two Choices: Son Preference and
  Reproductive Outcomes in Uzbekistan". CC0, downloads as clean TSV, 93 columns ×
  3,585 rows. **Rejected: it is a MICS extract.** Its columns are MICS variable names
  (`HH1`, `HH2`, `LN`, `BH3_FIRST`, `WAGEM`), and MICS Uzbekistan is `link_only` in
  this manifest precisely because UNICEF terms forbid redistribution. The depositor's
  CC0 covers their deposit; it cannot grant rights over the underlying MICS
  microdata. `HH1`+`HH2`+`LN` is also the MICS household/line identifier triple, so
  the extract links back to restricted respondent records.
- **`doi:10.7910/DVN/EWMUAC`** — "Rolling the Dice on Advertising". CC0, 119 Uzbek and
  UK advertising practitioners. The `.sav` was never ingested so no TSV exists, but
  the `.xlsx` sibling parses with the `xlsx` package already in `package.json`.
  **Rejected on shape:** it is an analyst's working file, not a respondent × question
  matrix — 222 columns, UK responses starting at column 116
  (`UK_Dataset_Starts_fromhere`), and most of the remainder derived analysis
  variables (`par11invuk`, `iaraUKtot7pls`, `q55UKrev`, `PRPexp3`).

Rejected on the Uzbekistan-only rule rather than on quality: the Electoral Integrity
Project family (`doi:10.7910/DVN/LBM4Z2` PEI-12.0, `doi:10.7910/DVN/Z7XVMC` EMS-2.0).
CC BY 4.0, genuinely tagged `kindOfData: "survey data"`, clean — but global. PEI-12.0
carries 32 Uzbek expert respondents out of 5,859; EMS-2.0 carries 1 out of 49.

## data.egov.uz — licence is fine, content is not surveys

Checked 2026-08-20. The portal **clears the licence gate**, which the original
manifest placeholder had flagged as unknown: it declares **CC BY-SA 4.0** site-wide
via a standard `rel="license"` link to `creativecommons.org/licenses/by-sa/4.0/`, and
`CC-BY-SA` is already in SurveyBase's licence enum. Watch out: the "License" link
visible in the page footer points at an ODI *portal-quality certificate*, not a
licence — the actual grant is in the markup.

It fails on **shape**. The full catalogue was enumerated (13,095 datasets) and
filtered locally, because the portal's own text search does not match Uzbek-language
titles and throws English false positives ("poll" matches *pollutants*; "survey"
matches *engineering surveys*).

- 17 of 13,095 datasets reference a survey instrument.
- 12 of those 17 contain exactly **one row**.
- The largest is 441 rows: "Competitive questions on the appointment of a notary".
- Across the whole catalogue, 9,219 of 13,095 datasets have ≤10 rows.

It is an indicator portal publishing official statistics. Some tables are *derived*
from household surveys ("…according to a sample survey of households"), but what is
published is the aggregate percentage, never the microdata. Nothing here supports a
dataset page with a respondent-level table, column charts, or PII screening.

### data.egov.uz API reference (undocumented)

The portal is a Nuxt SPA with an empty SSR payload, so its catalogue is invisible to
plain HTTP fetches. The client API is unauthenticated and needs no key. Recorded here
so it need not be reverse-engineered again. Base URL `https://data.egov.uz/`:

- `apiClient/main/gettable` — catalogue listing.
  Params: `limit`, `offset`, `text`, `orgId`, `sphereId`, `regionId`.
  Returns `{ result: { data: [...], count: N } }`. Each record carries `structId`,
  `name`, `fullCount` (row count), and `dataName`/`orgName`/`sphereName` as
  `{uzbText, uzbKrText, rusText, engText}`.
- `apiClient/Main/GetSphereList` — topic categories with dataset counts.
- `apiClient/Ref/OrgList` — publishing organisations.

Send a browser `User-Agent`; some paths behave differently without one.

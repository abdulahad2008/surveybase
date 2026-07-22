# SurveyBank.uz — Phase 4 Seed Sources (Uzbekistan only)

Concrete, verified open datasets **about Uzbekistan** to seed the archive before launch. Read the licensing model first — it decides how each record is stored.

## The two record types (build both into the seed script)

- **`hosted`** — openly licensed, redistribution allowed. Download → PII-guard + column-analysis pipeline → store → `status = 'published'`.
- **`link_only`** — registration-gated or non-redistributable. Do **NOT** store the file. Insert a catalog record with metadata + a link to the original (`is_hosted = false` / `external_url`), so the dataset page shows "View at source" instead of a download button.

Re-hosting World Bank microdata, MICS, or EBRD LiTS violates their data-use terms. The seed script is the moment you add link-only support to the schema.

## Verified Uzbekistan sources

| Source | Uzbekistan coverage | Redistribution | Record type |
|---|---|---|---|
| **Central Asia Barometer — Discuss Data** | Waves 1–9 (2017–2021), UZ file per wave | Open Access, DOI, cite required | **hosted** (confirm Discuss Data T&C) |
| **Harvard Dataverse** | Search "Uzbekistan"; CC0 items | CC0 = public domain | **hosted** |
| **data.egov.uz** | Gov open datasets | Government open data | **hosted, verify per dataset** |
| **World Bank L2CU** | "Listening to Citizens of Uzbekistan," monthly since 2018 | Microdata Research License, no redistribution | **link_only** |
| **UNICEF/UZSTAT MICS 2021–2022** | National MICS Round 6 | Registration + request review | **link_only** |
| **EBRD Life in Transition (LiTS)** | Rounds I–IV incl. UZ (2006/2010/2016/2022–23) | EBRD terms; via WB Microdata (registration) | **link_only** |
| **WB Uzbekistan Survey of Conflict Prevention 2004** | UZ household survey | WB terms | **link_only** |

## Recommended first batch (~15 Uzbekistan datasets, no original surveying)

1. **CAB Uzbekistan, Waves 1–9** (Discuss Data) → up to **9 hosted entries**, one per wave. Start here — it's the only large, openly-published, Excel-format, Uzbekistan-specific source.
2. **2–4 CC0 Uzbekistan datasets from Harvard Dataverse** → hosted.
3. **2–4 open survey/poll datasets from data.egov.uz** → hosted (after license check).
4. **4 link-only catalog entries**: World Bank L2CU, MICS 2021–2022, EBRD LiTS, WB Conflict Prevention 2004 → adds breadth and exercises the link-only record type.

## Exact links & searches

- CAB on Discuss Data: https://discuss-data.net/dataset/1afc5235-eb1f-4a23-80b6-036515ce1916/ — DOI 10.48320/1AFC5235-EB1F-4A23-80B6-036515CE1916 (use the newest version).
- Harvard Dataverse: https://dataverse.harvard.edu/dataverse/harvard?q=Uzbekistan · API: `https://dataverse.harvard.edu/api/search?q=Uzbekistan&type=dataset&per_page=50`
- data.egov.uz (English): https://data.egov.uz/eng
- World Bank L2CU: https://microdata.worldbank.org/index.php/catalog/6412
- Uzbekistan MICS 2021–2022: https://microdata.worldbank.org/index.php/catalog/5961/study-description · https://mics.unicef.org/surveys
- EBRD LiTS data: https://www.ebrd.com/home/what-we-do/office-of-the-chief-economist/lits/life-in-transition-survey-data.html

## Before you import (checklist)

- Confirm each source's license/terms on the source page; store the license string in the `license` column and the original URL in every record.
- For `hosted` records, keep the attribution/citation the source requires (CAB requires a specific citation with DOI).
- Run every hosted file through the same PII guard as user deposits — even "clean" microdata sometimes carries identifiers.
- For CAB, import the **Excel/CSV** file (your pipeline's shape); attach the questionnaire PDF as an `is_codebook` file.

*Machine-readable version: `seed/seed-manifest.json` (Uzbekistan-only, 10 records).*

# Permission request to Central Asia Barometer

**Status:** draft, not sent. Needs Akmal's name, title and a decision on the
fallback offer before sending.

## Why this email exists

CAB is the only identified source that is authoritative, Uzbekistan-specific, and
genuine survey microdata. Every route to hosted data that needs no permission has
been checked and is empty (see `seed/seed-sources.md`). Getting a yes here is what
turns SurveyBase from a catalogue of links into an archive that hosts data.

## What their published terms actually say

From <https://ca-barometer.org/en/p/data-usage-policy>:

- **"Central Asia Barometer data is protected by copyright."** It is not openly
  licensed. The "Open Access" marking on the Discuss Data deposit is a *viewing*
  designation and is not a redistribution grant.
- Data is released publicly **two years after fieldwork completes** in the survey
  country. Earlier access is **sold** — "purchase it post factum or subscribe to
  future waves results."
- Required citation form:
  `Central Asia Barometer Data, [Country(ies)], [Round(s)], [Year(s)], available at http://www.ca-barometer.org.`
- They ask that publications using the data be emailed to them.

Their policy grants **download and use**. It is silent on **redistribution**, which
is precisely what re-hosting is. That silence, plus an explicit copyright assertion,
is why this has to be asked rather than assumed.

Because CAB sells early access, a request to re-host is a request that touches their
revenue model. The email below addresses that directly rather than hoping they do not
notice — offering to stay strictly behind their own two-year public-release window,
and to take anything down on request.

## Operational notes before sending

- **CAB has temporarily suspended full operations.** Their contacts page states a
  part-time team checks email **weekly**. Expect a slow reply and possibly none.
  The email is therefore written to be answerable in a single response, with no
  clarifying round-trip needed, and with a fallback ask so that even a partial answer
  is useful.
- Two addresses appear on their site: `info@ca-barometer.org` (contacts page) and
  `info@centralasiabarometer.org` (data usage policy). Send to the first and CC the
  second.
- Send from a surveybase.uz address if one exists — it corroborates the project.

---

## Draft email

**To:** info@ca-barometer.org
**CC:** info@centralasiabarometer.org
**Subject:** Permission to re-host Uzbekistan CAB data on a non-commercial open archive

Dear Central Asia Barometer team,

I am writing to ask for something your data usage policy does not cover explicitly,
so I would rather ask than assume.

I run SurveyBase.uz, a free, non-commercial open archive for survey data about
Uzbekistan. It is a new and small project. Its purpose is to make survey data about
the country findable and readable by people here — researchers, students,
journalists, civil servants — with an interface in Uzbek, Russian and English, browsable
data tables and charts rather than files that require Stata or SPSS to open, and a
citation for every dataset.

**My request:** may I host the Uzbekistan files from *Central Asia Barometer Survey
Waves 1-14 (2017-2023)* on SurveyBase.uz, with attribution to CAB?

I understand from your data usage policy that CAB data is protected by copyright and
that the policy covers download and use rather than redistribution. That is why I am
asking before doing anything.

If you agree, here is what I commit to:

- **Citation in your required form** on every dataset page:
  *Central Asia Barometer Data, Uzbekistan, [Round(s)], [Year(s)], available at
  http://www.ca-barometer.org* — alongside a prominent link to ca-barometer.org and
  to the Discuss Data DOI.
- **Nothing that competes with your paid access.** I would host only waves already
  past the two-year public-release window described in your policy, and I will not
  post newer waves. If you would prefer a longer delay than two years, I will use
  yours.
- **CAB named as the source, not SurveyBase.** The archive presents itself as a
  mirror and finding aid for your work, never as the originator.
- **Removal on request, no questions asked.** If at any point you want a dataset
  taken down, email me and it is gone the same day.
- I will send you anything published that uses the data, as your policy asks.

What I hope this gives CAB in return is reach. SurveyBase publishes structured
metadata that Google Dataset Search indexes, so datasets surface in ordinary
searches, and the interface is in Uzbek and Russian. My aim is that someone in
Tashkent searching in Uzbek finds your data, cites it properly, and goes to your site
— rather than never finding it at all.

**If re-hosting is not something you want**, may I instead list these surveys as
catalogue entries that hold only the description and send visitors to your site to
download? I believe that needs no permission, but I would rather have your view than
proceed on my own reading of it. A yes to only this second question would still be
very helpful.

I saw on your website that CAB has temporarily suspended full operations and that
email is checked weekly, so please take whatever time you need. A one-line reply to
either question is enough.

Thank you for making this data public in the first place. It is the most valuable
source on public opinion in the region, and the reason this project is possible.

With respect,

[Name]
[Title], SurveyBase.uz
https://surveybase.uz
[email]

---

## If they say yes

1. Get the permission in writing and save it — the exact scope granted, and any
   condition on which waves.
2. Record the granted terms in each CAB entry's `license` field in
   `seed-manifest.json`, replacing `"confirm before re-hosting"`. Only then will
   `needsLicenseHold` in `scripts/seed.mts` stop forcing `status = "draft"`.
3. The manifest's four CAB entries describe waves 1-9 as separate deposits. Discuss
   Data now publishes waves 1-14 as one deposit, so the entries need restructuring
   before seeding.
4. Run every file through the same PII guard as user deposits, as
   `seed/seed-sources.md` requires.

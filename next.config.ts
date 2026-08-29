import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The seeded archive records went live with slugs that carried a `seed-`
  // prefix and were cut to 60 characters mid-word. scripts/reslug-seeds.mts
  // renamed them; these keep the URLs that were already published resolving,
  // because a dataset page is meant to be citable and a citation outlives a
  // naming mistake. Safe to drop once the old paths stop drawing traffic.
  async redirects() {
    return [
      { source: "/:locale(uz|ru|en)/datasets/seed-central-asia-barometer-survey-uzbekistan-wave-1", destination: "/:locale/datasets/central-asia-barometer-survey-uzbekistan-wave-1-it4i4d", permanent: true },
      { source: "/:locale(uz|ru|en)/datasets/seed-central-asia-barometer-survey-uzbekistan-wave-2", destination: "/:locale/datasets/central-asia-barometer-survey-uzbekistan-wave-2-4yhcre", permanent: true },
      { source: "/:locale(uz|ru|en)/datasets/seed-central-asia-barometer-survey-uzbekistan-waves-3-7", destination: "/:locale/datasets/central-asia-barometer-survey-uzbekistan-waves-3-7-xkbcnw", permanent: true },
      { source: "/:locale(uz|ru|en)/datasets/seed-central-asia-barometer-survey-uzbekistan-waves-8-9", destination: "/:locale/datasets/central-asia-barometer-survey-uzbekistan-waves-8-9-no4klf", permanent: true },
      { source: "/:locale(uz|ru|en)/datasets/seed-life-in-transition-survey-lits-uzbekistan-rounds-i-iv", destination: "/:locale/datasets/life-in-transition-survey-lits-uzbekistan-rounds-i-iv-ft0for", permanent: true },
      { source: "/:locale(uz|ru|en)/datasets/seed-listening-to-the-citizens-of-uzbekistan-survey-l2cu-2018-202", destination: "/:locale/datasets/listening-to-the-citizens-of-uzbekistan-survey-l2cu-2018-ae660l", permanent: true },
      { source: "/:locale(uz|ru|en)/datasets/seed-uzbekistan-multiple-indicator-cluster-survey-mics-2021-2022", destination: "/:locale/datasets/uzbekistan-multiple-indicator-cluster-survey-mics-2021-2022-i2cm8d", permanent: true },
      { source: "/:locale(uz|ru|en)/datasets/seed-uzbekistan-survey-of-conflict-prevention-and-cooperation-200", destination: "/:locale/datasets/uzbekistan-survey-of-conflict-prevention-and-cooperation-8q2k0m", permanent: true },
    ];
  },
  turbopack: {
    root: __dirname,
  },
  experimental: {
    globalNotFound: true,
    serverActions: {
      // A deposit posts the depositor's spreadsheet through a Server Action,
      // and the default cap is 1mb — so every upload past a few thousand rows
      // was failing on a limit nothing in the UI mentioned. See
      // MAX_UPLOAD_BYTES in src/lib/spreadsheet.ts, which stays under this.
      bodySizeLimit: "4mb",
    },
  },
};

export default withNextIntl(nextConfig);

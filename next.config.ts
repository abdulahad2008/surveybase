import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
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

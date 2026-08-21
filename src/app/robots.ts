import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        // /api/datasets/*/download/* and /api/datasets/*/visit both increment
        // download_count as a side effect, so an indexing crawler walking them
        // would quietly inflate every dataset's figures. Nothing under /api is
        // meant to be indexed regardless.
        "/api/",
        "/auth/",
        // Locale-prefixed because next-intl prefixes every locale, including the
        // default: the real paths are /uz/moderate, /ru/moderate, /en/moderate.
        // These are all authenticated pages that redirect anonymous visitors,
        // but there is no reason to spend crawl budget discovering that.
        "/*/moderate",
        "/*/deposit",
        "/*/profile",
        "/*/login",
        "/*/signup",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

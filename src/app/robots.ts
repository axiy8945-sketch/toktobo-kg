import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ? process.env.NEXT_PUBLIC_SITE_URL : "https://toktobo-kg.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/read/", "/api/", "/cart", "/library", "/progress", "/orders", "/login", "/auth/"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://insista-estoque.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/vender", "/login", "/inicio", "/api/"] }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}

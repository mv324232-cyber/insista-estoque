import type { MetadataRoute } from "next";
import { PRODUTOS } from "@/catalogo/produtos";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://insista-estoque.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    ...PRODUTOS.map((p) => ({ url: `${BASE}/produto/${p.codigo}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}

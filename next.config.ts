import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // As telas são renderizadas no navegador (necessário para o modo offline do
  // vendedor e para a sessão guardada no aparelho), por isso não usamos
  // Cache Components / Partial Prefetching.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;

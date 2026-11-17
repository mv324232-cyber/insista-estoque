import type { Metadata } from "next";
import { PRODUTOS } from "@/catalogo/produtos";
import { Catalogo } from "@/catalogo/ui/catalogo";
import { Colecoes } from "@/catalogo/ui/colecoes";
import { Hero } from "@/catalogo/ui/hero";
import { Letreiro } from "@/catalogo/ui/letreiro";
import { Beneficios, ChamadaFinal, ComoComprar, Medidas } from "@/catalogo/ui/secoes";

export const metadata: Metadata = {
  title: { absolute: "Insista — Camisetas Agro Manga Longa | Catálogo" },
  description: `${PRODUTOS.length} estampas agro exclusivas: tratores, pecuária, cavalos, drones e lavoura. Manga longa com proteção UV50+, tecido dry e estampa total por R$ 49,90. Peça pelo WhatsApp.`,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Insista",
    title: "Insista — Camisetas Agro Manga Longa",
    description: `${PRODUTOS.length} estampas exclusivas por R$ 49,90. Proteção UV50+, tecido dry e envio para todo o Brasil.`,
    images: [{ url: "/og-insista.jpg", width: 1200, height: 630, alt: "Camisetas agro Insista" }],
  },
};

export default function PaginaInicial() {
  const dadosEstruturados = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Catálogo Insista — Camisetas Agro",
    itemListElement: PRODUTOS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `/produto/${p.codigo}`,
      name: p.nome,
    })),
  };
  return (
    <>
      <Hero />
      <Letreiro />
      <Colecoes />
      <Catalogo />
      <Beneficios />
      <Medidas />
      <ComoComprar />
      <ChamadaFinal />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados) }} />
    </>
  );
}

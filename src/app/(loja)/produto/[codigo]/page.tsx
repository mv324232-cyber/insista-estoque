import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOJA, imagem, nomeColecao, produtoPorCodigo } from "@/catalogo/config";
import { PRODUTOS } from "@/catalogo/produtos";
import { ProdutoDetalhe } from "@/catalogo/ui/produto-detalhe";

export const dynamicParams = false;

export function generateStaticParams() {
  return PRODUTOS.map((p) => ({ codigo: p.codigo }));
}

export async function generateMetadata({ params }: { params: Promise<{ codigo: string }> }): Promise<Metadata> {
  const { codigo } = await params;
  const p = produtoPorCodigo(codigo);
  if (!p) return {};
  const titulo = `${p.nome} — Camiseta Agro Manga Longa Nº ${p.codigo}`;
  const descricao = `${p.descricao} Coleção ${nomeColecao(p.colecao)}. Proteção UV50+, tecido dry, tamanhos P ao GG por R$ 49,90.`;
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/produto/${p.codigo}` },
    openGraph: { title: titulo, description: descricao, images: [{ url: imagem(p.codigo, "anuncio"), width: 1080, height: 1080 }] },
  };
}

export default async function PaginaProduto({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const produto = produtoPorCodigo(codigo);
  if (!produto) notFound();
  const dados = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: produto.nome,
    sku: `INSISTA-${produto.codigo}`,
    description: produto.descricao,
    image: [imagem(produto.codigo, "camiseta"), imagem(produto.codigo, "anuncio")],
    brand: { "@type": "Brand", name: "Insista" },
    offers: { "@type": "Offer", priceCurrency: "BRL", price: LOJA.preco.toFixed(2), availability: "https://schema.org/InStock" },
  };
  return (
    <>
      <ProdutoDetalhe produto={produto} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados) }} />
    </>
  );
}

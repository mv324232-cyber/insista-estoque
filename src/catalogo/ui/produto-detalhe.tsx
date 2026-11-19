"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, Droplets, ShieldCheck, Sun, Truck, Wind, ZoomIn } from "lucide-react";
import { LOJA, imagem, nomeColecao, precoTexto } from "../config";
import { irParaColecao } from "../filtro";
import { PRODUTOS } from "../produtos";
import type { ProdutoCatalogo } from "../tipos";
import { CardProduto } from "./card-produto";
import { ConteudoCompra } from "./compra-rapida";
import { Janela } from "./painel";

const VISTAS = [
  { tipo: "camiseta" as const, rotulo: "Frente e costas" },
  { tipo: "anuncio" as const, rotulo: "Detalhes" },
  { tipo: "medidas" as const, rotulo: "Medidas" },
];

export function ProdutoDetalhe({ produto }: { produto: ProdutoCatalogo }) {
  const [vista, setVista] = useState(0);
  const [zoom, setZoom] = useState(false);
  const relacionados = PRODUTOS.filter((p) => p.colecao === produto.colecao && p.codigo !== produto.codigo).slice(0, 8);
  const atual = VISTAS[vista];

  return (
    <>
      <section className="grao relative overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
        <div aria-hidden className="absolute inset-0 -z-20 bg-[radial-gradient(60%_50%_at_30%_40%,rgb(208_20_47/0.22),transparent_70%),linear-gradient(180deg,var(--color-l-preto),var(--color-l-carvao))]" />
        <div className="mx-auto max-w-7xl">
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-l-areia" aria-label="Você está em">
            <Link href="/#catalogo" className="flex items-center gap-1 font-semibold text-l-creme hover:text-l-vermelho">
              <ChevronLeft className="size-4" /> Catálogo
            </Link>
            <span>/</span>
            <Link href="/#catalogo" onClick={() => setTimeout(() => irParaColecao(produto.colecao), 50)} className="hover:text-l-creme">
              {nomeColecao(produto.colecao)}
            </Link>
            <span>/</span>
            <span className="text-l-creme">Nº {produto.codigo}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr]">
            {/* galeria */}
            <div>
              <button
                onClick={() => setZoom(true)}
                className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-3xl border border-l-tinta/10 bg-gradient-to-b from-l-couro to-l-carvao"
                aria-label="Ampliar imagem"
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={atual.tipo}
                    src={imagem(produto.codigo, atual.tipo)}
                    alt={`${produto.nome} — ${atual.rotulo}`}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.35 }}
                    className={
                      atual.tipo === "camiseta"
                        ? "w-[92%] drop-shadow-[0_25px_30px_rgb(0_0_0/0.6)] transition-transform duration-500 group-hover:scale-105"
                        : "size-full object-contain"
                    }
                  />
                </AnimatePresence>
                <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white">
                  <ZoomIn className="size-4" /> Ampliar
                </span>
              </button>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {VISTAS.map((v, i) => (
                  <button
                    key={v.tipo}
                    onClick={() => setVista(i)}
                    aria-pressed={vista === i}
                    className={`overflow-hidden rounded-xl border-2 bg-l-couro transition ${vista === i ? "border-l-vermelho" : "border-l-tinta/10 hover:border-l-tinta/40"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagem(produto.codigo, v.tipo === "camiseta" ? "camiseta-p" : v.tipo === "anuncio" ? "anuncio-p" : "medidas")}
                      alt={v.rotulo}
                      loading="lazy"
                      className={`aspect-square w-full ${v.tipo === "camiseta" ? "object-contain p-2" : "object-cover"}`}
                    />
                    <span className="block py-1.5 text-xs font-bold uppercase tracking-wider text-l-areia">{v.rotulo}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* informações e compra */}
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="font-display text-base text-l-trigo">
                Nº {produto.codigo} • {nomeColecao(produto.colecao)}
              </p>
              <h1 className="mt-2 font-display text-4xl uppercase leading-[0.95] sm:text-6xl">{produto.nome}</h1>
              <p className="mt-3 text-lg text-l-areia">{produto.descricao}</p>
              <p className="mt-5 flex items-baseline gap-3">
                <span className="font-display text-5xl">{precoTexto(LOJA.preco)}</span>
                <span className="text-sm text-l-areia">camiseta manga longa</span>
              </p>
              <div className="mt-6 rounded-2xl border border-l-tinta/10 bg-l-carvao/70 p-5">
                <ConteudoCompra produto={produto} embutido />
              </div>
              <ul className="mt-6 grid grid-cols-2 gap-3 text-sm">
                {[
                  [Sun, "Proteção UV50+"],
                  [Wind, "Tecido dry respirável"],
                  [Droplets, "Secagem rápida"],
                  [ShieldCheck, "Estampa que não desbota"],
                  [Truck, "Envio para todo o Brasil"],
                ].map(([I, t]) => {
                  const Icone = I as typeof Sun;
                  return (
                    <li key={t as string} className="flex items-center gap-2 text-l-areia">
                      <Icone className="size-5 shrink-0 text-l-trigo" /> {t as string}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {relacionados.length > 0 && (
        <section className="bg-l-carvao px-3 py-16 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-6 font-display text-3xl uppercase sm:text-4xl">
              Mais da coleção <span className="text-l-vermelho">{nomeColecao(produto.colecao)}</span>
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
              {relacionados.map((p, i) => (
                <CardProduto key={p.codigo} produto={p} indice={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Janela aberta={zoom} aoFechar={() => setZoom(false)} titulo={`${produto.nome} ampliada`}>
        <div className="bg-l-preto p-2 sm:p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagem(produto.codigo, atual.tipo)} alt={`${produto.nome} — ${atual.rotulo}`} className="mx-auto max-h-[85dvh] w-auto" />
          <div className="mt-2 flex justify-center gap-2 pb-2">
            {VISTAS.map((v, i) => (
              <button
                key={v.tipo}
                onClick={() => setVista(i)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${vista === i ? "bg-l-vermelho text-white" : "bg-l-tinta/10"}`}
              >
                {v.rotulo}
              </button>
            ))}
          </div>
        </div>
      </Janela>
    </>
  );
}

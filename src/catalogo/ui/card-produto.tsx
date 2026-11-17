"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { CORES, imagem, nomeColecao, precoTexto } from "../config";
import { abrirCompra } from "../compra";
import type { ProdutoCatalogo } from "../tipos";

export function CardProduto({ produto, indice = 0 }: { produto: ProdutoCatalogo; indice?: number }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
      viewport={{ once: true, margin: "-5%" }}
      transition={{ duration: 0.55, delay: (indice % 4) * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-l-tinta/10 bg-gradient-to-b from-l-couro to-l-carvao transition-colors duration-300 hover:border-l-vermelho/60"
    >
      <Link href={`/produto/${produto.codigo}`} className="relative flex aspect-[5/4] items-center justify-center px-2 pt-8 sm:aspect-[4/3] sm:px-4" aria-label={`${produto.nome} — ver detalhes`}>
        <span className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_45%,rgb(208_20_47/0.22),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span className="absolute left-3 top-3 rounded-md bg-l-preto/80 px-2 py-1 font-display text-sm tracking-wider text-l-trigo sm:left-4 sm:top-4">
          Nº {produto.codigo}
        </span>
        <span
          className="absolute right-3 top-3.5 size-4 rounded-full border border-l-tinta/30 sm:right-4 sm:top-4"
          style={{ background: CORES[produto.cor].hex }}
          title={`Predominante: ${CORES[produto.cor].nome}`}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagem(produto.codigo, "camiseta-p")}
          alt={`Camiseta manga longa ${produto.nome} — frente e costas`}
          width={460}
          height={Math.round((produto.h * 460) / produto.w)}
          loading="lazy"
          decoding="async"
          className="relative max-h-full w-full object-contain drop-shadow-[0_16px_18px_rgb(0_0_0/0.55)] transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-2 group-hover:scale-[1.06]"
        />
      </Link>
      <div className="flex flex-1 flex-col p-3 pt-2 sm:p-5 sm:pt-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-l-areia sm:text-[11px]">{nomeColecao(produto.colecao)}</p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.5em] text-sm font-bold uppercase leading-tight tracking-wide sm:text-base">
          <Link href={`/produto/${produto.codigo}`} className="hover:text-l-trigo">
            {produto.nome}
          </Link>
        </h3>
        <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-xl tracking-wide sm:text-2xl">{precoTexto()}</p>
          <button
            onClick={() => abrirCompra(produto.codigo)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-lg bg-l-vermelho px-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-l-vermelho-escuro active:scale-95 sm:w-auto sm:px-4 sm:text-sm"
            aria-label={`Comprar ${produto.nome}`}
          >
            <Plus className="size-4" /> Comprar
          </button>
        </div>
      </div>
    </motion.article>
  );
}

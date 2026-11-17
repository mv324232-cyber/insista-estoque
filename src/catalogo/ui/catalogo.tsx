"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { COLECOES, CORES } from "../config";
import { definirFiltro, useFiltro, type Filtro } from "../filtro";
import { PRODUTOS } from "../produtos";
import type { CorId } from "../tipos";
import { CardProduto } from "./card-produto";
import { TituloSecao } from "./revelar";

const POR_PAGINA = 16;
// ordem de destaque: mistura as coleções para a vitrine ficar variada
const DESTAQUE = ["09", "64", "14", "02", "51", "27", "11", "57", "98", "82", "44", "06", "90", "35", "100", "13"];

function normalizar(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function Catalogo() {
  const filtro = useFiltro();
  const busca = useDeferredValue(filtro.busca);
  const [limite, setLimite] = useState(POR_PAGINA);
  const [verFiltros, setVerFiltros] = useState(false);

  useEffect(() => setLimite(POR_PAGINA), [filtro.colecao, filtro.cor, busca, filtro.ordem]);

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim()).replace(/^n[ºo°]?\s*|^cod\.?\s*/, "");
    let l = PRODUTOS.filter(
      (p) =>
        (!filtro.colecao || p.colecao === filtro.colecao) &&
        (!filtro.cor || p.cor === filtro.cor) &&
        (!termo || p.codigo === termo.padStart(2, "0") || p.codigo === termo || normalizar(`${p.nome} ${p.descricao}`).includes(termo)),
    );
    if (filtro.ordem === "codigo") l = [...l].sort((a, b) => Number(a.codigo) - Number(b.codigo));
    else if (filtro.ordem === "nome") l = [...l].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    else {
      const peso = (c: string) => (DESTAQUE.includes(c) ? DESTAQUE.indexOf(c) : 100 + Number(c));
      l = [...l].sort((a, b) => peso(a.codigo) - peso(b.codigo));
    }
    return l;
  }, [filtro.colecao, filtro.cor, filtro.ordem, busca]);

  const coresDisponiveis = useMemo(
    () => (Object.keys(CORES) as CorId[]).filter((c) => PRODUTOS.some((p) => p.cor === c && (!filtro.colecao || p.colecao === filtro.colecao))),
    [filtro.colecao],
  );
  const ativos = (filtro.colecao ? 1 : 0) + (filtro.cor ? 1 : 0) + (filtro.busca ? 1 : 0);

  return (
    <section id="catalogo" className="scroll-mt-16 bg-l-preto px-3 py-20 sm:px-6 sm:py-28">
      <TituloSecao selo="Catálogo completo" titulo="Escolha a sua" destaque="estampa">
        {PRODUTOS.length} modelos exclusivos. Todas por R$ 49,90, nos tamanhos P, M, G e GG.
      </TituloSecao>

      {/* barra de filtros */}
      <div className="sticky top-16 z-30 mx-auto mb-8 max-w-7xl sm:top-20">
        <div className="rounded-2xl border border-l-tinta/10 bg-l-carvao/90 p-3 shadow-2xl backdrop-blur-md">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Buscar estampa</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-l-areia" />
              <input
                type="search"
                value={filtro.busca}
                onChange={(e) => definirFiltro({ busca: e.target.value })}
                placeholder="Busque por nome ou código (ex.: 64, trator, cavalo)"
                className="h-12 w-full rounded-xl border border-l-tinta/10 bg-l-preto pl-11 pr-3 text-base text-l-creme placeholder:text-l-areia/60 focus:border-l-vermelho focus:outline-none"
              />
            </label>
            <button
              onClick={() => setVerFiltros((v) => !v)}
              aria-expanded={verFiltros}
              className="relative flex h-12 items-center gap-2 rounded-xl border border-l-tinta/10 px-3 font-bold sm:px-4 lg:hidden"
            >
              <SlidersHorizontal className="size-5" /> <span className="hidden sm:inline">Filtros</span>
              {ativos > 0 && <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-l-vermelho text-xs text-white">{ativos}</span>}
            </button>
            <select
              value={filtro.ordem}
              onChange={(e) => definirFiltro({ ordem: e.target.value as Filtro["ordem"] })}
              aria-label="Ordenar"
              className="hidden h-12 rounded-xl border border-l-tinta/10 bg-l-preto px-3 font-semibold text-l-creme sm:block"
            >
              <option value="destaque">Destaques</option>
              <option value="codigo">Por código</option>
              <option value="nome">Por nome (A–Z)</option>
            </select>
          </div>

          <div className={`${verFiltros ? "block" : "hidden"} lg:block`}>
            <div className="sem-barra -mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1" role="group" aria-label="Coleções">
              <Chip ativo={!filtro.colecao} onClick={() => definirFiltro({ colecao: null, cor: null })}>
                Todas
              </Chip>
              {COLECOES.map((c) => (
                <Chip key={c.id} ativo={filtro.colecao === c.id} onClick={() => definirFiltro({ colecao: filtro.colecao === c.id ? null : c.id, cor: null })}>
                  {c.nome}
                </Chip>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Cor predominante">
              <span className="mr-1 text-xs font-bold uppercase tracking-widest text-l-areia">Cor:</span>
              {coresDisponiveis.map((c) => (
                <button
                  key={c}
                  onClick={() => definirFiltro({ cor: filtro.cor === c ? null : c })}
                  aria-pressed={filtro.cor === c}
                  title={CORES[c].nome}
                  className={`flex h-9 items-center gap-1.5 rounded-full border pl-1.5 pr-3 text-xs font-bold transition ${
                    filtro.cor === c ? "border-l-creme bg-l-creme text-l-preto" : "border-l-tinta/15 hover:border-l-tinta/40"
                  }`}
                >
                  <span className="size-5 rounded-full border border-black/20" style={{ background: CORES[c].hex }} />
                  {CORES[c].nome}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between px-1 text-sm text-l-areia">
          <span aria-live="polite">
            {lista.length} estampa{lista.length === 1 ? "" : "s"}
          </span>
          {ativos > 0 && (
            <button onClick={() => definirFiltro({ colecao: null, cor: null, busca: "" })} className="flex items-center gap-1 font-semibold text-l-creme hover:text-l-vermelho">
              <X className="size-4" /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      <LayoutGroup>
        <motion.div layout className="mx-auto grid max-w-7xl grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {lista.slice(0, limite).map((p, i) => (
              <CardProduto key={p.codigo} produto={p} indice={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {lista.length === 0 && (
        <div className="mx-auto max-w-md py-16 text-center">
          <p className="font-display text-3xl uppercase">Nenhuma estampa encontrada</p>
          <p className="mt-2 text-l-areia">Tente outro nome ou código, ou limpe os filtros.</p>
        </div>
      )}

      {lista.length > limite && (
        <div className="mt-12 text-center">
          <button
            onClick={() => setLimite((l) => l + POR_PAGINA)}
            className="inline-flex min-h-14 items-center gap-2 rounded-xl border-2 border-l-creme/80 px-8 font-bold uppercase tracking-wider transition hover:bg-l-creme hover:text-l-preto"
          >
            Ver mais estampas ({lista.length - limite})
          </button>
        </div>
      )}
    </section>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={ativo}
      className={`relative isolate h-10 shrink-0 rounded-full px-4 text-sm font-bold uppercase tracking-wide transition ${
        ativo ? "text-white" : "border border-l-tinta/15 text-l-creme/85 hover:border-l-tinta/40"
      }`}
    >
      {ativo && <motion.span layoutId="chip-ativo" className="absolute inset-0 -z-10 rounded-full bg-l-vermelho" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
      {children}
    </button>
  );
}

"use client";

import { useSyncExternalStore } from "react";
import type { ColecaoId, CorId } from "./tipos";

/** Filtro do catálogo compartilhado entre seções (ex.: clicar numa coleção filtra a vitrine). */
export interface Filtro {
  colecao: ColecaoId | null;
  cor: CorId | null;
  busca: string;
  ordem: "destaque" | "codigo" | "nome";
}

let estado: Filtro = { colecao: null, cor: null, busca: "", ordem: "destaque" };
const ouvintes = new Set<() => void>();

export function definirFiltro(mudanca: Partial<Filtro>) {
  estado = { ...estado, ...mudanca };
  ouvintes.forEach((f) => f());
}

export function useFiltro(): Filtro {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => estado,
    () => estado,
  );
}

/** Filtra pela coleção e rola até a vitrine. */
export function irParaColecao(colecao: ColecaoId | null) {
  definirFiltro({ colecao, cor: null, busca: "" });
  document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

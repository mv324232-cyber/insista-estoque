"use client";

import { useSyncExternalStore } from "react";

/** Qual produto está aberto na "compra rápida" (janela de escolher tamanho). */
let codigo: string | null = null;
const ouvintes = new Set<() => void>();

export function abrirCompra(c: string | null) {
  codigo = c;
  ouvintes.forEach((f) => f());
}

export function useCompraAberta() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => codigo,
    () => null,
  );
}

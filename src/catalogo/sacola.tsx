"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ItemSacola } from "./tipos";

const CHAVE = "insista:sacola";

interface EstadoSacola {
  itens: ItemSacola[];
  aberta: boolean;
  abrir: () => void;
  fechar: () => void;
  adicionar: (item: ItemSacola) => void;
  alterar: (codigo: string, tamanho: string, quantidade: number) => void;
  remover: (codigo: string, tamanho: string) => void;
  limpar: () => void;
  totalPecas: number;
  /** contador que muda a cada adição (para animar o ícone) */
  pulso: number;
}

const Ctx = createContext<EstadoSacola | null>(null);

export function useSacola() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSacola fora do ProvedorSacola");
  return c;
}

export function ProvedorSacola({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemSacola[]>([]);
  const [aberta, setAberta] = useState(false);
  const [pulso, setPulso] = useState(0);
  const [carregada, setCarregada] = useState(false);

  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
      if (Array.isArray(salvo)) setItens(salvo);
    } catch {}
    setCarregada(true);
  }, []);

  useEffect(() => {
    if (carregada) localStorage.setItem(CHAVE, JSON.stringify(itens));
  }, [itens, carregada]);

  const adicionar = useCallback((novo: ItemSacola) => {
    setItens((l) => {
      const i = l.findIndex((x) => x.codigo === novo.codigo && x.tamanho === novo.tamanho);
      if (i === -1) return [...l, novo];
      const c = [...l];
      c[i] = { ...c[i], quantidade: Math.min(99, c[i].quantidade + novo.quantidade) };
      return c;
    });
    setPulso((p) => p + 1);
  }, []);

  const alterar = useCallback((codigo: string, tamanho: string, quantidade: number) => {
    setItens((l) =>
      l
        .map((x) => (x.codigo === codigo && x.tamanho === tamanho ? { ...x, quantidade: Math.min(99, quantidade) } : x))
        .filter((x) => x.quantidade > 0),
    );
  }, []);

  const remover = useCallback((codigo: string, tamanho: string) => {
    setItens((l) => l.filter((x) => !(x.codigo === codigo && x.tamanho === tamanho)));
  }, []);

  const valor = useMemo<EstadoSacola>(
    () => ({
      itens,
      aberta,
      abrir: () => setAberta(true),
      fechar: () => setAberta(false),
      adicionar,
      alterar,
      remover,
      limpar: () => setItens([]),
      totalPecas: itens.reduce((s, i) => s + i.quantidade, 0),
      pulso,
    }),
    [itens, aberta, adicionar, alterar, remover, pulso],
  );

  return <Ctx value={valor}>{children}</Ctx>;
}

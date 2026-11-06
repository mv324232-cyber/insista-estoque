"use client";

import type { FormaPagamento, Tamanho } from "../tipos";
import { gravar, ler } from "./armazenamento";

/**
 * Fila de baixas guardadas no aparelho. Toda baixa entra primeiro aqui e
 * depois é enviada ao servidor (imediatamente se houver internet).
 * O client_id garante que reenvios nunca dupliquem a venda.
 */
export interface BaixaPendente {
  client_id: string;
  produto_id: string;
  produto_nome: string;
  sku: string;
  tamanho: Tamanho;
  quantidade: number;
  valor_unitario: number;
  forma_pagamento: FormaPagamento;
  observacao: string | null;
  vendida_em: string;
  estado: "pendente" | "rejeitada";
  erro?: string;
  tentativas: number;
}

const chave = (usuarioId: string) => `insista:fila:${usuarioId}`;
const VAZIA: BaixaPendente[] = [];

const ouvintes = new Set<() => void>();
const cache = new Map<string, BaixaPendente[]>();

function notificar() {
  ouvintes.forEach((f) => f());
}

if (typeof window !== "undefined") {
  // outra aba alterou a fila
  window.addEventListener("storage", (e) => {
    if (e.key?.startsWith("insista:fila:")) {
      cache.clear();
      notificar();
    }
  });
}

export function lerFila(usuarioId: string | null | undefined): BaixaPendente[] {
  if (!usuarioId) return VAZIA;
  let f = cache.get(usuarioId);
  if (!f) {
    f = ler<BaixaPendente[]>(chave(usuarioId), []);
    cache.set(usuarioId, f);
  }
  return f;
}

function salvar(usuarioId: string, fila: BaixaPendente[]) {
  cache.set(usuarioId, fila);
  gravar(chave(usuarioId), fila);
  notificar();
}

export function adicionarNaFila(usuarioId: string, baixa: BaixaPendente) {
  salvar(usuarioId, [...lerFila(usuarioId), baixa]);
}

export function removerDaFila(usuarioId: string, clientId: string) {
  salvar(
    usuarioId,
    lerFila(usuarioId).filter((b) => b.client_id !== clientId),
  );
}

export function atualizarNaFila(usuarioId: string, clientId: string, mudanca: Partial<BaixaPendente>) {
  salvar(
    usuarioId,
    lerFila(usuarioId).map((b) => (b.client_id === clientId ? { ...b, ...mudanca } : b)),
  );
}

export function assinarFila(f: () => void) {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}

"use client";

import { supabase } from "../supabase";
import { atualizarNaFila, lerFila, removerDaFila } from "./fila";

export type ResultadoSync = { enviadas: number; rejeitadas: number; semConexao: boolean };

type Ouvinte = (r: ResultadoSync) => void;
const ouvintes = new Set<Ouvinte>();
export function aoSincronizar(f: Ouvinte) {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}

let ultimaFalhaDeRede = false;
export const houveFalhaDeRede = () => ultimaFalhaDeRede;

let emAndamento: Promise<ResultadoSync> | null = null;

/**
 * Erros definitivos (regra de negócio: estoque insuficiente, produto
 * desativado...) marcam a baixa como "rejeitada" para o vendedor resolver.
 * Falhas de rede/sessão mantêm a baixa pendente para nova tentativa.
 */
function erroDefinitivo(erro: { code?: string; message?: string; status?: number } | null): boolean {
  if (!erro) return false;
  const code = erro.code ?? "";
  if (code === "P0001") return true; // raise exception das funções
  if (code.startsWith("22") || code.startsWith("23")) return true; // dados inválidos
  return false;
}

async function executar(usuarioId: string): Promise<ResultadoSync> {
  const resultado: ResultadoSync = { enviadas: 0, rejeitadas: 0, semConexao: false };
  const pendentes = lerFila(usuarioId).filter((b) => b.estado === "pendente");
  if (pendentes.length === 0) {
    ultimaFalhaDeRede = false;
    return resultado;
  }

  const sb = supabase();
  const { data: sessao } = await sb.auth.getSession();
  if (!sessao.session) {
    resultado.semConexao = true;
    ultimaFalhaDeRede = true;
    return resultado;
  }

  for (const b of pendentes) {
    let res;
    try {
      res = await sb.rpc("registrar_venda", {
        p_client_id: b.client_id,
        p_produto_id: b.produto_id,
        p_tamanho: b.tamanho,
        p_quantidade: b.quantidade,
        p_valor_unitario: b.valor_unitario,
        p_forma_pagamento: b.forma_pagamento,
        p_observacao: b.observacao,
        p_vendida_em: b.vendida_em,
      });
    } catch {
      resultado.semConexao = true;
      break;
    }
    if (!res.error) {
      removerDaFila(usuarioId, b.client_id);
      resultado.enviadas++;
    } else if (erroDefinitivo(res.error)) {
      atualizarNaFila(usuarioId, b.client_id, {
        estado: "rejeitada",
        erro: res.error.message,
        tentativas: b.tentativas + 1,
      });
      resultado.rejeitadas++;
    } else {
      // rede caiu, sessão expirou ou servidor indisponível: tenta depois
      atualizarNaFila(usuarioId, b.client_id, { tentativas: b.tentativas + 1 });
      resultado.semConexao = true;
      break;
    }
  }

  ultimaFalhaDeRede = resultado.semConexao;
  ouvintes.forEach((f) => f(resultado));
  return resultado;
}

/** Envia as baixas pendentes. Chamadas simultâneas reaproveitam a mesma execução. */
export function sincronizar(usuarioId: string): Promise<ResultadoSync> {
  if (!emAndamento) {
    const run = async () => {
      // evita duas abas enviando ao mesmo tempo
      if (typeof navigator !== "undefined" && "locks" in navigator) {
        return navigator.locks.request(`insista-sync-${usuarioId}`, () => executar(usuarioId));
      }
      return executar(usuarioId);
    };
    emAndamento = run().finally(() => {
      emAndamento = null;
    });
  }
  return emAndamento;
}

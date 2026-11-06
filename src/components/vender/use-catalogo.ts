"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { baixarCatalogo, catalogoSalvo, type CatalogoSalvo } from "@/lib/offline/catalogo";
import { aoSincronizar } from "@/lib/offline/sincronizar";
import { supabase } from "@/lib/supabase";
import { TAMANHOS, type ProdutoComEstoque, type Tamanho } from "@/lib/tipos";
import { useFila } from "../conexao";

/**
 * Catálogo do vendedor: abre na hora com o que está guardado no aparelho,
 * atualiza pela internet e fica ao vivo (Realtime) enquanto houver conexão.
 * O estoque exibido já desconta as baixas que ainda estão na fila.
 */
export function useCatalogo(usuarioId: string | undefined) {
  const [catalogo, setCatalogo] = useState<CatalogoSalvo>({ atualizadoEm: null, produtos: [] });
  const [carregando, setCarregando] = useState(true);
  const fila = useFila(usuarioId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const atualizar = useCallback(async () => {
    try {
      setCatalogo(await baixarCatalogo());
    } catch {
      // sem conexão: segue com o catálogo guardado
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const salvo = catalogoSalvo();
    if (salvo.produtos.length) {
      setCatalogo(salvo);
      setCarregando(false);
    }
    atualizar();

    const agendar = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(atualizar, 400);
    };
    const canal = supabase()
      .channel("vendedor-estoque")
      .on("postgres_changes", { event: "*", schema: "public", table: "estoque" }, agendar)
      .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, agendar)
      .subscribe();
    const parar = aoSincronizar((r) => {
      if (r.enviadas || r.rejeitadas) agendar();
    });
    window.addEventListener("online", agendar);
    return () => {
      supabase().removeChannel(canal);
      parar();
      window.removeEventListener("online", agendar);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [atualizar]);

  const produtos: ProdutoComEstoque[] = useMemo(() => {
    const reservado = new Map<string, number>();
    for (const b of fila) {
      if (b.estado !== "pendente") continue;
      const k = `${b.produto_id}:${b.tamanho}`;
      reservado.set(k, (reservado.get(k) ?? 0) + b.quantidade);
    }
    return catalogo.produtos.map((p) => {
      const estoque = { ...p.estoque };
      for (const t of TAMANHOS) estoque[t as Tamanho] = Math.max(0, estoque[t] - (reservado.get(`${p.id}:${t}`) ?? 0));
      return { ...p, estoque };
    });
  }, [catalogo, fila]);

  return { produtos, atualizadoEm: catalogo.atualizadoEm, carregando, atualizar };
}

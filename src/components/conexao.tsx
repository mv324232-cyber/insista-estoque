"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { assinarFila, lerFila, type BaixaPendente } from "@/lib/offline/fila";
import { aoSincronizar, houveFalhaDeRede, sincronizar } from "@/lib/offline/sincronizar";

function assinarOnline(f: () => void) {
  window.addEventListener("online", f);
  window.addEventListener("offline", f);
  return () => {
    window.removeEventListener("online", f);
    window.removeEventListener("offline", f);
  };
}

/** Estado da conexão: considera o navegador E a última tentativa de envio. */
export function useOnline(): boolean {
  const navegador = useSyncExternalStore(
    assinarOnline,
    () => navigator.onLine,
    () => true,
  );
  const [falhou, setFalhou] = useState(false);
  useEffect(() => aoSincronizar((r) => setFalhou(r.semConexao)), []);
  useEffect(() => {
    setFalhou(houveFalhaDeRede());
  }, []);
  return navegador && !falhou;
}

const VAZIA: BaixaPendente[] = [];

export function useFila(usuarioId: string | null | undefined): BaixaPendente[] {
  return useSyncExternalStore(
    assinarFila,
    () => lerFila(usuarioId),
    () => VAZIA,
  );
}

/**
 * Mantém a fila sendo enviada: ao abrir, ao voltar a conexão, ao voltar
 * para o app e a cada 20 s enquanto houver pendências.
 */
export function useSincronizacaoAutomatica(usuarioId: string | null | undefined) {
  const fila = useFila(usuarioId);
  const temPendente = fila.some((b) => b.estado === "pendente");

  const enviar = useCallback(() => {
    if (usuarioId) return sincronizar(usuarioId);
  }, [usuarioId]);

  useEffect(() => {
    if (!usuarioId) return;
    enviar();
    const aoVoltar = () => enviar();
    const aoVisivel = () => {
      if (document.visibilityState === "visible") enviar();
    };
    window.addEventListener("online", aoVoltar);
    document.addEventListener("visibilitychange", aoVisivel);
    return () => {
      window.removeEventListener("online", aoVoltar);
      document.removeEventListener("visibilitychange", aoVisivel);
    };
  }, [usuarioId, enviar]);

  useEffect(() => {
    if (!temPendente) return;
    const t = setInterval(enviar, 20000);
    return () => clearInterval(t);
  }, [temPendente, enviar]);

  return enviar;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { gravar, ler, remover } from "@/lib/offline/armazenamento";
import type { Papel, Perfil } from "@/lib/tipos";
import { Carregando } from "./ui";

const CHAVE_PERFIL = "insista:perfil";

interface EstadoAuth {
  carregando: boolean;
  perfil: Perfil | null;
  /** true quando a sessão não pôde ser confirmada por falta de internet */
  semConfirmacao: boolean;
  sair: () => Promise<void>;
  recarregar: () => Promise<void>;
}

const Ctx = createContext<EstadoAuth>({
  carregando: true,
  perfil: null,
  semConfirmacao: false,
  sair: async () => {},
  recarregar: async () => {},
});

export const useAuth = () => useContext(Ctx);

export function inicioDoPapel(papel: Papel) {
  return papel === "admin" ? "/admin" : "/vender";
}

export function ProvedorAuth({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [semConfirmacao, setSemConfirmacao] = useState(false);

  const carregar = useCallback(async () => {
    const sb = supabase();
    const salvo = ler<Perfil | null>(CHAVE_PERFIL, null);
    let sessaoId: string | null = null;
    let falhaRede = false;
    try {
      const { data, error } = await sb.auth.getSession();
      sessaoId = data.session?.user.id ?? null;
      if (error) falhaRede = true;
    } catch {
      falhaRede = true;
    }

    if (!sessaoId) {
      // Sem internet e com sessão anterior neste aparelho: segue em modo offline.
      if (salvo && (falhaRede || !navigator.onLine)) {
        setPerfil(salvo);
        setSemConfirmacao(true);
      } else {
        remover(CHAVE_PERFIL);
        setPerfil(null);
      }
      setCarregando(false);
      return;
    }

    const { data, error } = await sb.from("perfis").select("*").eq("id", sessaoId).maybeSingle();
    if (data) {
      const p = { ...(data as Perfil), comissao_percentual: Number(data.comissao_percentual) };
      if (!p.ativo) {
        await sb.auth.signOut();
        remover(CHAVE_PERFIL);
        setPerfil(null);
      } else {
        gravar(CHAVE_PERFIL, p);
        setPerfil(p);
        setSemConfirmacao(false);
      }
    } else if (error && salvo?.id === sessaoId) {
      // provavelmente sem conexão: usa o perfil guardado
      setPerfil(salvo);
      setSemConfirmacao(true);
    } else {
      setPerfil(null);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
    const { data } = supabase().auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") {
        remover(CHAVE_PERFIL);
        setPerfil(null);
      }
      if (evento === "SIGNED_IN") {
        // adia para fora do callback (recomendação do supabase-js)
        setTimeout(carregar, 0);
      }
    });
    const aoVoltar = () => {
      if (semConfirmacaoRef.atual) carregar();
    };
    window.addEventListener("online", aoVoltar);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("online", aoVoltar);
    };
  }, [carregar]);

  useEffect(() => {
    semConfirmacaoRef.atual = semConfirmacao;
  }, [semConfirmacao]);

  const sair = useCallback(async () => {
    await supabase().auth.signOut({ scope: "local" });
    remover(CHAVE_PERFIL);
    setPerfil(null);
  }, []);

  return <Ctx value={{ carregando, perfil, semConfirmacao, sair, recarregar: carregar }}>{children}</Ctx>;
}

const semConfirmacaoRef = { atual: false };

/** Só renderiza o conteúdo para usuários logados com o papel permitido. */
export function Protegido({ papeis, children }: { papeis: Papel[]; children: ReactNode }) {
  const { carregando, perfil } = useAuth();
  const router = useRouter();
  const permitido = !!perfil && papeis.includes(perfil.papel);

  useEffect(() => {
    if (carregando) return;
    if (!perfil) router.replace("/login");
    else if (!papeis.includes(perfil.papel)) router.replace(inicioDoPapel(perfil.papel));
  }, [carregando, perfil, papeis, router]);

  if (carregando || !permitido) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Carregando />
      </div>
    );
  }
  return <>{children}</>;
}

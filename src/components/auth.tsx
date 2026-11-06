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

    // Abre NA HORA com o perfil guardado no aparelho (essencial sem sinal);
    // a confirmação com o servidor acontece logo abaixo, sem travar a tela.
    if (salvo) {
      setPerfil(salvo);
      setCarregando(false);
    }

    let sessaoId: string | null = null;
    let falhaRede = !navigator.onLine;
    if (!falhaRede) {
      try {
        const r = await comLimite(sb.auth.getSession(), 5000);
        if (!r) falhaRede = true;
        else {
          sessaoId = r.data.session?.user.id ?? null;
          if (r.error) falhaRede = true;
        }
      } catch {
        falhaRede = true;
      }
    }

    if (falhaRede) {
      // Sem internet: segue com o que está no aparelho (ou pede login, se não houver)
      setPerfil(salvo);
      setSemConfirmacao(!!salvo);
      setCarregando(false);
      return;
    }

    if (!sessaoId) {
      remover(CHAVE_PERFIL);
      setPerfil(null);
      setSemConfirmacao(false);
      setCarregando(false);
      return;
    }

    const r = await comLimite(sb.from("perfis").select("*").eq("id", sessaoId).maybeSingle(), 6000);
    if (r?.data) {
      const p = { ...(r.data as Perfil), comissao_percentual: Number(r.data.comissao_percentual) };
      if (!p.ativo) {
        await sb.auth.signOut({ scope: "local" });
        remover(CHAVE_PERFIL);
        setPerfil(null);
      } else {
        gravar(CHAVE_PERFIL, p);
        setPerfil(p);
        setSemConfirmacao(false);
      }
    } else if (salvo?.id === sessaoId) {
      // sinal fraco/sem resposta: mantém o perfil guardado
      setPerfil(salvo);
      setSemConfirmacao(true);
    } else if (r && !r.error) {
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

/** Resolve com o resultado, ou null se demorar mais que `ms` (sinal ruim). */
function comLimite<T>(promessa: PromiseLike<T>, ms: number): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promessa),
    new Promise<null>((r) => setTimeout(() => r(null), ms)),
  ]);
}

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

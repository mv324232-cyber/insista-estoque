"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dataISO } from "@/lib/formato";
import { hoje, mes, semana } from "@/lib/periodos";
import { FORMAS_PAGAMENTO, ROTULO_FORMA, type FormaPagamento } from "@/lib/tipos";
import { Campo, Rotulo, Selecao, cx } from "./ui";

export interface Filtros {
  de: string;
  ate: string;
  vendedor: string;
  produto: string;
  forma: FormaPagamento | "";
  status: "" | "ativa" | "cancelada";
}

export function filtrosIniciais(): Filtros {
  const { inicio, fim } = mes();
  return { de: dataISO(inicio), ate: dataISO(new Date(fim.getTime() - 864e5)), vendedor: "", produto: "", forma: "", status: "" };
}

export interface Opcoes {
  vendedores: { id: string; nome: string }[];
  produtos: { id: string; nome: string; sku: string; cor: string }[];
}

export function useOpcoesFiltro(): Opcoes {
  const [o, setO] = useState<Opcoes>({ vendedores: [], produtos: [] });
  useEffect(() => {
    const sb = supabase();
    Promise.all([
      sb.from("perfis").select("id, nome").order("nome"),
      sb.from("produtos").select("id, nome, sku, cor").order("nome"),
    ]).then(([v, p]) => setO({ vendedores: v.data ?? [], produtos: p.data ?? [] }));
  }, []);
  return o;
}

const ATALHOS = [
  { rotulo: "Hoje", f: hoje },
  { rotulo: "Semana", f: semana },
  { rotulo: "Mês", f: () => mes() },
  {
    rotulo: "Mês passado",
    f: () => {
      const d = new Date();
      return mes(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    },
  },
];

/** Filtros em uma faixa acima dos resultados: período (com atalhos) + dimensões. */
export function FiltrosVendas({
  filtros,
  aoMudar,
  opcoes,
  comStatus,
  comProdutoEForma = true,
}: {
  filtros: Filtros;
  aoMudar: (f: Filtros) => void;
  opcoes: Opcoes;
  comStatus?: boolean;
  comProdutoEForma?: boolean;
}) {
  const mudar = (p: Partial<Filtros>) => aoMudar({ ...filtros, ...p });
  return (
    <div className="mb-4 rounded-tema-g border border-borda bg-superficie p-3">
      <div className="mb-3 flex flex-wrap gap-2">
        {ATALHOS.map((a) => {
          const { inicio, fim } = a.f();
          const de = dataISO(inicio);
          const ate = dataISO(new Date(fim.getTime() - 864e5));
          const ativo = filtros.de === de && filtros.ate === ate;
          return (
            <button
              key={a.rotulo}
              type="button"
              onClick={() => mudar({ de, ate })}
              className={cx(
                "min-h-10 rounded-full border-2 px-4 text-sm font-bold",
                ativo ? "border-primaria bg-primaria text-primaria-texto" : "border-borda",
              )}
            >
              {a.rotulo}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <div>
          <Rotulo htmlFor="f-de">De</Rotulo>
          <Campo id="f-de" type="date" value={filtros.de} onChange={(e) => e.target.value && mudar({ de: e.target.value })} />
        </div>
        <div>
          <Rotulo htmlFor="f-ate">Até</Rotulo>
          <Campo id="f-ate" type="date" value={filtros.ate} onChange={(e) => e.target.value && mudar({ ate: e.target.value })} />
        </div>
        <div>
          <Rotulo htmlFor="f-vend">Vendedor</Rotulo>
          <Selecao id="f-vend" value={filtros.vendedor} onChange={(e) => mudar({ vendedor: e.target.value })}>
            <option value="">Todos</option>
            {opcoes.vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </Selecao>
        </div>
        {comProdutoEForma && (
          <>
            <div>
              <Rotulo htmlFor="f-prod">Produto</Rotulo>
              <Selecao id="f-prod" value={filtros.produto} onChange={(e) => mudar({ produto: e.target.value })}>
                <option value="">Todos</option>
                {opcoes.produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} · {p.cor}
                  </option>
                ))}
              </Selecao>
            </div>
            <div>
              <Rotulo htmlFor="f-forma">Pagamento</Rotulo>
              <Selecao id="f-forma" value={filtros.forma} onChange={(e) => mudar({ forma: e.target.value as FormaPagamento | "" })}>
                <option value="">Todos</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>
                    {ROTULO_FORMA[f]}
                  </option>
                ))}
              </Selecao>
            </div>
          </>
        )}
        {comStatus && (
          <div>
            <Rotulo htmlFor="f-status">Situação</Rotulo>
            <Selecao id="f-status" value={filtros.status} onChange={(e) => mudar({ status: e.target.value as Filtros["status"] })}>
              <option value="">Todas</option>
              <option value="ativa">Ativas</option>
              <option value="cancelada">Canceladas</option>
            </Selecao>
          </div>
        )}
      </div>
    </div>
  );
}

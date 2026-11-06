"use client";

import { useCallback, useEffect, useState } from "react";
import { useAviso } from "@/components/avisos";
import { Botao, Carregando, Selecao, Selo, Titulo, Vazio } from "@/components/ui";
import { mensagemErro } from "@/lib/erros";
import { dataHora, moeda } from "@/lib/formato";
import { supabase } from "@/lib/supabase";

interface Registro {
  id: number;
  tabela: string;
  registro_id: string;
  acao: "INSERT" | "UPDATE";
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  alteracoes: Record<string, { de: unknown; para: unknown }> | null;
  motivo: string | null;
  created_at: string;
  autor: { nome: string } | null;
}

const TABELAS: Record<string, string> = {
  vendas: "Venda",
  produtos: "Produto",
  perfis: "Usuário",
  movimentacoes_estoque: "Estoque",
};

const CAMPOS: Record<string, string> = {
  status: "situação",
  valor_unitario: "valor unitário",
  valor_total: "valor total",
  forma_pagamento: "pagamento",
  observacao: "observação",
  preco: "preço",
  estoque_minimo: "alerta de estoque",
  ativo: "ativo",
  nome: "nome",
  sku: "SKU",
  cor: "cor",
  foto_url: "foto",
  comissao_percentual: "comissão %",
  telefone: "telefone",
  papel: "papel",
  motivo_cancelamento: "motivo do cancelamento",
  cancelada_em: "cancelada em",
  cancelada_por: "cancelada por",
};

const IGNORAR = new Set(["cancelada_em", "cancelada_por", "updated_at"]);

function valorLegivel(campo: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (["valor_unitario", "valor_total", "preco", "preco_tabela"].includes(campo)) return moeda(v as number);
  if (campo === "foto_url") return "nova foto";
  return String(v);
}

function resumoInsercao(r: Registro): string {
  const d = r.depois ?? {};
  if (r.tabela === "vendas")
    return `Baixa de ${d.quantidade}× tam. ${d.tamanho} — ${moeda(d.valor_total as number)} (${d.forma_pagamento})`;
  if (r.tabela === "produtos") return `Produto criado: ${d.nome} (${d.sku}) — ${moeda(d.preco as number)}`;
  if (r.tabela === "perfis") return `Usuário criado: ${d.nome} (${d.usuario}, ${d.papel})`;
  if (r.tabela === "movimentacoes_estoque") {
    const q = Number(d.quantidade);
    const tipo = { entrada: "Entrada", ajuste: "Ajuste", venda: "Saída por venda", cancelamento_venda: "Devolução (venda cancelada)" }[
      d.tipo as string
    ];
    return `${tipo}: ${q > 0 ? "+" : ""}${q} un. tam. ${d.tamanho} → saldo ${d.saldo_apos}`;
  }
  return "Registro criado";
}

const POR_PAGINA = 50;

export default function Auditoria() {
  const avisar = useAviso();
  const [tabela, setTabela] = useState("");
  const [itens, setItens] = useState<Registro[] | null>(null);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [fim, setFim] = useState(false);

  const carregar = useCallback(
    async (depoisDe?: number) => {
      let q = supabase()
        .from("auditoria")
        .select("*, autor:perfis!auditoria_usuario_id_fkey(nome)")
        .order("id", { ascending: false })
        .limit(POR_PAGINA);
      if (tabela) q = q.eq("tabela", tabela);
      if (depoisDe) q = q.lt("id", depoisDe);
      const { data, error } = await q;
      if (error) return avisar(mensagemErro(error), "erro");
      setFim((data?.length ?? 0) < POR_PAGINA);
      setItens((a) => (depoisDe ? [...(a ?? []), ...(data as Registro[])] : (data as Registro[])));
    },
    [tabela, avisar],
  );

  useEffect(() => {
    setItens(null);
    carregar();
  }, [carregar]);

  // nomes de produtos para descrever movimentações/vendas
  useEffect(() => {
    supabase()
      .from("produtos")
      .select("id, nome")
      .then(({ data }) => setNomes(Object.fromEntries((data ?? []).map((p) => [p.id, p.nome]))));
  }, []);

  return (
    <>
      <Titulo>Auditoria</Titulo>
      <p className="-mt-2 mb-4 text-suave">
        Tudo o que foi feito no sistema: quem fez, quando e o que mudou. Nada é apagado.
      </p>
      <Selecao value={tabela} onChange={(e) => setTabela(e.target.value)} className="mb-4 sm:w-64" aria-label="Filtrar por tipo">
        <option value="">Tudo</option>
        {Object.entries(TABELAS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </Selecao>

      {!itens ? (
        <Carregando />
      ) : itens.length === 0 ? (
        <Vazio titulo="Nenhum registro" />
      ) : (
        <ul className="divide-y divide-borda rounded-tema-g border border-borda bg-superficie">
          {itens.map((r) => {
            const produtoId = (r.depois?.produto_id as string) ?? null;
            const alteracoes = Object.entries(r.alteracoes ?? {}).filter(([k]) => !IGNORAR.has(k));
            return (
              <li key={r.id} className="px-3 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Selo tom={r.acao === "INSERT" ? "sucesso" : "alerta"}>{r.acao === "INSERT" ? "Criação" : "Alteração"}</Selo>
                  <Selo>{TABELAS[r.tabela] ?? r.tabela}</Selo>
                  <span className="font-semibold">{r.autor?.nome ?? "Sistema"}</span>
                  <span className="text-suave">{dataHora(r.created_at)}</span>
                </div>
                <p className="mt-1">
                  {produtoId && nomes[produtoId] && <strong>{nomes[produtoId]} · </strong>}
                  {r.tabela === "produtos" && r.acao === "UPDATE" && <strong>{String(r.depois?.nome)} · </strong>}
                  {r.tabela === "perfis" && r.acao === "UPDATE" && <strong>{String(r.depois?.nome)} · </strong>}
                  {r.acao === "INSERT" ? (
                    resumoInsercao(r)
                  ) : (
                    <span>
                      {alteracoes.map(([campo, { de, para }], i) => (
                        <span key={campo}>
                          {i > 0 && "; "}
                          {CAMPOS[campo] ?? campo}: <s className="text-suave">{valorLegivel(campo, de)}</s> → {valorLegivel(campo, para)}
                        </span>
                      ))}
                    </span>
                  )}
                </p>
                {r.motivo && <p className="text-sm text-suave">Motivo: {r.motivo}</p>}
              </li>
            );
          })}
        </ul>
      )}
      {itens && !fim && (
        <div className="mt-3 text-center">
          <Botao variante="secundario" onClick={() => carregar(itens[itens.length - 1]?.id)}>
            Carregar mais
          </Botao>
        </div>
      )}
    </>
  );
}

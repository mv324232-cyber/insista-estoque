"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { FileDown, FileSpreadsheet, Pencil, Undo2 } from "lucide-react";
import { useAviso } from "@/components/avisos";
import { FiltrosVendas, filtrosIniciais, useOpcoesFiltro, type Filtros } from "@/components/filtros-vendas";
import { AreaTexto, Aviso, Botao, Campo, Carregando, Dialogo, Escolha, Rotulo, Selo, Titulo, Vazio, cx } from "@/components/ui";
import { mensagemErro } from "@/lib/erros";
import { exportarCSV, exportarPDF } from "@/lib/exportar";
import { dataCurta, dataHora, lerValor, moeda, numero } from "@/lib/formato";
import { intervaloDeDatas } from "@/lib/periodos";
import { supabase } from "@/lib/supabase";
import { FORMAS_PAGAMENTO, ROTULO_FORMA, SELECT_VENDA_DETALHADA, type FormaPagamento, type VendaDetalhada } from "@/lib/tipos";

const POR_PAGINA = 50;

function consulta(f: Filtros) {
  const { inicio, fim } = intervaloDeDatas(f.de, f.ate);
  let q = supabase()
    .from("vendas")
    .select(SELECT_VENDA_DETALHADA, { count: "exact" })
    .gte("vendida_em", inicio.toISOString())
    .lt("vendida_em", fim.toISOString())
    .order("vendida_em", { ascending: false });
  if (f.vendedor) q = q.eq("vendedor_id", f.vendedor);
  if (f.produto) q = q.eq("produto_id", f.produto);
  if (f.forma) q = q.eq("forma_pagamento", f.forma);
  if (f.status) q = q.eq("status", f.status);
  return q;
}

/** Busca todas as vendas do filtro (em lotes de 1000) — para exportar. */
async function buscarTodas(f: Filtros): Promise<VendaDetalhada[]> {
  const todas: VendaDetalhada[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await consulta(f).range(de, de + 999);
    if (error) throw error;
    todas.push(...(data as VendaDetalhada[]));
    if (!data || data.length < 1000) break;
  }
  return todas;
}

export default function PaginaVendas() {
  return (
    <Suspense fallback={<Carregando />}>
      <Vendas />
    </Suspense>
  );
}

function Vendas() {
  const avisar = useAviso();
  const params = useSearchParams();
  const opcoes = useOpcoesFiltro();
  const [filtros, setFiltros] = useState<Filtros>(() => ({
    ...filtrosIniciais(),
    forma: (params.get("forma") as FormaPagamento) || "",
    vendedor: params.get("vendedor") ?? "",
  }));
  const [vendas, setVendas] = useState<VendaDetalhada[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [exportando, setExportando] = useState<"csv" | "pdf" | null>(null);
  const [acao, setAcao] = useState<{ tipo: "cancelar" | "alterar"; venda: VendaDetalhada } | null>(null);

  const carregar = useCallback(
    async (pag = 0) => {
      const { data, error, count } = await consulta(filtros).range(pag * POR_PAGINA, pag * POR_PAGINA + POR_PAGINA - 1);
      if (error) return avisar(mensagemErro(error), "erro");
      setTotal(count ?? 0);
      setPagina(pag);
      setVendas((atual) => (pag === 0 ? (data as VendaDetalhada[]) : [...(atual ?? []), ...(data as VendaDetalhada[])]));
    },
    [filtros, avisar],
  );

  useEffect(() => {
    setVendas(null);
    carregar(0);
  }, [carregar]);

  // totais do filtro (via função do banco)
  const [resumo, setResumo] = useState<{ quantidade: number; valor: number; num_vendas: number } | null>(null);
  useEffect(() => {
    const { inicio, fim } = intervaloDeDatas(filtros.de, filtros.ate);
    if (filtros.status === "cancelada") {
      setResumo(null);
      return;
    }
    supabase()
      .rpc("resumo_vendas", {
        p_inicio: inicio.toISOString(),
        p_fim: fim.toISOString(),
        p_vendedor_id: filtros.vendedor || null,
        p_produto_id: filtros.produto || null,
        p_forma: filtros.forma || null,
      })
      .then(({ data }) => setResumo(data));
  }, [filtros, vendas]);

  async function exportar(tipo: "csv" | "pdf") {
    setExportando(tipo);
    try {
      const todas = await buscarTodas(filtros);
      const colunas = ["Data", "Vendedor", "Produto", "SKU", "Tam.", "Qtd", "Preço tabela", "Valor unit.", "Total", "Pagamento", "Status", "Observação"];
      const linhas = todas.map((v) => [
        dataHora(v.vendida_em),
        v.vendedor?.nome ?? "",
        v.produto?.nome ?? "",
        v.produto?.sku ?? "",
        v.tamanho,
        v.quantidade,
        tipo === "csv" ? Number(v.preco_tabela) : moeda(v.preco_tabela),
        tipo === "csv" ? Number(v.valor_unitario) : moeda(v.valor_unitario),
        tipo === "csv" ? Number(v.valor_total) : moeda(v.valor_total),
        ROTULO_FORMA[v.forma_pagamento],
        v.status === "cancelada" ? `Cancelada${v.motivo_cancelamento ? ` (${v.motivo_cancelamento})` : ""}` : "Ativa",
        v.observacao ?? "",
      ]);
      const nome = `vendas_${filtros.de}_a_${filtros.ate}`;
      if (tipo === "csv") exportarCSV(nome, colunas, linhas);
      else {
        const ativas = todas.filter((v) => v.status === "ativa");
        await exportarPDF({
          nome,
          titulo: "Relatório de vendas",
          subtitulo: `${dataCurta(filtros.de)} a ${dataCurta(filtros.ate)}`,
          paisagem: true,
          resumo: [
            ["Vendas ativas", numero(ativas.length)],
            ["Peças", numero(ativas.reduce((s, v) => s + v.quantidade, 0))],
            ["Faturamento", moeda(ativas.reduce((s, v) => s + Number(v.valor_total), 0))],
            ["Fiado", moeda(ativas.filter((v) => v.forma_pagamento === "fiado").reduce((s, v) => s + Number(v.valor_total), 0))],
          ],
          colunas,
          linhas,
          numericas: [5, 6, 7, 8],
        });
      }
    } catch (e) {
      avisar(mensagemErro(e), "erro");
    } finally {
      setExportando(null);
    }
  }

  const temMais = (vendas?.length ?? 0) < total;

  return (
    <>
      <Titulo
        acao={
          <div className="flex gap-2">
            <Botao variante="secundario" onClick={() => exportar("csv")} carregando={exportando === "csv"}>
              <FileSpreadsheet className="size-5" /> CSV
            </Botao>
            <Botao variante="secundario" onClick={() => exportar("pdf")} carregando={exportando === "pdf"}>
              <FileDown className="size-5" /> PDF
            </Botao>
          </div>
        }
      >
        Vendas
      </Titulo>

      <FiltrosVendas filtros={filtros} aoMudar={setFiltros} opcoes={opcoes} comStatus />

      {resumo && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            ["Vendas", numero(resumo.num_vendas)],
            ["Peças", numero(resumo.quantidade)],
            ["Faturamento", moeda(resumo.valor)],
          ].map(([r, v]) => (
            <div key={r} className="rounded-tema border border-borda bg-superficie p-3">
              <p className="text-xs font-semibold uppercase text-suave">{r}</p>
              <p className="num font-marca text-2xl font-bold">{v}</p>
            </div>
          ))}
        </div>
      )}

      {!vendas ? (
        <Carregando />
      ) : vendas.length === 0 ? (
        <Vazio titulo="Nenhuma venda com esses filtros" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-tema-g border border-borda bg-superficie">
            <table className="num w-full min-w-[860px] text-left text-sm">
              <thead className="bg-superficie-2">
                <tr>
                  <th className="px-3 py-2.5">Data</th>
                  <th className="px-3 py-2.5">Vendedor</th>
                  <th className="px-3 py-2.5">Produto</th>
                  <th className="px-2 py-2.5 text-center">Tam.</th>
                  <th className="px-2 py-2.5 text-right">Qtd</th>
                  <th className="px-3 py-2.5 text-right">Total</th>
                  <th className="px-3 py-2.5">Pagamento</th>
                  <th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {vendas.map((v) => {
                  const desconto = Number(v.preco_tabela) * v.quantidade - Number(v.valor_total);
                  return (
                    <tr key={v.id} className={cx("border-t border-borda align-top", v.status === "cancelada" && "opacity-60")}>
                      <td className="whitespace-nowrap px-3 py-2.5">{dataHora(v.vendida_em)}</td>
                      <td className="px-3 py-2.5 font-semibold">{v.vendedor?.nome}</td>
                      <td className="px-3 py-2.5">
                        <span className={cx("font-semibold", v.status === "cancelada" && "line-through")}>{v.produto?.nome}</span>
                        <span className="block text-xs text-suave">
                          {v.produto?.sku}
                          {v.observacao ? ` · ${v.observacao}` : ""}
                        </span>
                        {v.status === "cancelada" && (
                          <span className="block text-xs text-perigo">Cancelada: {v.motivo_cancelamento}</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center font-bold">{v.tamanho}</td>
                      <td className="px-2 py-2.5 text-right">{v.quantidade}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold">
                        {moeda(v.valor_total)}
                        {desconto > 0.009 && <span className="block text-xs font-normal text-alerta">−{moeda(desconto)}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {v.forma_pagamento === "fiado" ? <Selo tom="alerta">Fiado</Selo> : ROTULO_FORMA[v.forma_pagamento]}
                      </td>
                      <td className="px-3 py-2">
                        {v.status === "ativa" && (
                          <div className="flex justify-end gap-1">
                            <Botao tamanho="sm" variante="fantasma" onClick={() => setAcao({ tipo: "alterar", venda: v })} aria-label="Alterar venda">
                              <Pencil className="size-4" />
                            </Botao>
                            <Botao tamanho="sm" variante="fantasma" onClick={() => setAcao({ tipo: "cancelar", venda: v })} aria-label="Cancelar venda">
                              <Undo2 className="size-4" /> Cancelar
                            </Botao>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm text-suave">
            <span>
              Mostrando {vendas.length} de {total}
            </span>
            {temMais && (
              <Botao variante="secundario" onClick={() => carregar(pagina + 1)}>
                Carregar mais
              </Botao>
            )}
          </div>
        </>
      )}

      <Dialogo aberto={!!acao} aoFechar={() => setAcao(null)} titulo={acao?.tipo === "cancelar" ? "Cancelar venda" : "Alterar venda"}>
        {acao && (
          <FormAcao
            tipo={acao.tipo}
            venda={acao.venda}
            aoConcluir={() => {
              setAcao(null);
              carregar(0);
            }}
          />
        )}
      </Dialogo>
    </>
  );
}

function FormAcao({ tipo, venda, aoConcluir }: { tipo: "cancelar" | "alterar"; venda: VendaDetalhada; aoConcluir: () => void }) {
  const avisar = useAviso();
  const [motivo, setMotivo] = useState("");
  const [valor, setValor] = useState(Number(venda.valor_unitario).toFixed(2).replace(".", ","));
  const [forma, setForma] = useState<FormaPagamento>(venda.forma_pagamento);
  const [obs, setObs] = useState(venda.observacao ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const novoTotal = useMemo(() => lerValor(valor) * venda.quantidade, [valor, venda.quantidade]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!motivo.trim()) return setErro("O motivo é obrigatório.");
    setEnviando(true);
    const { error } =
      tipo === "cancelar"
        ? await supabase().rpc("cancelar_venda", { p_venda_id: venda.id, p_motivo: motivo })
        : await supabase().rpc("alterar_venda", {
            p_venda_id: venda.id,
            p_valor_unitario: lerValor(valor),
            p_forma_pagamento: forma,
            p_observacao: obs,
            p_motivo: motivo,
          });
    setEnviando(false);
    if (error) return setErro(mensagemErro(error));
    avisar(tipo === "cancelar" ? "Venda cancelada e estoque devolvido" : "Venda alterada");
    aoConcluir();
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="rounded-tema bg-superficie-2 p-3 text-sm">
        <p className="font-bold">
          {venda.quantidade}× {venda.produto?.nome} · {venda.tamanho} — {moeda(venda.valor_total)}
        </p>
        <p className="text-suave">
          {venda.vendedor?.nome} · {dataHora(venda.vendida_em)} · {ROTULO_FORMA[venda.forma_pagamento]}
        </p>
      </div>
      {tipo === "alterar" && (
        <>
          <div>
            <Rotulo htmlFor="valor">Valor por peça (R$)</Rotulo>
            <Campo id="valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
            <p className="num mt-1 text-sm text-suave">Novo total: {moeda(Number.isFinite(novoTotal) ? novoTotal : 0)}</p>
          </div>
          <div>
            <Rotulo>Pagamento</Rotulo>
            <Escolha nome="Forma de pagamento" opcoes={FORMAS_PAGAMENTO} valor={forma} aoMudar={setForma} colunas={4} rotulo={(f) => ROTULO_FORMA[f]} />
          </div>
          <div>
            <Rotulo htmlFor="obsv">Observação</Rotulo>
            <Campo id="obsv" value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </>
      )}
      {tipo === "cancelar" && <p>As peças voltam para o estoque. A venda continua no histórico, marcada como cancelada.</p>}
      <div>
        <Rotulo htmlFor="motivo">Motivo (obrigatório)</Rotulo>
        <AreaTexto id="motivo" required value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </div>
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      <Botao type="submit" variante={tipo === "cancelar" ? "perigo" : "primario"} tamanho="lg" bloco carregando={enviando}>
        {tipo === "cancelar" ? "Cancelar venda" : "Salvar alteração"}
      </Botao>
    </form>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { useAviso } from "@/components/avisos";
import { FiltrosVendas, filtrosIniciais, useOpcoesFiltro, type Filtros } from "@/components/filtros-vendas";
import { ColunasPorDia } from "@/components/graficos";
import { Botao, Cartao, Carregando, Titulo } from "@/components/ui";
import { mensagemErro } from "@/lib/erros";
import { exportarCSV, exportarPDF, type Celula } from "@/lib/exportar";
import { dataCurta, dataISO, moeda, numero } from "@/lib/formato";
import { intervaloDeDatas } from "@/lib/periodos";
import { supabase } from "@/lib/supabase";
import { ROTULO_FORMA, type Resumo } from "@/lib/tipos";

export default function Relatorios() {
  const avisar = useAviso();
  const opcoes = useOpcoesFiltro();
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [r, setR] = useState<Resumo | null>(null);

  useEffect(() => {
    const { inicio, fim } = intervaloDeDatas(filtros.de, filtros.ate);
    setR(null);
    supabase()
      .rpc("resumo_vendas", {
        p_inicio: inicio.toISOString(),
        p_fim: fim.toISOString(),
        p_vendedor_id: filtros.vendedor || null,
      })
      .then(({ data, error }) => {
        if (error) avisar(mensagemErro(error), "erro");
        else setR(data as Resumo);
      });
  }, [filtros.de, filtros.ate, filtros.vendedor, avisar]);

  // série diária completa (dias sem venda = 0)
  const dias = useMemo(() => {
    if (!r) return [];
    const mapa = new Map(r.por_dia.map((d) => [d.dia, d]));
    const { inicio, fim } = intervaloDeDatas(filtros.de, filtros.ate);
    const out: { chave: string; valor: number; detalhe: string }[] = [];
    for (let d = new Date(inicio); d < fim && out.length < 400; d.setDate(d.getDate() + 1)) {
      const k = dataISO(d);
      const x = mapa.get(k);
      out.push({ chave: k, valor: Number(x?.valor ?? 0), detalhe: `${numero(x?.quantidade ?? 0)} peças` });
    }
    return out;
  }, [r, filtros.de, filtros.ate]);

  const periodoTexto = `${dataCurta(filtros.de)} a ${dataCurta(filtros.ate)}`;
  const vendedorNome = opcoes.vendedores.find((v) => v.id === filtros.vendedor)?.nome;

  function linhasComissao(): Celula[][] {
    return (r?.por_vendedor ?? []).map((v) => [
      v.nome,
      v.num_vendas,
      v.quantidade,
      Number(v.valor),
      Number(v.fiado ?? 0),
      Number(v.comissao_percentual),
      Number(v.comissao),
    ]);
  }
  const colunasComissao = ["Vendedor", "Vendas", "Peças", "Faturamento", "Em fiado", "Comissão %", "Comissão (R$)"];

  function exportarComissaoCSV() {
    exportarCSV(`comissao_${filtros.de}_a_${filtros.ate}`, colunasComissao, linhasComissao());
  }

  async function exportarRelatorioPDF() {
    if (!r) return;
    try {
      const totalComissao = r.por_vendedor.reduce((s, v) => s + Number(v.comissao), 0);
      await exportarPDF({
        nome: `faturamento_${filtros.de}_a_${filtros.ate}`,
        titulo: `Faturamento e comissões${vendedorNome ? ` — ${vendedorNome}` : ""}`,
        subtitulo: periodoTexto,
        resumo: [
          ["Faturamento", moeda(r.valor)],
          ["Peças vendidas", numero(r.quantidade)],
          ["Vendas", numero(r.num_vendas)],
          ["Comissões", moeda(totalComissao)],
          ...r.por_forma.map((f) => [ROTULO_FORMA[f.forma], moeda(f.valor)] as [string, string]),
        ],
        colunas: colunasComissao,
        linhas: linhasComissao().map((l) => [
          l[0],
          l[1],
          l[2],
          moeda(l[3] as number),
          moeda(l[4] as number),
          `${String(l[5]).replace(".", ",")}%`,
          moeda(l[6] as number),
        ]),
        numericas: [1, 2, 3, 4, 5, 6],
      });
    } catch (e) {
      avisar(mensagemErro(e), "erro");
    }
  }

  const ticket = r && r.num_vendas ? Number(r.valor) / r.num_vendas : 0;
  const fiado = r?.por_forma.find((f) => f.forma === "fiado");
  const totalComissao = r?.por_vendedor.reduce((s, v) => s + Number(v.comissao), 0) ?? 0;

  return (
    <>
      <Titulo
        acao={
          <div className="flex gap-2">
            <Botao variante="secundario" onClick={exportarComissaoCSV} disabled={!r}>
              <FileSpreadsheet className="size-5" /> CSV
            </Botao>
            <Botao variante="secundario" onClick={exportarRelatorioPDF} disabled={!r}>
              <FileDown className="size-5" /> PDF
            </Botao>
          </div>
        }
      >
        Relatórios
      </Titulo>

      <FiltrosVendas filtros={filtros} aoMudar={setFiltros} opcoes={opcoes} comProdutoEForma={false} />

      {!r ? (
        <Carregando />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["Faturamento", moeda(r.valor)],
              ["Peças", numero(r.quantidade)],
              ["Vendas", numero(r.num_vendas)],
              ["Ticket médio", moeda(ticket)],
              ["Descontos", moeda(r.desconto)],
              ["Em fiado", moeda(fiado?.valor ?? 0)],
            ].map(([rot, val]) => (
              <div key={rot} className="rounded-tema-g border border-borda bg-superficie p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-suave">{rot}</p>
                <p className="num font-marca text-2xl font-bold">{val}</p>
              </div>
            ))}
          </div>

          <Cartao>
            <h2 className="mb-1 font-marca text-xl font-bold uppercase tracking-wide">Faturamento por dia</h2>
            <ColunasPorDia dados={dias} formatar={moeda} rotuloDia={(k) => dataCurta(k)} />
          </Cartao>

          <Cartao>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-marca text-xl font-bold uppercase tracking-wide">Faturamento e comissão por vendedor</h2>
              <span className="text-sm text-suave">{periodoTexto} · só vendas não canceladas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="num w-full min-w-[640px] text-left text-sm">
                <thead className="border-b-2 border-borda text-suave">
                  <tr>
                    {colunasComissao.map((c, i) => (
                      <th key={c} className={`px-2 py-2 ${i ? "text-right" : ""}`}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.por_vendedor.map((v) => (
                    <tr key={v.vendedor_id} className="border-b border-borda">
                      <td className="px-2 py-2.5 font-semibold">
                        <Link href={`/admin/vendas?vendedor=${v.vendedor_id}`} className="underline-offset-2 hover:underline">
                          {v.nome}
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 text-right">{numero(v.num_vendas)}</td>
                      <td className="px-2 py-2.5 text-right">{numero(v.quantidade)}</td>
                      <td className="px-2 py-2.5 text-right font-bold">{moeda(v.valor)}</td>
                      <td className="px-2 py-2.5 text-right">{moeda(v.fiado ?? 0)}</td>
                      <td className="px-2 py-2.5 text-right">{Number(v.comissao_percentual).toLocaleString("pt-BR")}%</td>
                      <td className="px-2 py-2.5 text-right font-bold">{moeda(v.comissao)}</td>
                    </tr>
                  ))}
                  {r.por_vendedor.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-suave">
                        Sem vendas no período
                      </td>
                    </tr>
                  )}
                </tbody>
                {r.por_vendedor.length > 1 && (
                  <tfoot className="font-bold">
                    <tr>
                      <td className="px-2 py-2.5">Total</td>
                      <td className="px-2 py-2.5 text-right">{numero(r.num_vendas)}</td>
                      <td className="px-2 py-2.5 text-right">{numero(r.quantidade)}</td>
                      <td className="px-2 py-2.5 text-right">{moeda(r.valor)}</td>
                      <td className="px-2 py-2.5 text-right">{moeda(fiado?.valor ?? 0)}</td>
                      <td />
                      <td className="px-2 py-2.5 text-right">{moeda(totalComissao)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="mt-2 text-xs text-suave">O percentual de comissão de cada vendedor é definido em Vendedores.</p>
          </Cartao>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Cartao>
              <h2 className="mb-3 font-marca text-xl font-bold uppercase tracking-wide">Por design</h2>
              <table className="num w-full text-left text-sm">
                <thead className="border-b-2 border-borda text-suave">
                  <tr>
                    <th className="px-2 py-2">Design</th>
                    <th className="px-2 py-2 text-right">Peças</th>
                    <th className="px-2 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {r.por_design.map((d) => (
                    <tr key={d.produto_id} className="border-b border-borda">
                      <td className="px-2 py-2">
                        {d.nome} <span className="text-suave">· {d.cor}</span>
                      </td>
                      <td className="px-2 py-2 text-right">{numero(d.quantidade)}</td>
                      <td className="px-2 py-2 text-right font-semibold">{moeda(d.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Cartao>
            <Cartao>
              <h2 className="mb-3 font-marca text-xl font-bold uppercase tracking-wide">Por forma de pagamento</h2>
              <table className="num w-full text-left text-sm">
                <thead className="border-b-2 border-borda text-suave">
                  <tr>
                    <th className="px-2 py-2">Forma</th>
                    <th className="px-2 py-2 text-right">Vendas</th>
                    <th className="px-2 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {r.por_forma.map((f) => (
                    <tr key={f.forma} className="border-b border-borda">
                      <td className={`px-2 py-2 ${f.forma === "fiado" ? "font-bold text-destaque" : ""}`}>
                        {ROTULO_FORMA[f.forma]}
                        {f.forma === "fiado" && " (a receber)"}
                      </td>
                      <td className="px-2 py-2 text-right">{numero(f.num_vendas)}</td>
                      <td className="px-2 py-2 text-right font-semibold">{moeda(f.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Cartao>
          </div>
        </div>
      )}
    </>
  );
}

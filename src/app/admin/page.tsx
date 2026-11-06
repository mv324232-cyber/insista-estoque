"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, HandCoins, Radio } from "lucide-react";
import { useAviso } from "@/components/avisos";
import { BarrasHorizontais } from "@/components/graficos";
import { Cartao, Carregando, Selo, cx } from "@/components/ui";
import { mensagemErro } from "@/lib/erros";
import { moeda, numero, tempoRelativo } from "@/lib/formato";
import { hoje, mes, semana, type Intervalo } from "@/lib/periodos";
import { supabase } from "@/lib/supabase";
import {
  montarCatalogo,
  ROTULO_FORMA,
  SELECT_VENDA_DETALHADA,
  tamanhosBaixos,
  type LinhaEstoque,
  type Produto,
  type ProdutoComEstoque,
  type Resumo,
  type VendaDetalhada,
} from "@/lib/tipos";

type Periodo = "hoje" | "semana" | "mes";
const PERIODOS: { id: Periodo; rotulo: string; intervalo: () => Intervalo }[] = [
  { id: "hoje", rotulo: "Hoje", intervalo: hoje },
  { id: "semana", rotulo: "Semana", intervalo: semana },
  { id: "mes", rotulo: "Mês", intervalo: () => mes() },
];

async function buscarResumo(i: Intervalo): Promise<Resumo> {
  const { data, error } = await supabase().rpc("resumo_vendas", {
    p_inicio: i.inicio.toISOString(),
    p_fim: i.fim.toISOString(),
  });
  if (error) throw error;
  return data as Resumo;
}

export default function Painel() {
  const avisar = useAviso();
  const [resumos, setResumos] = useState<Record<Periodo, Resumo> | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [feed, setFeed] = useState<VendaDetalhada[]>([]);
  const [novos, setNovos] = useState<Set<string>>(new Set());
  const [estoqueBaixo, setEstoqueBaixo] = useState<ProdutoComEstoque[]>([]);
  const [aoVivo, setAoVivo] = useState(false);
  const [, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregar = useCallback(async () => {
    try {
      const sb = supabase();
      const [h, s, m, f, p, e] = await Promise.all([
        buscarResumo(hoje()),
        buscarResumo(semana()),
        buscarResumo(mes()),
        sb.from("vendas").select(SELECT_VENDA_DETALHADA).order("created_at", { ascending: false }).limit(15),
        sb.from("produtos").select("*").eq("ativo", true).order("nome"),
        sb.from("estoque").select("produto_id, tamanho, quantidade"),
      ]);
      setResumos({ hoje: h, semana: s, mes: m });
      if (f.data) setFeed(f.data as VendaDetalhada[]);
      if (p.data && e.data) {
        const cat = montarCatalogo(p.data as Produto[], e.data as LinhaEstoque[]);
        setEstoqueBaixo(cat.filter((x) => tamanhosBaixos(x).length > 0));
      }
    } catch (err) {
      avisar(mensagemErro(err), "erro");
    }
  }, [avisar]);

  useEffect(() => {
    carregar();
    const agendar = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(carregar, 500);
    };
    const canal = supabase()
      .channel("painel-dono")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vendas" }, (msg) => {
        const id = (msg.new as { id: string }).id;
        setNovos((s) => new Set(s).add(id));
        setTimeout(() => setNovos((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        }), 8000);
        agendar();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "vendas" }, agendar)
      .on("postgres_changes", { event: "*", schema: "public", table: "estoque" }, agendar)
      .subscribe((status) => setAoVivo(status === "SUBSCRIBED"));
    const relogio = setInterval(() => setTick((t) => t + 1), 30000);
    return () => {
      supabase().removeChannel(canal);
      clearInterval(relogio);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [carregar]);

  if (!resumos) return <Carregando />;
  const r = resumos[periodo];
  const fiado = r.por_forma.find((f) => f.forma === "fiado");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-marca text-3xl font-bold uppercase tracking-wide">Painel</h1>
        <Selo tom={aoVivo ? "sucesso" : "neutro"}>
          <Radio className={cx("size-3.5", aoVivo && "animate-pulse")} /> {aoVivo ? "Ao vivo" : "Conectando..."}
        </Selo>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        {PERIODOS.map((p) => {
          const x = resumos[p.id];
          return (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              aria-pressed={periodo === p.id}
              className={cx(
                "rounded-tema-g border-2 p-4 text-left transition-colors",
                periodo === p.id ? "border-primaria bg-superficie" : "border-borda bg-superficie hover:border-primaria/50",
              )}
            >
              <p className="text-sm font-bold uppercase tracking-wide text-suave">Vendas · {p.rotulo}</p>
              <p className="num mt-1 font-marca text-4xl font-bold">{moeda(x.valor)}</p>
              <p className="num text-sm text-suave">
                {numero(x.quantidade)} peças · {numero(x.num_vendas)} vendas
              </p>
            </button>
          );
        })}
      </div>

      {estoqueBaixo.length > 0 && (
        <Link
          href="/admin/estoque"
          className="flex items-start gap-3 rounded-tema-g border-2 border-alerta bg-alerta-fundo p-4 text-alerta"
        >
          <AlertTriangle className="mt-0.5 size-6 shrink-0" />
          <div className="min-w-0">
            <p className="font-bold">Estoque baixo em {estoqueBaixo.length} produto(s)</p>
            <p className="text-sm font-medium">
              {estoqueBaixo
                .slice(0, 6)
                .map(
                  (p) =>
                    `${p.nome} (${tamanhosBaixos(p)
                      .map((t) => `${t}: ${p.estoque[t]}`)
                      .join(", ")})`,
                )
                .join(" · ")}
              {estoqueBaixo.length > 6 && " ..."}
            </p>
          </div>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <p className="text-sm font-semibold text-suave">
            Rankings e pagamentos de: <strong className="text-texto">{PERIODOS.find((p) => p.id === periodo)?.rotulo}</strong>{" "}
            (toque num cartão acima para trocar)
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Cartao>
              <h2 className="mb-3 font-marca text-xl font-bold uppercase tracking-wide">Ranking de vendedores</h2>
              <BarrasHorizontais
                itens={r.por_vendedor.map((v) => ({
                  id: v.vendedor_id,
                  rotulo: v.nome,
                  valor: Number(v.valor),
                  texto: (
                    <>
                      {moeda(v.valor)} <span className="text-suave">· {numero(v.quantidade)} pç</span>
                    </>
                  ),
                }))}
              />
            </Cartao>
            <Cartao>
              <h2 className="mb-3 font-marca text-xl font-bold uppercase tracking-wide">Designs mais vendidos</h2>
              <BarrasHorizontais
                itens={r.por_design.slice(0, 8).map((d) => ({
                  id: d.produto_id,
                  rotulo: `${d.nome}${d.cor ? ` · ${d.cor}` : ""}`,
                  valor: Number(d.quantidade),
                  texto: (
                    <>
                      {numero(d.quantidade)} pç <span className="text-suave">· {moeda(d.valor)}</span>
                    </>
                  ),
                }))}
              />
            </Cartao>
          </div>

          <Cartao>
            <h2 className="mb-3 font-marca text-xl font-bold uppercase tracking-wide">Formas de pagamento</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["dinheiro", "pix", "cartao", "fiado"] as const).map((f) => {
                const x = r.por_forma.find((y) => y.forma === f);
                const ehFiado = f === "fiado";
                return (
                  <div
                    key={f}
                    className={cx(
                      "rounded-tema p-3",
                      ehFiado ? "border-2 border-destaque bg-superficie" : "bg-superficie-2",
                    )}
                  >
                    <p className="flex items-center gap-1 text-sm font-bold">
                      {ehFiado && <HandCoins className="size-4 text-destaque" />}
                      {ROTULO_FORMA[f]}
                      {ehFiado && <span className="ml-auto text-[11px] uppercase text-destaque">a receber</span>}
                    </p>
                    <p className="num font-marca text-2xl font-bold">{moeda(x?.valor ?? 0)}</p>
                    <p className="num text-xs text-suave">{numero(x?.quantidade ?? 0)} peças</p>
                  </div>
                );
              })}
            </div>
            {fiado && Number(fiado.valor) > 0 && (
              <p className="mt-3 text-sm">
                <strong className="text-destaque">{moeda(fiado.valor)} em fiado</strong> neste período —{" "}
                <Link href="/admin/vendas?forma=fiado" className="font-semibold underline">
                  ver vendas fiado
                </Link>
              </p>
            )}
            {Number(r.desconto) > 0 && (
              <p className="mt-1 text-sm text-suave">Descontos concedidos: {moeda(r.desconto)}</p>
            )}
          </Cartao>
        </div>

        <Cartao className="lg:row-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-marca text-xl font-bold uppercase tracking-wide">Últimas baixas</h2>
            <Link href="/admin/vendas" className="text-sm font-semibold underline">
              ver todas
            </Link>
          </div>
          {feed.length === 0 ? (
            <p className="py-6 text-center text-sm text-suave">Nenhuma venda ainda</p>
          ) : (
            <ul className="-mx-1 divide-y divide-borda" data-testid="feed">
              {feed.map((v) => (
                <li
                  key={v.id}
                  className={cx(
                    "rounded-lg px-1 py-2.5 transition-colors duration-1000",
                    novos.has(v.id) && "bg-sucesso-fundo",
                    v.status === "cancelada" && "opacity-55",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cx("truncate font-bold", v.status === "cancelada" && "line-through")}>
                        {v.vendedor?.nome}
                      </p>
                      <p className="truncate text-sm">
                        {v.quantidade}× {v.produto?.nome} · {v.tamanho}
                      </p>
                      <p className="truncate text-xs text-suave">
                        {tempoRelativo(v.vendida_em)} · {ROTULO_FORMA[v.forma_pagamento]}
                        {v.observacao ? ` · ${v.observacao}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num font-bold">{moeda(v.valor_total)}</p>
                      {novos.has(v.id) && <Selo tom="sucesso">nova</Selo>}
                      {v.status === "cancelada" && <Selo tom="perigo">cancelada</Selo>}
                      {v.status === "ativa" && v.forma_pagamento === "fiado" && <Selo tom="alerta">fiado</Selo>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </div>
  );
}

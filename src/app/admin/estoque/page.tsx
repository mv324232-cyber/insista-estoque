"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, PackagePlus, Search, SlidersHorizontal } from "lucide-react";
import { useAviso } from "@/components/avisos";
import { FotoProduto } from "@/components/foto-produto";
import { Aviso, AreaTexto, Botao, Campo, Carregando, Dialogo, Escolha, Rotulo, Selecao, Selo, Titulo, Vazio, cx } from "@/components/ui";
import { mensagemErro } from "@/lib/erros";
import { dataCurta, dataHora, dataISO, numero } from "@/lib/formato";
import { supabase } from "@/lib/supabase";
import {
  montarCatalogo,
  tamanhosBaixos,
  totalEstoque,
  type LinhaEstoque,
  type Produto,
  type ProdutoComEstoque,
  type Tamanho,
} from "@/lib/tipos";

interface Movimento {
  id: number;
  produto_id: string;
  tamanho: Tamanho;
  tipo: "entrada" | "ajuste" | "venda" | "cancelamento_venda";
  quantidade: number;
  saldo_apos: number;
  data_movimento: string;
  observacao: string | null;
  created_at: string;
  produto: { nome: string; sku: string } | null;
  autor: { nome: string } | null;
}

const ROTULO_TIPO: Record<Movimento["tipo"], string> = {
  entrada: "Entrada",
  ajuste: "Ajuste",
  venda: "Venda",
  cancelamento_venda: "Venda cancelada",
};

export default function PaginaEstoque() {
  const avisar = useAviso();
  const [produtos, setProdutos] = useState<ProdutoComEstoque[] | null>(null);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [busca, setBusca] = useState("");
  const [soBaixo, setSoBaixo] = useState(false);
  const [filtroMov, setFiltroMov] = useState<string>("");
  const [acao, setAcao] = useState<{ tipo: "entrada" | "ajuste"; produto: ProdutoComEstoque } | null>(null);

  const carregar = useCallback(async () => {
    const sb = supabase();
    const [p, e] = await Promise.all([
      sb.from("produtos").select("*").eq("ativo", true).order("nome"),
      sb.from("estoque").select("produto_id, tamanho, quantidade"),
    ]);
    if (p.error || e.error) return avisar(mensagemErro(p.error ?? e.error), "erro");
    setProdutos(montarCatalogo(p.data as Produto[], e.data as LinhaEstoque[]));
  }, [avisar]);

  const carregarMovimentos = useCallback(async () => {
    let q = supabase()
      .from("movimentacoes_estoque")
      .select("*, produto:produtos(nome, sku), autor:perfis!movimentacoes_estoque_created_by_fkey(nome)")
      .order("id", { ascending: false })
      .limit(60);
    if (filtroMov) q = q.eq("produto_id", filtroMov);
    const { data, error } = await q;
    if (error) return avisar(mensagemErro(error), "erro");
    setMovimentos(data as Movimento[]);
  }, [filtroMov, avisar]);

  useEffect(() => {
    carregar();
  }, [carregar]);
  useEffect(() => {
    carregarMovimentos();
  }, [carregarMovimentos]);

  // estoque ao vivo
  useEffect(() => {
    const canal = supabase()
      .channel("admin-estoque")
      .on("postgres_changes", { event: "*", schema: "public", table: "estoque" }, () => {
        carregar();
        carregarMovimentos();
      })
      .subscribe();
    return () => {
      supabase().removeChannel(canal);
    };
  }, [carregar, carregarMovimentos]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (produtos ?? []).filter((p) => {
      if (termo && !p.nome.toLowerCase().includes(termo) && !p.sku.toLowerCase().includes(termo)) return false;
      if (soBaixo && tamanhosBaixos(p).length === 0) return false;
      return true;
    });
  }, [produtos, busca, soBaixo]);

  const totalGeral = (produtos ?? []).reduce((s, p) => s + totalEstoque(p.estoque), 0);
  const qtdBaixo = (produtos ?? []).filter((p) => tamanhosBaixos(p).length > 0).length;

  return (
    <>
      <Titulo>Estoque</Titulo>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-tema-g border border-borda bg-superficie p-3">
          <p className="text-sm font-semibold text-suave">Peças em estoque</p>
          <p className="num font-marca text-3xl font-bold">{numero(totalGeral)}</p>
        </div>
        <button
          onClick={() => setSoBaixo((v) => !v)}
          className={cx(
            "rounded-tema-g border-2 p-3 text-left",
            qtdBaixo ? "border-alerta bg-alerta-fundo text-alerta" : "border-borda bg-superficie",
          )}
        >
          <p className="flex items-center gap-1 text-sm font-semibold">
            <AlertTriangle className="size-4" /> Estoque baixo
          </p>
          <p className="num font-marca text-3xl font-bold">{qtdBaixo}</p>
          <p className="text-xs font-semibold">{soBaixo ? "mostrando só estes" : "toque para filtrar"}</p>
        </button>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-suave" />
        <Campo placeholder="Buscar por design ou SKU" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" />
      </div>

      {!produtos ? (
        <Carregando />
      ) : lista.length === 0 ? (
        <Vazio titulo="Nenhum produto" />
      ) : (
        <ul className="space-y-2">
          {lista.map((p) => (
            <li key={p.id} className="rounded-tema-g border border-borda bg-superficie p-3" data-sku={p.sku}>
              <div className="flex flex-wrap items-center gap-3">
                <FotoProduto url={p.foto_url} nome={p.nome} className="size-12" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold leading-tight">{p.nome}</p>
                  <p className="text-xs text-suave">
                    {p.sku} · {p.cor || "—"} · alerta ≤ {p.estoque_minimo}
                  </p>
                </div>
                <div className="num text-right">
                  <p className="text-xs font-semibold text-suave">Total</p>
                  <p className="text-xl font-bold leading-none">{totalEstoque(p.estoque)}</p>
                </div>
                <div className="flex gap-1.5">
                  <Botao tamanho="sm" onClick={() => setAcao({ tipo: "entrada", produto: p })}>
                    <PackagePlus className="size-4" /> Entrada
                  </Botao>
                  <Botao tamanho="sm" variante="secundario" onClick={() => setAcao({ tipo: "ajuste", produto: p })}>
                    <SlidersHorizontal className="size-4" /> Ajustar
                  </Botao>
                </div>
              </div>
              <div className="num mt-2.5 flex flex-wrap gap-1.5" aria-label="Estoque por tamanho">
                {p.tamanhos.map((t) => {
                  const q = p.estoque[t] ?? 0;
                  const baixo = q <= p.estoque_minimo;
                  return (
                    <span
                      key={t}
                      title={baixo ? "Estoque baixo" : undefined}
                      className={cx(
                        "inline-flex min-w-14 flex-col items-center rounded-lg px-2 py-1",
                        q === 0 ? "bg-perigo-fundo text-perigo" : baixo ? "bg-alerta-fundo text-alerta" : "bg-superficie-2",
                      )}
                    >
                      <span className="text-[11px] font-semibold opacity-80">{t}</span>
                      <span className="text-lg font-bold leading-tight">{q}</span>
                    </span>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-marca text-2xl font-bold uppercase tracking-wide">Movimentações</h2>
          <Selecao value={filtroMov} onChange={(e) => setFiltroMov(e.target.value)} className="sm:w-72">
            <option value="">Todos os produtos</option>
            {(produtos ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} ({p.sku})
              </option>
            ))}
          </Selecao>
        </div>
        {movimentos.length === 0 ? (
          <Vazio titulo="Nenhuma movimentação" />
        ) : (
          <ul className="divide-y divide-borda rounded-tema-g border border-borda bg-superficie">
            {movimentos.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <span
                  className={cx(
                    "num w-14 shrink-0 text-center text-lg font-bold",
                    m.quantidade > 0 ? "text-sucesso" : "text-perigo",
                  )}
                >
                  {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {m.produto?.nome} · {m.tamanho}{" "}
                    <Selo tom={m.tipo === "entrada" ? "sucesso" : m.tipo === "ajuste" ? "alerta" : "neutro"}>
                      {ROTULO_TIPO[m.tipo]}
                    </Selo>
                  </p>
                  <p className="truncate text-sm text-suave">
                    {m.tipo === "entrada" ? `Data: ${dataCurta(m.data_movimento)} · ` : ""}
                    {dataHora(m.created_at)} · {m.autor?.nome ?? "Sistema"}
                    {m.observacao ? ` · ${m.observacao}` : ""}
                  </p>
                </div>
                <span className="num shrink-0 text-sm text-suave">saldo {m.saldo_apos}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialogo
        aberto={acao !== null}
        aoFechar={() => setAcao(null)}
        titulo={acao?.tipo === "entrada" ? "Entrada de estoque" : "Ajustar estoque"}
      >
        {acao?.tipo === "entrada" && (
          <FormEntrada produto={acao.produto} aoSalvar={() => (setAcao(null), carregar(), carregarMovimentos())} />
        )}
        {acao?.tipo === "ajuste" && (
          <FormAjuste produto={acao.produto} aoSalvar={() => (setAcao(null), carregar(), carregarMovimentos())} />
        )}
      </Dialogo>
    </>
  );
}

function CabecalhoProduto({ produto }: { produto: ProdutoComEstoque }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <FotoProduto url={produto.foto_url} nome={produto.nome} className="size-14" />
      <div>
        <p className="text-lg font-bold">{produto.nome}</p>
        <p className="text-sm text-suave">{produto.sku}</p>
      </div>
    </div>
  );
}

function FormEntrada({ produto, aoSalvar }: { produto: ProdutoComEstoque; aoSalvar: () => void }) {
  const avisar = useAviso();
  const [qtd, setQtd] = useState<Record<Tamanho, string>>({});
  const [data, setData] = useState(dataISO(new Date()));
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const total = produto.tamanhos.reduce((s, t) => s + (parseInt(qtd[t] || "0", 10) || 0), 0);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (total <= 0) return setErro("Informe ao menos uma quantidade.");
    setSalvando(true);
    const { error } = await supabase().rpc("registrar_entrada", {
      p_produto_id: produto.id,
      p_itens: produto.tamanhos.map((t) => ({ tamanho: t, quantidade: parseInt(qtd[t] || "0", 10) || 0 })),
      p_data: data,
      p_observacao: obs || null,
    });
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    avisar(`Entrada de ${total} peça(s) registrada`);
    aoSalvar();
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <CabecalhoProduto produto={produto} />
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {produto.tamanhos.map((t) => (
          <div key={t}>
            <span className="mb-1 block text-center font-bold">{t}</span>
            <Campo
              type="number"
              min={0}
              inputMode="numeric"
              aria-label={`Quantidade ${t}`}
              value={qtd[t] ?? ""}
              onChange={(e) => setQtd((s) => ({ ...s, [t]: e.target.value }))}
              className="px-1 text-center text-lg"
            />
            <span className="num mt-1 block text-center text-xs text-suave">atual {produto.estoque[t]}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Rotulo htmlFor="data">Data da entrada</Rotulo>
          <Campo id="data" type="date" required value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="flex items-end">
          <p className="num pb-3 text-lg">
            Total: <strong>{total}</strong> peças
          </p>
        </div>
      </div>
      <div>
        <Rotulo htmlFor="obs">Observação (opcional)</Rotulo>
        <AreaTexto id="obs" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="ex.: Lote da confecção X, nota 123" />
      </div>
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      <Botao type="submit" tamanho="lg" bloco carregando={salvando}>
        Registrar entrada
      </Botao>
    </form>
  );
}

function FormAjuste({ produto, aoSalvar }: { produto: ProdutoComEstoque; aoSalvar: () => void }) {
  const avisar = useAviso();
  const [tamanho, setTamanho] = useState<Tamanho>(produto.tamanhos[0] ?? "");
  const [nova, setNova] = useState(String(produto.estoque[produto.tamanhos[0]] ?? 0));
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!motivo.trim()) return setErro("Informe o motivo do ajuste.");
    setSalvando(true);
    const { error } = await supabase().rpc("ajustar_estoque", {
      p_produto_id: produto.id,
      p_tamanho: tamanho,
      p_nova_quantidade: parseInt(nova || "0", 10),
      p_motivo: motivo,
    });
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    avisar("Estoque ajustado");
    aoSalvar();
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <CabecalhoProduto produto={produto} />
      <p className="text-sm text-suave">
        Use para corrigir o estoque após uma contagem (peça perdida, defeito, brinde...). Para reposição, use “Entrada”.
      </p>
      <div>
        <Rotulo>Tamanho</Rotulo>
        <Escolha
          nome="Tamanho"
          opcoes={produto.tamanhos}
          colunas={Math.min(5, Math.max(1, produto.tamanhos.length))}
          valor={tamanho}
          aoMudar={(t) => {
            setTamanho(t);
            setNova(String(produto.estoque[t]));
          }}
          detalhe={(t) => `${produto.estoque[t]} un.`}
        />
      </div>
      <div>
        <Rotulo htmlFor="nova">Quantidade correta (contada)</Rotulo>
        <Campo id="nova" type="number" min={0} inputMode="numeric" required value={nova} onChange={(e) => setNova(e.target.value)} className="text-lg" />
      </div>
      <div>
        <Rotulo htmlFor="motivo">Motivo (obrigatório)</Rotulo>
        <AreaTexto id="motivo" required value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="ex.: contagem de inventário" />
      </div>
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      <Botao type="submit" tamanho="lg" bloco carregando={salvando}>
        Salvar ajuste
      </Botao>
    </form>
  );
}

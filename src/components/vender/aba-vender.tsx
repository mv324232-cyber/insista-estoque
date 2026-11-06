"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Banknote, Check, CreditCard, HandCoins, Minus, Plus, QrCode, Search, X } from "lucide-react";
import { useAuth } from "../auth";
import { useAviso } from "../avisos";
import { useOnline } from "../conexao";
import { FotoProduto } from "../foto-produto";
import { Aviso, Botao, Campo, Carregando, Escolha, Rotulo, Vazio, cx } from "../ui";
import { adicionarNaFila } from "@/lib/offline/fila";
import { sincronizar } from "@/lib/offline/sincronizar";
import { lerValor, moeda } from "@/lib/formato";
import {
  FORMAS_PAGAMENTO,
  ROTULO_FORMA,
  TAMANHOS,
  totalEstoque,
  type FormaPagamento,
  type ProdutoComEstoque,
  type Tamanho,
} from "@/lib/tipos";

const ICONE_FORMA: Record<FormaPagamento, typeof Banknote> = {
  dinheiro: Banknote,
  pix: QrCode,
  cartao: CreditCard,
  fiado: HandCoins,
};

export function AbaVender({ produtos, carregando }: { produtos: ProdutoComEstoque[]; carregando: boolean }) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const selecionado = produtos.find((p) => p.id === selecionadoId) ?? null;

  if (selecionado) {
    return <FormBaixa produto={selecionado} aoVoltar={() => setSelecionadoId(null)} />;
  }
  return <ListaProdutos produtos={produtos} carregando={carregando} aoEscolher={(p) => setSelecionadoId(p.id)} />;
}

export function ListaProdutos({
  produtos,
  carregando,
  aoEscolher,
  modoConsulta,
}: {
  produtos: ProdutoComEstoque[];
  carregando: boolean;
  aoEscolher?: (p: ProdutoComEstoque) => void;
  modoConsulta?: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [design, setDesign] = useState<string | null>(null);

  const designs = useMemo(() => [...new Set(produtos.map((p) => p.nome))].sort(), [produtos]);
  const lista = useMemo(() => {
    const termo = busca
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    return produtos.filter((p) => {
      if (design && p.nome !== design) return false;
      if (!termo) return true;
      const alvo = `${p.nome} ${p.sku} ${p.cor}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      return alvo.includes(termo);
    });
  }, [produtos, busca, design]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-6 -translate-y-1/2 text-suave" />
        <Campo
          type="search"
          placeholder="Buscar por nome ou SKU"
          aria-label="Buscar produto"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="min-h-14 pl-12 text-lg"
        />
        {busca && (
          <button
            onClick={() => setBusca("")}
            className="absolute right-1 top-1/2 grid size-12 -translate-y-1/2 place-items-center text-suave"
            aria-label="Limpar busca"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {designs.length > 1 && (
        <div className="-mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1" role="group" aria-label="Filtrar por design">
          {[null, ...designs].map((d) => (
            <button
              key={d ?? "todos"}
              onClick={() => setDesign(d)}
              className={cx(
                "min-h-11 shrink-0 rounded-full border-2 px-4 text-sm font-bold",
                design === d ? "border-primaria bg-primaria text-primaria-texto" : "border-borda bg-superficie",
              )}
            >
              {d ?? "Todos"}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        {carregando && produtos.length === 0 ? (
          <Carregando texto="Carregando produtos..." />
        ) : lista.length === 0 ? (
          <Vazio titulo="Nenhum produto encontrado" />
        ) : (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {lista.map((p) => {
              const total = totalEstoque(p.estoque);
              const conteudo = (
                <>
                  <FotoProduto url={p.foto_url} nome={p.nome} className="size-20" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-lg font-bold leading-tight">{p.nome}</p>
                    <p className="truncate text-sm text-suave">
                      {p.cor} · {p.sku}
                    </p>
                    <p className="num mt-0.5 text-lg font-extrabold">{moeda(p.preco)}</p>
                    {modoConsulta && (
                      <div className="num mt-1.5 flex flex-wrap gap-1">
                        {TAMANHOS.map((t) => (
                          <span
                            key={t}
                            className={cx(
                              "rounded-md px-1.5 py-0.5 text-xs font-bold",
                              p.estoque[t] === 0
                                ? "bg-perigo-fundo text-perigo"
                                : p.estoque[t] <= p.estoque_minimo
                                  ? "bg-alerta-fundo text-alerta"
                                  : "bg-superficie-2",
                            )}
                          >
                            {t}: {p.estoque[t]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {!modoConsulta && (
                    <div className={cx("num shrink-0 text-right text-sm font-bold", total === 0 ? "text-perigo" : "text-suave")}>
                      {total === 0 ? "Esgotado" : `${total} un.`}
                    </div>
                  )}
                </>
              );
              return (
                <li key={p.id}>
                  {aoEscolher ? (
                    <button
                      onClick={() => aoEscolher(p)}
                      disabled={total === 0}
                      className="flex w-full items-center gap-3 rounded-tema-g border-2 border-borda bg-superficie p-2.5 transition-colors hover:border-primaria active:bg-superficie-2 disabled:opacity-50"
                    >
                      {conteudo}
                    </button>
                  ) : (
                    <div className="flex w-full items-start gap-3 rounded-tema-g border border-borda bg-superficie p-2.5">{conteudo}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function FormBaixa({ produto, aoVoltar }: { produto: ProdutoComEstoque; aoVoltar: () => void }) {
  const { perfil } = useAuth();
  const avisar = useAviso();
  const online = useOnline();
  const primeiroDisponivel = TAMANHOS.find((t) => produto.estoque[t] > 0) ?? null;
  // se só existe um tamanho disponível, já começa selecionado
  const [tamanho, setTamanho] = useState<Tamanho | null>(() => {
    const disponiveis = TAMANHOS.filter((t) => produto.estoque[t] > 0);
    return disponiveis.length === 1 ? disponiveis[0] : null;
  });
  const [quantidade, setQuantidade] = useState(1);
  const [valorTexto, setValorTexto] = useState(produto.preco.toFixed(2).replace(".", ","));
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const disponivel = tamanho ? produto.estoque[tamanho] : 0;
  const valorUnitario = lerValor(valorTexto);
  const valorValido = Number.isFinite(valorUnitario) && valorUnitario >= 0 && valorTexto.trim() !== "";
  const total = valorValido ? Math.round(valorUnitario * quantidade * 100) / 100 : 0;
  const desconto = valorValido ? Math.round((produto.preco - valorUnitario) * quantidade * 100) / 100 : 0;
  const excede = !!tamanho && quantidade > disponivel;
  const pronto = !!tamanho && !excede && quantidade > 0 && valorValido && !!forma;

  function escolherTamanho(t: Tamanho) {
    setTamanho(t);
    setQuantidade((q) => Math.min(q, Math.max(1, produto.estoque[t])));
  }

  async function confirmar() {
    setErro(null);
    if (!perfil) return;
    if (!tamanho) return setErro("Escolha o tamanho.");
    if (excede) return setErro(`Só há ${disponivel} un. do tamanho ${tamanho}.`);
    if (!valorValido) return setErro("Valor inválido.");
    if (!forma) return setErro("Escolha a forma de pagamento.");
    setEnviando(true);
    const clientId = crypto.randomUUID();
    adicionarNaFila(perfil.id, {
      client_id: clientId,
      produto_id: produto.id,
      produto_nome: produto.nome,
      sku: produto.sku,
      tamanho,
      quantidade,
      valor_unitario: Math.round(valorUnitario * 100) / 100,
      forma_pagamento: forma,
      observacao: observacao.trim() || null,
      vendida_em: new Date().toISOString(),
      estado: "pendente",
      tentativas: 0,
    });
    // tenta enviar já; se não houver sinal, fica guardada no aparelho
    const r = await Promise.race([
      sincronizar(perfil.id, "manual"),
      new Promise<null>((res) => setTimeout(() => res(null), 6000)),
    ]);
    setEnviando(false);
    if (r && r.enviadas > 0 && !r.semConexao) {
      avisar(`Baixa registrada: ${quantidade}× ${produto.nome} ${tamanho} — ${moeda(total)}`);
    } else if (r && r.rejeitadas > 0) {
      avisar("A baixa não foi aceita. Veja no Histórico.", "erro");
    } else {
      avisar("Sem sinal: baixa guardada no aparelho. Será enviada sozinha quando a conexão voltar.", "info");
    }
    aoVoltar();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={aoVoltar} className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-borda" aria-label="Voltar">
          <ArrowLeft className="size-6" />
        </button>
        <FotoProduto url={produto.foto_url} nome={produto.nome} className="size-16" />
        <div className="min-w-0">
          <p className="truncate text-xl font-bold leading-tight">{produto.nome}</p>
          <p className="truncate text-sm text-suave">
            {produto.cor} · {produto.sku}
          </p>
          <p className="num font-bold">{moeda(produto.preco)}</p>
        </div>
      </div>

      <section>
        <Rotulo>1. Tamanho</Rotulo>
        <Escolha
          nome="Tamanho"
          opcoes={TAMANHOS}
          valor={tamanho}
          aoMudar={escolherTamanho}
          desabilitada={(t) => produto.estoque[t] <= 0}
          detalhe={(t) => (produto.estoque[t] > 0 ? `${produto.estoque[t]} un.` : "esgotado")}
        />
        {!tamanho && primeiroDisponivel && <p className="mt-1.5 text-sm text-suave">Toque no tamanho vendido.</p>}
      </section>

      <section>
        <Rotulo>2. Quantidade</Rotulo>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
            className="grid size-16 place-items-center rounded-tema border-2 border-borda bg-superficie disabled:opacity-40"
            disabled={quantidade <= 1}
            aria-label="Diminuir quantidade"
          >
            <Minus className="size-7" />
          </button>
          <output className="num w-16 text-center font-marca text-5xl font-bold" aria-label="Quantidade">
            {quantidade}
          </output>
          <button
            type="button"
            onClick={() => setQuantidade((q) => q + 1)}
            className="grid size-16 place-items-center rounded-tema border-2 border-borda bg-superficie disabled:opacity-40"
            disabled={!!tamanho && quantidade >= disponivel}
            aria-label="Aumentar quantidade"
          >
            <Plus className="size-7" />
          </button>
          {tamanho && <span className="text-sm text-suave">de {disponivel} disponível(is)</span>}
        </div>
      </section>

      <section>
        <Rotulo htmlFor="valor">3. Valor cobrado por peça (R$)</Rotulo>
        <Campo
          id="valor"
          inputMode="decimal"
          value={valorTexto}
          onChange={(e) => setValorTexto(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="num min-h-14 text-2xl font-bold"
        />
        {valorValido && desconto !== 0 && (
          <p className={cx("mt-1.5 text-sm font-semibold", desconto > 0 ? "text-alerta" : "text-sucesso")}>
            {desconto > 0 ? `Desconto de ${moeda(desconto)}` : `Acréscimo de ${moeda(-desconto)}`} (tabela {moeda(produto.preco)})
          </p>
        )}
      </section>

      <section>
        <Rotulo>4. Pagamento</Rotulo>
        <Escolha
          nome="Forma de pagamento"
          opcoes={FORMAS_PAGAMENTO}
          valor={forma}
          aoMudar={setForma}
          colunas={2}
          rotulo={(f) => {
            const I = ICONE_FORMA[f];
            return (
              <span className="flex items-center gap-2">
                <I className="size-6" /> {ROTULO_FORMA[f]}
              </span>
            );
          }}
        />
      </section>

      <section>
        <Rotulo htmlFor="obs">Observação (opcional)</Rotulo>
        <Campo id="obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="ex.: nome do cliente" />
      </section>

      {excede && <Aviso tom="perigo">Quantidade maior que o estoque disponível ({disponivel}).</Aviso>}
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      {!online && <Aviso>Sem sinal agora — a baixa fica guardada no aparelho e é enviada sozinha depois.</Aviso>}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-3 border-t border-borda bg-fundo/95 px-3 pb-2 pt-3 backdrop-blur">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-semibold text-suave">Total</span>
          <span className="num font-marca text-4xl font-bold">{moeda(total)}</span>
        </div>
        <Botao tamanho="xl" bloco disabled={!pronto} carregando={enviando} onClick={confirmar}>
          <Check className="size-7" /> Confirmar baixa
        </Botao>
      </div>
    </div>
  );
}

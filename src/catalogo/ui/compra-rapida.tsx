"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { LOJA, imagem, linkWhatsapp, mensagemPedido, nomeColecao, precoTexto, produtoPorCodigo } from "../config";
import { abrirCompra, useCompraAberta } from "../compra";
import { useSacola } from "../sacola";
import type { ProdutoCatalogo } from "../tipos";
import { EscolhaTamanho, Quantidade } from "./escolha-tamanho";
import { IconeWhatsapp } from "./icones";
import { Janela } from "./painel";
import { TabelaMedidas } from "./secoes";

export function CompraRapida() {
  const codigo = useCompraAberta();
  const produto = codigo ? produtoPorCodigo(codigo) : undefined;
  return (
    <Janela aberta={!!produto} aoFechar={() => abrirCompra(null)} titulo={produto ? `Comprar ${produto.nome}` : "Comprar"}>
      {produto && <ConteudoCompra key={produto.codigo} produto={produto} />}
    </Janela>
  );
}

export function ConteudoCompra({ produto, embutido = false }: { produto: ProdutoCatalogo; embutido?: boolean }) {
  const { adicionar, abrir } = useSacola();
  const [tamanho, setTamanho] = useState<string | null>(null);
  const [qtd, setQtd] = useState(1);
  const [erro, setErro] = useState(false);
  const [medidas, setMedidas] = useState(false);

  function validar() {
    if (!tamanho) {
      setErro(true);
      return false;
    }
    return true;
  }

  const formulario = (
    <div className="space-y-5">
      <EscolhaTamanho valor={tamanho} aoMudar={(t) => (setTamanho(t), setErro(false))} erro={erro} aoVerMedidas={() => setMedidas((m) => !m)} />
      {medidas && <TabelaMedidas compacta />}
      <div className="flex items-end gap-3">
        <div>
          <span className="mb-2 block text-sm font-bold uppercase tracking-widest text-l-areia">Qtd.</span>
          <Quantidade valor={qtd} aoMudar={setQtd} />
        </div>
        <div className="flex-1 text-right">
          <span className="block text-sm text-l-areia">Total</span>
          <span className="font-display text-4xl">{precoTexto(qtd * LOJA.preco)}</span>
        </div>
      </div>
      <button
        onClick={() => {
          if (!validar()) return;
          adicionar({ codigo: produto.codigo, tamanho: tamanho!, quantidade: qtd });
          abrirCompra(null);
          abrir();
        }}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-l-vermelho font-bold uppercase tracking-wider text-white transition hover:bg-l-vermelho-escuro active:scale-[0.99]"
      >
        <ShoppingBag className="size-5" /> Adicionar à sacola
      </button>
      <a
        href={tamanho ? linkWhatsapp(mensagemPedido([{ produto, tamanho, quantidade: qtd }])) : undefined}
        onClick={(e) => {
          if (!validar()) e.preventDefault();
        }}
        target="_blank"
        rel="noopener"
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#25d366] font-bold uppercase tracking-wider text-l-preto transition hover:brightness-110"
      >
        <IconeWhatsapp /> Comprar agora no WhatsApp
      </a>
      <p className="text-center text-xs text-l-areia">O pedido é finalizado pelo WhatsApp, onde combinamos pagamento e frete.</p>
    </div>
  );

  if (embutido) return formulario;

  return (
    <div className="grid sm:grid-cols-2">
      <div className="relative flex items-center bg-[radial-gradient(70%_60%_at_50%_45%,rgb(208_20_47/0.25),transparent_70%)] p-6 pt-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imagem(produto.codigo, "camiseta")} alt={produto.nome} className="w-full drop-shadow-[0_20px_25px_rgb(0_0_0/0.6)]" />
      </div>
      <div className="p-5 sm:p-7 sm:pt-12">
        <p className="font-display text-sm tracking-widest text-l-trigo">
          Nº {produto.codigo} • {nomeColecao(produto.colecao)}
        </p>
        <h2 className="mt-1 font-display text-3xl uppercase leading-none tracking-wide">{produto.nome}</h2>
        <p className="mt-2 text-sm text-l-areia">{produto.descricao}</p>
        <Link href={`/produto/${produto.codigo}`} onClick={() => abrirCompra(null)} className="mt-2 inline-block text-sm font-semibold text-l-trigo underline underline-offset-2">
          Ver fotos e detalhes
        </Link>
        <div className="mt-5">{formulario}</div>
      </div>
    </div>
  );
}

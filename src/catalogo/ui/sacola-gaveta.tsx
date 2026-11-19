"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LOJA, imagem, linkWhatsapp, mensagemPedido, precoTexto, produtoPorCodigo } from "../config";
import { useSacola } from "../sacola";
import { IconeWhatsapp } from "./icones";
import { Gaveta } from "./painel";

export function SacolaGaveta() {
  const { itens, aberta, fechar, alterar, remover, totalPecas, limpar } = useSacola();
  const linhas = itens
    .map((i) => ({ ...i, produto: produtoPorCodigo(i.codigo) }))
    .filter((i): i is typeof i & { produto: NonNullable<typeof i.produto> } => !!i.produto);

  return (
    <Gaveta aberta={aberta} aoFechar={fechar} titulo="Sacola">
      <div className="flex items-center justify-between border-b border-l-tinta/10 px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-2xl uppercase">
          <ShoppingBag className="size-6 text-l-vermelho" /> Sua sacola
        </h2>
        <button onClick={fechar} className="grid size-11 place-items-center rounded-full hover:bg-l-tinta/10" aria-label="Fechar sacola">
          <X className="size-6" />
        </button>
      </div>

      {linhas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <ShoppingBag className="size-14 text-l-tinta/20" />
          <p className="font-display text-2xl uppercase">Sua sacola está vazia</p>
          <p className="text-l-areia">Escolha suas estampas favoritas e monte o pedido.</p>
          <Link href="/#catalogo" onClick={fechar} className="rounded-xl bg-l-vermelho px-6 py-3 font-bold uppercase tracking-wider text-white">
            Ver catálogo
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex-1 space-y-3 overflow-y-auto p-4">
            <AnimatePresence initial={false}>
              {linhas.map((i) => (
                <motion.li
                  key={`${i.codigo}-${i.tamanho}`}
                  layout
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 60, height: 0, marginTop: 0 }}
                  className="flex gap-3 overflow-hidden rounded-2xl border border-l-tinta/10 bg-l-couro p-3"
                >
                  <Link href={`/produto/${i.codigo}`} onClick={fechar} className="w-24 shrink-0 self-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagem(i.codigo, "camiseta-p")} alt="" className="w-full" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xs text-l-trigo">Nº {i.codigo}</p>
                    <p className="line-clamp-2 text-sm font-bold uppercase leading-tight">{i.produto.nome}</p>
                    <p className="mt-0.5 text-sm text-l-areia">Tamanho {i.tamanho}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-l-tinta/15">
                        <button onClick={() => alterar(i.codigo, i.tamanho, i.quantidade - 1)} className="grid size-9 place-items-center" aria-label="Diminuir">
                          <Minus className="size-4" />
                        </button>
                        <span className="w-7 text-center font-bold">{i.quantidade}</span>
                        <button onClick={() => alterar(i.codigo, i.tamanho, i.quantidade + 1)} className="grid size-9 place-items-center" aria-label="Aumentar">
                          <Plus className="size-4" />
                        </button>
                      </div>
                      <span className="font-display text-lg">{precoTexto(i.quantidade * LOJA.preco)}</span>
                      <button onClick={() => remover(i.codigo, i.tamanho)} className="grid size-9 place-items-center text-l-areia hover:text-l-vermelho" aria-label="Remover">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <div className="space-y-3 border-t border-l-tinta/10 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="flex items-baseline justify-between">
              <span className="text-l-areia">
                {totalPecas} peça{totalPecas > 1 ? "s" : ""}
              </span>
              <span className="font-display text-4xl">{precoTexto(totalPecas * LOJA.preco)}</span>
            </div>
            <p className="text-xs text-l-areia">Frete e pagamento são combinados no WhatsApp.</p>
            <a
              href={linkWhatsapp(mensagemPedido(linhas))}
              target="_blank"
              rel="noopener"
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#25d366] font-bold uppercase tracking-wider text-l-preto transition hover:brightness-110"
            >
              <IconeWhatsapp className="size-6" /> Finalizar pedido no WhatsApp
            </a>
            <button onClick={limpar} className="w-full py-2 text-sm text-l-areia hover:text-l-creme">
              Esvaziar sacola
            </button>
          </div>
        </>
      )}
    </Gaveta>
  );
}

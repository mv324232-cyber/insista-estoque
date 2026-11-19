"use client";

import { Minus, Plus, Ruler } from "lucide-react";
import { TAMANHOS_CATALOGO } from "../config";

export function EscolhaTamanho({
  valor,
  aoMudar,
  erro,
  aoVerMedidas,
}: {
  valor: string | null;
  aoMudar: (t: string) => void;
  erro?: boolean;
  aoVerMedidas?: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-sm font-bold uppercase tracking-widest ${erro ? "text-l-vermelho" : "text-l-areia"}`}>
          {erro ? "Escolha o tamanho" : "Tamanho"}
        </span>
        {aoVerMedidas && (
          <button type="button" onClick={aoVerMedidas} className="flex items-center gap-1 text-sm font-semibold text-l-trigo underline-offset-2 hover:underline">
            <Ruler className="size-4" /> Tabela de medidas
          </button>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Tamanho">
        {TAMANHOS_CATALOGO.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={valor === t}
            onClick={() => aoMudar(t)}
            className={`h-14 rounded-xl border-2 font-display text-2xl transition active:scale-95 ${
              valor === t ? "border-l-vermelho bg-l-vermelho text-white" : erro ? "border-l-vermelho/60" : "border-l-tinta/15 hover:border-l-tinta/50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Quantidade({ valor, aoMudar }: { valor: number; aoMudar: (n: number) => void }) {
  return (
    <div className="flex h-14 items-center rounded-xl border-2 border-l-tinta/15">
      <button type="button" onClick={() => aoMudar(Math.max(1, valor - 1))} className="grid h-full w-12 place-items-center disabled:opacity-30" disabled={valor <= 1} aria-label="Menos uma">
        <Minus className="size-5" />
      </button>
      <output className="w-10 text-center font-display text-2xl" aria-label="Quantidade">
        {valor}
      </output>
      <button type="button" onClick={() => aoMudar(Math.min(99, valor + 1))} className="grid h-full w-12 place-items-center" aria-label="Mais uma">
        <Plus className="size-5" />
      </button>
    </div>
  );
}

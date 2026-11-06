"use client";

import { useState, type ReactNode } from "react";
import { cx } from "./ui";

export interface ItemBarra {
  id: string;
  rotulo: ReactNode;
  valor: number;
  /** texto à direita (ex.: "R$ 1.200 · 12 peças") */
  texto: ReactNode;
  destaque?: boolean;
}

/**
 * Ranking em barras horizontais (uma série → uma cor; o texto fica em cor de texto).
 * Os números ficam sempre visíveis, então a lista também funciona como tabela.
 */
export function BarrasHorizontais({ itens, vazio = "Sem dados no período" }: { itens: ItemBarra[]; vazio?: string }) {
  const max = Math.max(...itens.map((i) => i.valor), 0);
  if (!itens.length || max <= 0) return <p className="py-6 text-center text-sm text-suave">{vazio}</p>;
  return (
    <ol className="space-y-3">
      {itens.map((i, idx) => (
        <li key={i.id} title={typeof i.rotulo === "string" ? `${i.rotulo}` : undefined}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-semibold">
              <span className="num mr-1.5 text-suave">{idx + 1}.</span>
              {i.rotulo}
            </span>
            <span className="num shrink-0 text-sm font-semibold">{i.texto}</span>
          </div>
          <div className="h-2.5 rounded-full bg-superficie-2">
            <div
              className={cx("h-full rounded-full", i.destaque ? "bg-destaque" : "bg-primaria")}
              style={{ width: `${Math.max(2, (i.valor / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Colunas por dia com dica ao tocar/passar o mouse. */
export function ColunasPorDia({
  dados,
  formatar,
  rotuloDia,
}: {
  dados: { chave: string; valor: number; detalhe: string }[];
  formatar: (v: number) => string;
  rotuloDia: (chave: string) => string;
}) {
  const [ativo, setAtivo] = useState<string | null>(null);
  const max = Math.max(...dados.map((d) => d.valor), 0);
  if (!dados.length || max <= 0) return <p className="py-6 text-center text-sm text-suave">Sem vendas no período</p>;
  const sel = dados.find((d) => d.chave === ativo);
  const marcas = [max, max / 2];
  return (
    <div>
      <div className="mb-2 h-10 text-sm" aria-live="polite">
        {sel ? (
          <p>
            <strong>{rotuloDia(sel.chave)}</strong> · <span className="num font-bold">{formatar(sel.valor)}</span>
            <span className="text-suave"> · {sel.detalhe}</span>
          </p>
        ) : (
          <p className="text-suave">Toque ou passe o mouse numa coluna para ver o dia.</p>
        )}
      </div>
      <div className="relative flex h-48 items-end gap-[2px] border-b border-borda" onMouseLeave={() => setAtivo(null)}>
        {marcas.map((m) => (
          <div key={m} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-borda/70" style={{ bottom: `${(m / max) * 100}%` }}>
            <span className="num absolute -top-4 right-0 bg-superficie pl-1 text-[11px] text-suave">{formatar(m)}</span>
          </div>
        ))}
        {dados.map((d) => (
          <button
            key={d.chave}
            type="button"
            onMouseEnter={() => setAtivo(d.chave)}
            onFocus={() => setAtivo(d.chave)}
            onClick={() => setAtivo(d.chave)}
            aria-label={`${rotuloDia(d.chave)}: ${formatar(d.valor)}`}
            className="group relative flex h-full flex-1 items-end"
          >
            <span
              className={cx(
                "block w-full rounded-t-[4px] transition-opacity",
                ativo && ativo !== d.chave ? "bg-primaria/45" : "bg-primaria",
              )}
              style={{ height: `${Math.max(1, (d.valor / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-suave">
        <span>{rotuloDia(dados[0].chave)}</span>
        <span>{rotuloDia(dados[dados.length - 1].chave)}</span>
      </div>
    </div>
  );
}

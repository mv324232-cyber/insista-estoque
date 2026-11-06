"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { GRADES_SUGERIDAS, lerTamanhos } from "@/lib/tipos";
import { Campo, cx } from "./ui";

/**
 * Tamanhos digitados livremente. Digite um ou vários (separados por espaço
 * ou vírgula) e toque em "Adicionar" / Enter. A ordem é a que o vendedor verá.
 */
export function CampoTamanhos({
  valor,
  aoMudar,
  bloqueados = [],
}: {
  valor: string[];
  aoMudar: (v: string[]) => void;
  /** tamanhos que não podem ser removidos (ainda têm estoque) */
  bloqueados?: string[];
}) {
  const [texto, setTexto] = useState("");

  function adicionar(entrada = texto) {
    const novos = lerTamanhos(entrada).filter((t) => !valor.includes(t));
    if (novos.length) aoMudar([...valor, ...novos]);
    setTexto("");
  }

  function teclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      adicionar();
    } else if (e.key === "Backspace" && !texto && valor.length) {
      const ultimo = valor[valor.length - 1];
      if (!bloqueados.includes(ultimo)) aoMudar(valor.slice(0, -1));
    }
  }

  function mover(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= valor.length) return;
    const n = [...valor];
    [n[i], n[j]] = [n[j], n[i]];
    aoMudar(n);
  }

  return (
    <div>
      <div className="flex gap-2">
        <Campo
          aria-label="Digite os tamanhos"
          placeholder="Digite: P M G GG XG G1 38..."
          value={texto}
          autoCapitalize="characters"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={teclar}
          onBlur={() => texto.trim() && adicionar()}
          className="uppercase"
        />
        <button
          type="button"
          onClick={() => adicionar()}
          className="inline-flex min-h-12 shrink-0 items-center gap-1 rounded-tema bg-primaria px-4 font-semibold text-primaria-texto"
        >
          <Plus className="size-5" /> Adicionar
        </button>
      </div>
      <p className="mt-1 text-xs text-suave">
        Pode digitar vários de uma vez, separados por espaço ou vírgula. Toque em ‹ › para mudar a ordem.
      </p>

      {valor.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Tamanhos do produto">
          {valor.map((t, i) => {
            const travado = bloqueados.includes(t);
            return (
              <li
                key={t}
                className="inline-flex items-center rounded-full border-2 border-borda bg-superficie-2 pl-1 text-sm font-bold"
              >
                <button type="button" onClick={() => mover(i, -1)} className="px-1 text-suave" aria-label={`Mover ${t} para a esquerda`}>
                  ‹
                </button>
                <span className="px-1">{t}</span>
                <button type="button" onClick={() => mover(i, 1)} className="px-1 text-suave" aria-label={`Mover ${t} para a direita`}>
                  ›
                </button>
                <button
                  type="button"
                  disabled={travado}
                  title={travado ? "Este tamanho ainda tem peças em estoque" : undefined}
                  onClick={() => aoMudar(valor.filter((x) => x !== t))}
                  className={cx("grid size-8 place-items-center rounded-full", travado ? "opacity-30" : "hover:bg-borda")}
                  aria-label={`Remover tamanho ${t}`}
                >
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-sm font-semibold text-alerta">Nenhum tamanho ainda.</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-suave">Atalhos:</span>
        {GRADES_SUGERIDAS.map((g) => (
          <button
            key={g.nome}
            type="button"
            onClick={() => adicionar(g.tamanhos.join(" "))}
            className="rounded-full border border-borda px-2.5 py-1 font-semibold hover:bg-superficie-2"
          >
            + {g.nome}
          </button>
        ))}
      </div>
    </div>
  );
}

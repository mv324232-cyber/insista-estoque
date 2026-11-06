"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { cx } from "./ui";

type Tipo = "sucesso" | "erro" | "info";
interface Item {
  id: number;
  tipo: Tipo;
  texto: string;
}

const Ctx = createContext<(texto: string, tipo?: Tipo) => void>(() => {});

export function useAviso() {
  return useContext(Ctx);
}

let seq = 0;

export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Item[]>([]);
  const avisar = useCallback((texto: string, tipo: Tipo = "sucesso") => {
    const id = ++seq;
    setItens((l) => [...l.slice(-2), { id, tipo, texto }]);
    setTimeout(() => setItens((l) => l.filter((i) => i.id !== id)), tipo === "erro" ? 6000 : 3500);
  }, []);

  return (
    <Ctx value={avisar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3"
      >
        {itens.map((i) => (
          <div
            key={i.id}
            className={cx(
              "pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-tema px-4 py-3 font-semibold shadow-lg",
              i.tipo === "sucesso" && "bg-sucesso text-white dark:text-fundo",
              i.tipo === "erro" && "bg-perigo text-white dark:text-fundo",
              i.tipo === "info" && "bg-texto text-fundo",
            )}
          >
            {i.tipo === "sucesso" ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            ) : i.tipo === "erro" ? (
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            ) : (
              <Info className="mt-0.5 size-5 shrink-0" />
            )}
            <span>{i.texto}</span>
          </div>
        ))}
      </div>
    </Ctx>
  );
}

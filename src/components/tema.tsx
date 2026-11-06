"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Script que aplica o tema antes da página aparecer (evita "piscar"). */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem('insista:tema');var e=t?t==='escuro':matchMedia('(prefers-color-scheme: dark)').matches;if(e)document.documentElement.classList.add('dark');}catch(_){}})();`;

export function BotaoTema({ className = "" }: { className?: string }) {
  const [escuro, setEscuro] = useState(false);
  useEffect(() => {
    setEscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const novo = !escuro;
    setEscuro(novo);
    document.documentElement.classList.toggle("dark", novo);
    try {
      localStorage.setItem("insista:tema", novo ? "escuro" : "claro");
    } catch {}
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", novo ? "#11130e" : "#2c4a26");
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className={`grid size-11 place-items-center rounded-full hover:bg-superficie-2 ${className}`}
      aria-label={escuro ? "Usar modo claro" : "Usar modo escuro"}
      title={escuro ? "Modo claro" : "Modo escuro"}
    >
      {escuro ? <Sun className="size-6" /> : <Moon className="size-6" />}
    </button>
  );
}

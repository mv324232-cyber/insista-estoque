"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

/** Trava a rolagem da página enquanto um painel está aberto e fecha com Esc. */
function useTravarRolagem(aberto: boolean, aoFechar: () => void) {
  useEffect(() => {
    if (!aberto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener("keydown", tecla);
    };
  }, [aberto, aoFechar]);
}

/** Janela central (desktop) / folha inferior (celular). */
export function Janela({ aberta, aoFechar, titulo, children }: { aberta: boolean; aoFechar: () => void; titulo: string; children: ReactNode }) {
  useTravarRolagem(aberta, aoFechar);
  return (
    <AnimatePresence>
      {aberta && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={titulo}>
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={aoFechar} />
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-l-tinta/10 bg-l-carvao text-l-creme shadow-2xl sm:max-w-3xl sm:rounded-3xl"
          >
            <button onClick={aoFechar} className="absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-black/50 text-white hover:bg-black/80" aria-label="Fechar">
              <X className="size-5" />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Gaveta lateral (sacola). */
export function Gaveta({ aberta, aoFechar, titulo, children }: { aberta: boolean; aoFechar: () => void; titulo: string; children: ReactNode }) {
  useTravarRolagem(aberta, aoFechar);
  return (
    <AnimatePresence>
      {aberta && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={titulo}>
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={aoFechar} />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-l-tinta/10 bg-l-carvao text-l-creme shadow-2xl"
          >
            {children}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

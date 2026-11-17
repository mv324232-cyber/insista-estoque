"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Faz o conteúdo surgir suavemente ao entrar na tela. */
export function Revelar({
  children,
  atraso = 0,
  className,
  y = 28,
}: {
  children: ReactNode;
  atraso?: number;
  className?: string;
  y?: number;
}) {
  const reduzir = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduzir ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, delay: atraso, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Título de seção com selo, título grande e pesponto. */
export function TituloSecao({ selo, titulo, destaque, children }: { selo: string; titulo: string; destaque?: string; children?: ReactNode }) {
  return (
    <Revelar className="mx-auto mb-10 max-w-3xl text-center">
      <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-l-trigo">
        <span className="h-px w-8 bg-l-trigo/60" /> {selo} <span className="h-px w-8 bg-l-trigo/60" />
      </p>
      <h2 className="font-display text-4xl uppercase leading-[0.95] tracking-wide sm:text-6xl">
        {titulo} {destaque && <span className="text-l-vermelho">{destaque}</span>}
      </h2>
      {children && <p className="mt-4 text-base text-l-areia sm:text-lg">{children}</p>}
    </Revelar>
  );
}

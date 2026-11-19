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

/** Título de seção: frase manuscrita, título em letra de selo e um raminho de trigo. */
export function TituloSecao({ selo, titulo, destaque, children }: { selo: string; titulo: string; destaque?: string; children?: ReactNode }) {
  return (
    <Revelar className="mx-auto mb-10 max-w-3xl text-center">
      <p className="font-script text-2xl text-l-trigo sm:text-3xl">{selo}</p>
      <h2 className="mt-1 font-display text-4xl uppercase leading-[1.02] sm:text-5xl">
        {titulo} {destaque && <span className="text-l-vermelho">{destaque}</span>}
      </h2>
      <svg viewBox="0 0 160 16" className="mx-auto mt-3 h-4 w-40 text-l-trigo" aria-hidden>
        <path d="M2 8 H62 M98 8 H158" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 4" />
        <path d="M80 2 C76 6 76 10 80 14 C84 10 84 6 80 2 Z M70 8 C73 5 76 5 79 8 C76 11 73 11 70 8 Z M90 8 C87 5 84 5 81 8 C84 11 87 11 90 8 Z" fill="currentColor" />
      </svg>
      {children && <p className="mt-3 text-base text-l-areia sm:text-lg">{children}</p>}
    </Revelar>
  );
}

/** Divisor com silhueta de morros (topo de uma seção). `cor` = cor da seção de cima. */
export function DivisorMorros({ cor, className = "" }: { cor: string; className?: string }) {
  return (
    <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className={`pointer-events-none absolute inset-x-0 -top-px h-10 w-full sm:h-16 ${className}`} aria-hidden>
      <path d="M0 0 H1440 V22 Q1300 62 1150 34 T860 40 T540 30 T250 46 T0 28 Z" fill={cor} />
    </svg>
  );
}

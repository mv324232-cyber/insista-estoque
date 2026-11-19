"use client";

import { motion } from "motion/react";
import { ArrowUpRight, Drone, Flag, Tractor, Wheat } from "lucide-react";
import { Chifres, Ferradura } from "./icones";
import type { ColecaoId } from "../tipos";
import { COLECOES, imagem } from "../config";
import { irParaColecao } from "../filtro";
import { PRODUTOS } from "../produtos";
import { TituloSecao } from "./revelar";

const ICONE: Record<ColecaoId, (p: { className?: string }) => React.ReactNode> = {
  maquinas: Tractor,
  pecuaria: Chifres,
  cavalos: Ferradura,
  lavoura: Wheat,
  drones: Drone,
  brasil: Flag,
};

export function Colecoes() {
  return (
    <section id="colecoes" className="grao scroll-mt-20 bg-l-carvao px-4 pb-20 pt-28 sm:px-6">
      <TituloSecao selo="Escolha o seu estilo" titulo="Seis jeitos de" destaque="vestir o agro">
        Cada coleção conta uma parte da vida no campo. Toque e veja todas as estampas.
      </TituloSecao>
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        {COLECOES.map((c, i) => {
          const qtd = PRODUTOS.filter((p) => p.colecao === c.id).length;
          const Icone = ICONE[c.id];
          return (
            <motion.button
              key={c.id}
              onClick={() => irParaColecao(c.id)}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover="hover"
              className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl border border-l-tinta/10 bg-gradient-to-b from-l-couro-2 to-l-preto p-4 text-left sm:aspect-[5/4] sm:p-6"
            >
              <span className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_35%,rgb(208_20_47/0.28),transparent_70%)] opacity-60 transition-opacity duration-500 group-hover:opacity-100" />
              <motion.span
                variants={{ hover: { scale: 1.08, y: -8, rotate: -2 } }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="absolute inset-x-[6%] top-[6%] -z-10 drop-shadow-[0_20px_25px_rgb(0_0_0/0.6)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagem(c.capa, "camiseta-p")} alt="" loading="lazy" className="w-full" />
              </motion.span>
              <span className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-l-preto via-l-preto/85 to-transparent" />
              <span className="couro absolute left-3 top-3 grid size-11 place-items-center rounded-full text-[#f8e7c4] shadow-md ring-2 ring-[#f4c56a]/60 ring-offset-2 ring-offset-transparent sm:left-4 sm:top-4 sm:size-12">
                <Icone className="size-6" />
              </span>
              <span className="font-script text-lg text-l-trigo">{qtd} estampas</span>
              <span className="mt-1 flex items-end justify-between gap-2">
                <span className="font-display text-xl uppercase leading-none sm:text-3xl">{c.nome}</span>
                <ArrowUpRight className="size-6 shrink-0 text-l-vermelho transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
              </span>
              <span className="mt-2 hidden text-sm text-l-areia sm:block">{c.chamada}</span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

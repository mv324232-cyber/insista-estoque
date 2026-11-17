"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ArrowDown, ShieldCheck, Sun, Truck } from "lucide-react";
import { LOJA, imagem, linkWhatsapp, precoTexto, produtoPorCodigo } from "../config";
import { PRODUTOS } from "../produtos";
import { IconeWhatsapp } from "./icones";

const DESTAQUES = ["09", "64", "14", "02", "57", "11", "51", "82"];

const linha = {
  oculto: { y: "110%" },
  visivel: (i: number) => ({ y: "0%", transition: { duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] as const } }),
};

export function Hero() {
  const reduzir = useReducedMotion();
  const [atual, setAtual] = useState(0);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const girarY = useTransform(sx, [-1, 1], [-8, 8]);
  const girarX = useTransform(sy, [-1, 1], [6, -6]);
  const fundoX = useTransform(sx, [-1, 1], [14, -14]);

  useEffect(() => {
    if (reduzir) return;
    const t = setInterval(() => setAtual((a) => (a + 1) % DESTAQUES.length), 3800);
    return () => clearInterval(t);
  }, [reduzir]);

  const produto = produtoPorCodigo(DESTAQUES[atual])!;
  const atras = [DESTAQUES[(atual + 1) % DESTAQUES.length], DESTAQUES[(atual + 2) % DESTAQUES.length]];

  return (
    <section
      className="grao relative flex min-h-[100svh] items-center overflow-hidden pb-16 pt-28 sm:pt-32"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
        my.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
    >
      {/* céu e sol nascendo */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(120%_70%_at_50%_105%,rgb(208_20_47/0.5),rgb(208_20_47/0.12)_38%,transparent_65%),linear-gradient(180deg,var(--color-l-preto)_0%,var(--color-l-carvao)_55%,var(--color-l-couro-2)_100%)]" />
      <motion.div
        aria-hidden
        className="absolute bottom-[34%] left-1/2 -z-10 size-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(255_120_60/0.35),rgb(208_20_47/0.12)_45%,transparent_70%)] blur-2xl"
        animate={reduzir ? undefined : { scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* lavoura em perspectiva */}
      <div aria-hidden className="absolute inset-x-[-40%] bottom-[-10%] -z-10 h-[52%] overflow-hidden [mask-image:linear-gradient(to_top,black_30%,transparent)]">
        <div className="sulcos absolute inset-0" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_46px,rgb(226_182_90/0.07)_46px_48px)] [transform:perspective(420px)_rotateX(62deg)] [transform-origin:50%_0]" />
      </div>
      {/* palavra gigante ao fundo */}
      <motion.p
        aria-hidden
        style={{ x: fundoX }}
        className="texto-contorno pointer-events-none absolute left-1/2 top-[18%] -z-10 -translate-x-1/2 select-none whitespace-nowrap font-display text-[26vw] uppercase leading-none text-l-tinta/[0.06] lg:text-[19vw]"
      >
        Insista
      </motion.p>

      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
        <div className="relative z-10 text-center lg:text-left">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-l-trigo/30 bg-l-trigo/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-l-trigo"
          >
            <span className="size-1.5 rounded-full bg-l-vermelho" /> Coleção Agro • {PRODUTOS.length} estampas
          </motion.p>
          <h1 className="font-display text-[15vw] uppercase leading-[0.86] tracking-wide sm:text-[11vw] lg:text-[7.4rem]">
            {["Vista a", "força do", "campo."].map((t, i) => (
              <span key={t} className="-mb-[0.08em] block overflow-hidden pb-[0.1em]">
                <motion.span
                  className={`block ${i === 2 ? "text-l-vermelho" : ""}`}
                  variants={linha}
                  initial={reduzir ? false : "oculto"}
                  animate="visivel"
                  custom={i}
                >
                  {t}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
            className="mx-auto mt-6 max-w-xl text-lg text-l-areia lg:mx-0"
          >
            Camisetas manga longa com <strong className="text-l-creme">estampa total</strong>, feitas para quem vive o agro de verdade:
            do trator ao curral, da lavoura à cavalgada.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <a
              href="#catalogo"
              className="group inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-l-vermelho px-7 font-bold uppercase tracking-wider text-white shadow-[0_12px_30px_-10px_rgb(208_20_47/0.9)] transition hover:bg-l-vermelho-escuro sm:w-auto"
            >
              Ver catálogo <ArrowDown className="size-5 transition group-hover:translate-y-0.5" />
            </a>
            <a
              href={linkWhatsapp("Olá, Insista! Quero fazer um pedido.")}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-l-tinta/20 px-7 font-bold uppercase tracking-wider transition hover:border-[#25d366] hover:text-[#25d366] sm:w-auto"
            >
              <IconeWhatsapp /> Pedir no WhatsApp
            </a>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-l-areia lg:justify-start"
          >
            <li className="flex items-center gap-1.5"><Sun className="size-4 text-l-trigo" /> Proteção UV50+</li>
            <li className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-l-trigo" /> Estampa que não desbota</li>
            <li className="flex items-center gap-1.5"><Truck className="size-4 text-l-trigo" /> Envio para todo o Brasil</li>
          </motion.ul>
        </div>

        {/* vitrine giratória */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ rotateY: girarY, rotateX: girarX, transformPerspective: 1100 }}
          className="relative mx-auto aspect-[10/8] w-full max-w-[620px]"
        >
          {atras.map((c, i) => (
            <div
              key={`${c}-${i}`}
              className="absolute inset-x-[12%] top-[2%] opacity-35 blur-[1.5px] transition-transform duration-700"
              style={{ transform: `translateX(${i === 0 ? "-24%" : "24%"})` }}
            >
              <div className="flutuar" style={{ ["--giro" as string]: i === 0 ? "-9deg" : "8deg", animationDelay: `${i * -2}s` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagem(c, "camiseta-p")} alt="" className="w-full" />
              </div>
            </div>
          ))}
          <div className="absolute inset-x-[8%] bottom-[12%] h-[12%] rounded-[50%] bg-black/70 blur-2xl" />
          <AnimatePresence mode="popLayout">
            <motion.div
              key={produto.codigo}
              initial={reduzir ? false : { opacity: 0, x: 80, rotate: 6, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, x: -80, rotate: -6, scale: 0.9 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Link href={`/produto/${produto.codigo}`} className="block w-full drop-shadow-[0_30px_40px_rgb(0_0_0/0.65)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagem(produto.codigo, "camiseta")}
                  alt={`Camiseta ${produto.nome}`}
                  width={produto.w}
                  height={produto.h}
                  fetchPriority={atual === 0 ? "high" : "auto"}
                  className="w-full"
                />
              </Link>
            </motion.div>
          </AnimatePresence>

          <div className="absolute -bottom-2 left-1/2 flex w-[92%] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-l-tinta/10 bg-l-preto/70 px-4 py-3 backdrop-blur">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-l-trigo">Cód. {produto.codigo}</p>
              <p className="truncate font-bold">{produto.nome}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] uppercase text-l-areia">por apenas</p>
              <p className="font-display text-2xl text-l-creme">{precoTexto(LOJA.preco)}</p>
            </div>
          </div>
          <div className="absolute -bottom-9 left-1/2 flex -translate-x-1/2 gap-1.5" role="tablist" aria-label="Destaques">
            {DESTAQUES.map((c, i) => (
              <button
                key={c}
                role="tab"
                aria-selected={i === atual}
                aria-label={`Ver destaque ${i + 1}`}
                onClick={() => setAtual(i)}
                className={`h-1.5 rounded-full transition-all ${i === atual ? "w-7 bg-l-vermelho" : "w-1.5 bg-l-tinta/30"}`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

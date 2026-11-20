"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowDown, ShieldCheck, Sun, Truck } from "lucide-react";
import { LOJA, imagem, linkWhatsapp, precoTexto, produtoPorCodigo } from "../config";
import { PRODUTOS } from "../produtos";
import { CenaCampo } from "./cena-campo";
import { IconeWhatsapp } from "./icones";

/** Vídeo de máquinas na lavoura. Escolhe a versão pela tela, entra com fade quando
 *  estiver pronto e é pulado em "economia de dados" ou "movimento reduzido". */
function VideoFundo() {
  const reduzir = useReducedMotion();
  const [src, setSrc] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const v = LOJA.videoHero;
    if (!v || reduzir) return;
    const conexao = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conexao?.saveData) return;
    setSrc(window.matchMedia("(min-width: 768px)").matches ? v.computador : v.celular);
  }, [reduzir]);

  if (!src) return null;
  return (
    <video
      className={`absolute inset-0 size-full object-cover transition-opacity duration-1000 ${pronto ? "opacity-100" : "opacity-0"}`}
      poster={LOJA.videoHero?.capa}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      onCanPlay={() => setPronto(true)}
      aria-hidden
    >
      <source src={`${src}.webm`} type="video/webm" />
      <source src={`${src}.mp4`} type="video/mp4" />
    </video>
  );
}

const DESTAQUES = ["09", "64", "14", "02", "57", "11", "51", "98"];

const linha = {
  oculto: { y: "105%" },
  visivel: (i: number) => ({ y: "0%", transition: { duration: 0.9, delay: 0.2 + i * 0.13, ease: [0.22, 1, 0.36, 1] as const } }),
};

export function Hero() {
  const reduzir = useReducedMotion();
  const [atual, setAtual] = useState(0);
  const { scrollY } = useScroll();
  const fundoY = useTransform(scrollY, [0, 800], [0, 160]);
  const textoY = useTransform(scrollY, [0, 800], [0, -60]);

  useEffect(() => {
    if (reduzir) return;
    const t = setInterval(() => setAtual((a) => (a + 1) % DESTAQUES.length), 4200);
    return () => clearInterval(t);
  }, [reduzir]);

  const produto = produtoPorCodigo(DESTAQUES[atual])!;

  return (
    <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden pb-24 pt-28 text-[#f8f2e7] sm:items-center sm:pb-20">
      {/* fundo: vídeo (se configurado) ou cena animada de campo */}
      <motion.div style={{ y: reduzir ? 0 : fundoY }} className="absolute inset-0 -z-20">
        <CenaCampo />
        <VideoFundo />
      </motion.div>
      {/* no celular o texto ocupa a tela toda: escurece um pouco mais */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[rgb(24_12_6/0.4)] sm:hidden" />
      {/* sombra quente para dar leitura ao texto */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(30_14_6/0.72)_0%,rgb(30_14_6/0.38)_40%,transparent_62%),linear-gradient(0deg,rgb(24_12_6/0.55)_0%,transparent_30%),linear-gradient(180deg,rgb(24_12_6/0.45)_0%,transparent_22%)]" />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <motion.div style={{ y: reduzir ? 0 : textoY }} className="relative z-10 [text-shadow:0_2px_14px_rgb(20_8_2/0.7)]">
          <motion.p
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="font-script text-2xl text-[#f4c56a] sm:text-3xl"
          >
            Feita pra quem vive o agro
          </motion.p>
          <h1 className="mt-2 font-display text-[2.75rem] uppercase leading-[0.95] sm:text-6xl lg:text-[5.2rem]">
            {["Vista a força", "do campo."].map((t, i) => (
              <span key={t} className="block overflow-hidden pb-[0.08em]">
                <motion.span
                  className={`block ${i === 1 ? "text-[#f4c56a]" : ""}`}
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
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-5 max-w-xl text-lg leading-relaxed text-[#f8f2e7]/85"
          >
            Camisetas manga longa com estampa total, do trator ao curral, da lavoura à cavalgada.{" "}
            <strong className="text-[#f8f2e7]">{PRODUTOS.length} estampas</strong> por {precoTexto(LOJA.preco)} cada.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.6 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <a
              href="#catalogo"
              className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-l-vermelho px-7 font-bold uppercase tracking-wide text-white shadow-[0_12px_30px_-10px_rgb(200_16_46/0.9)] transition hover:bg-l-vermelho-escuro"
            >
              Ver as estampas <ArrowDown className="size-5 transition group-hover:translate-y-0.5" />
            </a>
            <a
              href={linkWhatsapp("Olá, Insista! Quero fazer um pedido.")}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-[#f8f2e7]/40 bg-black/20 px-7 font-bold uppercase tracking-wide backdrop-blur-sm transition hover:border-[#25d366] hover:text-[#25d366]"
            >
              <IconeWhatsapp /> Pedir no WhatsApp
            </a>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05 }}
            className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[#f8f2e7]/80"
          >
            <li className="flex items-center gap-1.5"><Sun className="size-4 text-[#f4c56a]" /> Proteção UV50+</li>
            <li className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-[#f4c56a]" /> Estampa que não desbota</li>
            <li className="flex items-center gap-1.5"><Truck className="size-4 text-[#f4c56a]" /> Envio para todo o Brasil</li>
          </motion.ul>
        </motion.div>

        {/* camisetas em destaque, pousadas no campo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto hidden aspect-[10/8] w-full max-w-[560px] sm:block"
        >
          <div className="absolute inset-x-[10%] bottom-[14%] h-[10%] rounded-[50%] bg-black/60 blur-2xl" />
          <AnimatePresence mode="popLayout">
            <motion.div
              key={produto.codigo}
              initial={reduzir ? false : { opacity: 0, y: 30, rotate: 4, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, rotate: -4, scale: 0.94 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Link href={`/produto/${produto.codigo}`} className="flutuar block w-full drop-shadow-[0_30px_35px_rgb(0_0_0/0.6)]">
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
          <div className="absolute -bottom-3 left-1/2 flex w-[90%] -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#f4c56a]/30 bg-[#1e1209]/80 px-4 py-3 backdrop-blur">
            <span className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-dashed border-[#f4c56a]/70 font-display text-sm text-[#f4c56a]">
              {produto.codigo}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-script text-sm text-[#f4c56a]">Destaque da coleção</p>
              <p className="truncate font-bold">{produto.nome}</p>
            </div>
            <p className="shrink-0 font-display text-xl">{precoTexto(LOJA.preco)}</p>
          </div>
          <div className="absolute -bottom-10 left-1/2 flex -translate-x-1/2 gap-1.5" role="tablist" aria-label="Destaques">
            {DESTAQUES.map((c, i) => (
              <button
                key={c}
                role="tab"
                aria-selected={i === atual}
                aria-label={`Ver destaque ${i + 1}`}
                onClick={() => setAtual(i)}
                className={`h-1.5 rounded-full transition-all ${i === atual ? "w-7 bg-[#f4c56a]" : "w-1.5 bg-[#f8f2e7]/40"}`}
              />
            ))}
          </div>
        </motion.div>
      </div>

      <a href="#colecoes" aria-label="Rolar para as coleções" className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-xs font-semibold text-[#f8f2e7]/70 sm:flex">
        <span className="font-script text-base">role e escolha</span>
        <ArrowDown className="size-5 animate-bounce" />
      </a>
    </section>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { LOJA, linkWhatsapp } from "../config";
import { BotaoTema } from "@/components/tema";
import { useSacola } from "../sacola";
import { Espiga, IconeWhatsapp } from "./icones";

const LINKS = [
  { href: "/#colecoes", rotulo: "Coleções" },
  { href: "/#catalogo", rotulo: "Catálogo" },
  { href: "/#medidas", rotulo: "Medidas" },
  { href: "/#como-comprar", rotulo: "Como comprar" },
];

export function Marca({ compacta = false, sobreFoto = false }: { compacta?: boolean; sobreFoto?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-10 place-items-center rounded-xl bg-l-vermelho text-white shadow-[0_6px_20px_-6px_rgb(208_20_47/0.8)]">
        <Espiga className="size-7" />
      </span>
      <span className="leading-none">
        <span className="block font-display text-2xl uppercase">Insista</span>
        {!compacta && <span className={`hidden whitespace-nowrap font-script text-sm sm:block ${sobreFoto ? "text-[#f4c56a]" : "text-l-trigo"}`}>agro • manga longa</span>}
      </span>
    </span>
  );
}

export function Cabecalho() {
  const { totalPecas, abrir, pulso } = useSacola();
  const [rolou, setRolou] = useState(false);
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  // no topo da página inicial o cabeçalho fica sobre a cena de campo (escura)
  const sobreFoto = pathname === "/" && !rolou && !menu;

  useEffect(() => {
    const f = () => setRolou(window.scrollY > 24);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        rolou || menu ? "border-b border-l-tinta/10 bg-l-preto/90 text-l-creme backdrop-blur-md" : sobreFoto ? "bg-transparent text-[#f8f2e7]" : "bg-transparent text-l-creme"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <Link href="/" aria-label="Insista — início" onClick={() => setMenu(false)}>
          <Marca sobreFoto={sobreFoto} />
        </Link>
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Principal">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="group relative text-sm font-bold uppercase tracking-wide opacity-85 hover:opacity-100">
              {l.rotulo}
              <span className="absolute -bottom-1.5 left-0 h-0.5 w-0 bg-l-vermelho transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={linkWhatsapp("Olá, Insista! Vi o catálogo e quero saber mais.")}
            target="_blank"
            rel="noopener"
            className="hidden items-center gap-2 rounded-full border border-current/25 px-4 py-2.5 text-sm font-bold hover:border-[#25d366] hover:text-[#25d366] sm:flex"
          >
            <IconeWhatsapp /> {LOJA.whatsappExibicao}
          </a>
          <BotaoTema className="border border-current/25 hover:!bg-current/10" />
          <motion.button
            key={pulso}
            initial={pulso ? { scale: 0.8 } : false}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 12 }}
            onClick={abrir}
            className={`relative grid size-11 place-items-center rounded-full ${sobreFoto ? "bg-[#f8f2e7] text-[#1b1612]" : "bg-l-creme text-l-preto"}`}
            aria-label={`Abrir sacola (${totalPecas} peças)`}
          >
            <ShoppingBag className="size-5" />
            {totalPecas > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-l-vermelho px-1 text-xs font-bold text-white">
                {totalPecas}
              </span>
            )}
          </motion.button>
          <button
            className="grid size-11 place-items-center rounded-full border border-current/25 lg:hidden"
            onClick={() => setMenu((m) => !m)}
            aria-label={menu ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menu}
          >
            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menu && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-l-tinta/10 lg:hidden"
            aria-label="Menu"
          >
            <div className="flex flex-col px-4 py-3">
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenu(false)}
                  initial={{ x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.05 * i }}
                  className="border-b border-l-tinta/5 py-4 font-display text-2xl uppercase"
                >
                  {l.rotulo}
                </motion.a>
              ))}
              <a
                href={linkWhatsapp("Olá, Insista! Vi o catálogo e quero saber mais.")}
                target="_blank"
                rel="noopener"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#25d366] py-4 font-bold text-l-preto"
              >
                <IconeWhatsapp /> Falar no WhatsApp
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export function BotaoWhatsFlutuante() {
  return (
    <motion.a
      href={linkWhatsapp("Olá, Insista! Vi o catálogo e quero fazer um pedido.")}
      target="_blank"
      rel="noopener"
      aria-label="Pedir pelo WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.2, type: "spring" }}
      className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-[#25d366] text-white shadow-[0_10px_30px_-8px_rgb(37_211_102/0.7)] hover:scale-105 sm:size-16"
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-[#25d366] opacity-30" />
      <IconeWhatsapp className="relative size-8" />
    </motion.a>
  );
}

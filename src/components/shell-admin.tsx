"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingBag,
  Shirt,
  Users,
} from "lucide-react";
import { useAuth } from "./auth";
import { Logo } from "./logo";
import { BotaoTema } from "./tema";
import { cx, Dialogo } from "./ui";

const ITENS = [
  { href: "/admin", rotulo: "Painel", icone: LayoutDashboard, principal: true },
  { href: "/admin/vendas", rotulo: "Vendas", icone: History, principal: true },
  { href: "/admin/estoque", rotulo: "Estoque", icone: Boxes, principal: true },
  { href: "/vender", rotulo: "Dar baixa", icone: ShoppingBag, principal: true },
  { href: "/admin/produtos", rotulo: "Produtos", icone: Shirt },
  { href: "/admin/vendedores", rotulo: "Vendedores", icone: Users },
  { href: "/admin/relatorios", rotulo: "Relatórios", icone: BarChart3 },
  { href: "/admin/auditoria", rotulo: "Auditoria", icone: ClipboardList },
] as const;

function ativo(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function ShellAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { perfil, sair } = useAuth();
  const [mais, setMais] = useState(false);

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Lateral (computador) */}
      <aside className="nao-imprimir fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-borda bg-superficie p-4 lg:flex">
        <Link href="/admin" className="mb-6 px-2">
          <Logo subtitulo="Painel do dono" />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {ITENS.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={cx(
                "flex min-h-12 items-center gap-3 rounded-tema px-3 font-semibold",
                ativo(pathname, i.href) ? "bg-primaria text-primaria-texto" : "hover:bg-superficie-2",
              )}
            >
              <i.icone className="size-5" /> {i.rotulo}
            </Link>
          ))}
        </nav>
        <div className="border-t border-borda pt-3">
          <p className="truncate px-2 text-sm font-semibold">{perfil?.nome}</p>
          <div className="mt-1 flex items-center gap-1">
            <BotaoTema />
            <button
              onClick={sair}
              className="flex min-h-11 flex-1 items-center gap-2 rounded-tema px-3 font-semibold hover:bg-superficie-2"
            >
              <LogOut className="size-5" /> Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Topo (celular) */}
      <header className="nao-imprimir sticky top-0 z-30 flex items-center justify-between border-b border-borda bg-superficie/95 px-3 py-2 backdrop-blur lg:hidden">
        <Link href="/admin">
          <Logo subtitulo="Painel do dono" />
        </Link>
        <BotaoTema />
      </header>

      <main className="mx-auto w-full max-w-7xl px-3 py-4 pb-seguro sm:px-5 lg:py-6 lg:pb-8">{children}</main>

      {/* Barra inferior (celular) */}
      <nav className="nao-imprimir barra-inferior fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-borda bg-superficie lg:hidden">
        {ITENS.filter((i) => "principal" in i).map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={cx(
              "flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold",
              ativo(pathname, i.href) ? "text-primaria" : "text-suave",
            )}
          >
            <i.icone className="size-6" />
            {i.rotulo}
          </Link>
        ))}
        <button
          onClick={() => setMais(true)}
          className="flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold text-suave"
        >
          <Menu className="size-6" /> Mais
        </button>
      </nav>

      <Dialogo aberto={mais} aoFechar={() => setMais(false)} titulo="Menu">
        <div className="grid grid-cols-1 gap-2">
          {ITENS.filter((i) => !("principal" in i)).map((i) => (
            <Link
              key={i.href}
              href={i.href}
              onClick={() => setMais(false)}
              className="flex min-h-14 items-center gap-3 rounded-tema border-2 border-borda px-4 text-lg font-semibold"
            >
              <i.icone className="size-6" /> {i.rotulo}
            </Link>
          ))}
          <button
            onClick={sair}
            className="flex min-h-14 items-center gap-3 rounded-tema border-2 border-borda px-4 text-lg font-semibold text-perigo"
          >
            <LogOut className="size-6" /> Sair ({perfil?.nome})
          </button>
        </div>
      </Dialogo>
    </div>
  );
}


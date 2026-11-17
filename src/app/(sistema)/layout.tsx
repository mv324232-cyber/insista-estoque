import type { Metadata } from "next";
import { Provedores } from "@/components/provedores";

export const metadata: Metadata = {
  title: { default: "Insista — Estoque e Vendas", template: "%s · Insista" },
  robots: { index: false, follow: false },
};

/** Área da equipe (login, vendas, painel): autenticação, avisos e modo offline. */
export default function LayoutSistema({ children }: { children: React.ReactNode }) {
  return <Provedores>{children}</Provedores>;
}

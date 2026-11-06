import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { Provedores } from "@/components/provedores";
import { SCRIPT_TEMA } from "@/components/tema";
import "./globals.css";

const texto = Inter({ variable: "--font-texto", subsets: ["latin"] });
const titulo = Barlow_Condensed({
  variable: "--font-titulo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Insista — Estoque e Vendas", template: "%s · Insista" },
  description: "Controle de estoque e baixa de vendas da Insista.",
  applicationName: "Insista",
  appleWebApp: { capable: true, title: "Insista", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${texto.variable} ${titulo.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-dvh">
        <Provedores>{children}</Provedores>
      </body>
    </html>
  );
}

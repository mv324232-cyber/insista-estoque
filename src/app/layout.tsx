import type { Metadata, Viewport } from "next";
import { Anton, Barlow_Condensed, Inter } from "next/font/google";
import { SCRIPT_TEMA } from "@/components/tema";
import "./globals.css";

const texto = Inter({ variable: "--font-texto", subsets: ["latin"] });
const titulo = Barlow_Condensed({
  variable: "--font-titulo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});
const display = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://insista-estoque.vercel.app"),
  title: { default: "Insista — Camisetas Agro Manga Longa", template: "%s · Insista" },
  description: "Camisetas manga longa agro com estampa total, proteção UV50+ e tecido dry. 75 estampas exclusivas por R$ 49,90.",
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
    <html lang="pt-BR" className={`${texto.variable} ${titulo.variable} ${display.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

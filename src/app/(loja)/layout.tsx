import { ProvedorSacola } from "@/catalogo/sacola";
import { BotaoWhatsFlutuante, Cabecalho } from "@/catalogo/ui/cabecalho";
import { CompraRapida } from "@/catalogo/ui/compra-rapida";
import { SacolaGaveta } from "@/catalogo/ui/sacola-gaveta";
import { Rodape } from "@/catalogo/ui/secoes";

/** Loja pública (catálogo). Visual próprio, independente do tema do sistema. */
export default function LayoutLoja({ children }: { children: React.ReactNode }) {
  return (
    <ProvedorSacola>
      <div className="loja min-h-dvh overflow-x-clip font-sans">
        <a href="#catalogo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-l-creme focus:px-4 focus:py-2 focus:text-l-preto">
          Pular para o catálogo
        </a>
        <Cabecalho />
        <main>{children}</main>
        <Rodape />
        <BotaoWhatsFlutuante />
        <SacolaGaveta />
        <CompraRapida />
      </div>
    </ProvedorSacola>
  );
}

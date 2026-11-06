"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, LayoutDashboard, LogOut, Package, ShoppingBag } from "lucide-react";
import { useAuth } from "@/components/auth";
import { useAviso } from "@/components/avisos";
import { useFila, useSincronizacaoAutomatica } from "@/components/conexao";
import { Emblema } from "@/components/logo";
import { StatusConexao } from "@/components/status";
import { BotaoTema } from "@/components/tema";
import { Aviso, Botao, Dialogo, cx } from "@/components/ui";
import { AbaHistorico } from "@/components/vender/aba-historico";
import { AbaVender, ListaProdutos } from "@/components/vender/aba-vender";
import { useCatalogo } from "@/components/vender/use-catalogo";
import { aoSincronizar } from "@/lib/offline/sincronizar";
import { dataHora } from "@/lib/formato";

type Aba = "vender" | "estoque" | "historico";

export default function PaginaVender() {
  const { perfil, sair, semConfirmacao } = useAuth();
  const avisar = useAviso();
  const [aba, setAba] = useState<Aba>("vender");
  const [chave, setChave] = useState(0); // reinicia a aba "vender" ao tocar nela de novo
  const [menu, setMenu] = useState(false);
  const fila = useFila(perfil?.id);
  const { produtos, carregando, atualizadoEm } = useCatalogo(perfil?.id);
  useSincronizacaoAutomatica(perfil?.id);

  // avisa quando baixas guardadas forem enviadas automaticamente
  useEffect(
    () =>
      aoSincronizar((r) => {
        if (r.origem === "manual") return;
        if (r.enviadas > 0 && document.visibilityState === "visible") {
          avisar(`${r.enviadas} baixa(s) pendente(s) enviada(s) com sucesso`);
        }
        if (r.rejeitadas > 0) avisar(`${r.rejeitadas} baixa(s) não aceita(s). Veja o Histórico.`, "erro");
      }),
    [avisar],
  );

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [aba]);

  const pendentes = fila.length;

  const abas: { id: Aba; rotulo: string; icone: typeof ShoppingBag }[] = [
    { id: "vender", rotulo: "Vender", icone: ShoppingBag },
    { id: "estoque", rotulo: "Estoque", icone: Package },
    { id: "historico", rotulo: "Histórico", icone: History },
  ];

  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-borda bg-superficie/95 px-3 py-2 backdrop-blur">
        <button onClick={() => setMenu(true)} className="flex min-w-0 items-center gap-2 text-left" aria-label="Menu">
          <Emblema className="size-10 shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-bold">{perfil?.nome.split(" ")[0]}</span>
            <span className="block text-xs font-semibold uppercase tracking-wide text-suave">Insista</span>
          </span>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <StatusConexao aoClicar={() => setAba("historico")} />
          <BotaoTema />
        </div>
      </header>

      <main className="px-3 pt-4 pb-seguro">
        {semConfirmacao && (
          <Aviso className="mb-3">Modo offline: você pode continuar dando baixa. Tudo será enviado quando a conexão voltar.</Aviso>
        )}
        {aba === "vender" && (
          <>
            <h1 className="mb-3 font-marca text-3xl font-bold uppercase tracking-wide">Dar baixa</h1>
            <AbaVender key={chave} produtos={produtos} carregando={carregando} />
          </>
        )}
        {aba === "estoque" && (
          <>
            <h1 className="mb-1 font-marca text-3xl font-bold uppercase tracking-wide">Estoque</h1>
            <p className="mb-3 text-sm text-suave">
              {atualizadoEm ? `Atualizado em ${dataHora(atualizadoEm)}` : "Ainda não sincronizado"}
              {pendentes > 0 && " · já descontando as baixas pendentes"}
            </p>
            <ListaProdutos produtos={produtos} carregando={carregando} modoConsulta />
          </>
        )}
        {aba === "historico" && (
          <>
            <h1 className="mb-3 font-marca text-3xl font-bold uppercase tracking-wide">Histórico</h1>
            <AbaHistorico />
          </>
        )}
      </main>

      <nav className="barra-inferior fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-superficie">
        <div className="mx-auto grid max-w-2xl grid-cols-3">
          {abas.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                if (a.id === "vender" && aba === "vender") setChave((c) => c + 1);
                setAba(a.id);
              }}
              aria-current={aba === a.id ? "page" : undefined}
              className={cx(
                "relative flex min-h-[4.5rem] flex-col items-center justify-center gap-0.5 text-sm font-bold",
                aba === a.id ? "text-primaria" : "text-suave",
              )}
            >
              {aba === a.id && <span className="absolute inset-x-6 top-0 h-1 rounded-b-full bg-primaria" />}
              <a.icone className="size-7" />
              {a.rotulo}
              {a.id === "historico" && pendentes > 0 && (
                <span className="num absolute right-[calc(50%-1.9rem)] top-2 grid min-w-6 place-items-center rounded-full bg-alerta px-1.5 text-xs text-white dark:text-fundo">
                  {pendentes}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <Dialogo aberto={menu} aoFechar={() => setMenu(false)} titulo={perfil?.nome ?? "Menu"}>
        <div className="grid gap-2">
          {perfil?.papel === "admin" && (
            <Link
              href="/admin"
              className="flex min-h-14 items-center gap-3 rounded-tema border-2 border-borda px-4 text-lg font-semibold"
            >
              <LayoutDashboard className="size-6" /> Painel do dono
            </Link>
          )}
          {pendentes > 0 && (
            <Aviso>
              Você tem {pendentes} baixa(s) ainda não enviada(s). Não saia da conta até elas serem enviadas, senão ficam só
              neste aparelho.
            </Aviso>
          )}
          <Botao
            variante="secundario"
            tamanho="lg"
            onClick={async () => {
              if (pendentes > 0 && !confirm("Há baixas não enviadas. Sair mesmo assim? Elas continuarão guardadas neste aparelho.")) return;
              await sair();
            }}
          >
            <LogOut className="size-5" /> Sair
          </Botao>
        </div>
      </Dialogo>
    </div>
  );
}

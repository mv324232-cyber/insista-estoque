"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Copy, Download, Share, SquarePlus, X } from "lucide-react";
import { Botao, Dialogo, cx } from "./ui";

/* ------------------------------------------------------------------ *
 * O Chrome/Edge/Samsung (Android e computador) avisam que o app pode  *
 * ser instalado com o evento "beforeinstallprompt", que costuma vir   *
 * logo no carregamento. Guardamos ele aqui, fora dos componentes.     *
 * ------------------------------------------------------------------ */
interface EventoInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let eventoGuardado: EventoInstalacao | null = null;
let instalado = false;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    eventoGuardado = e as EventoInstalacao;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    instalado = true;
    eventoGuardado = null;
    avisar();
  });
}

type Modo = "instalado" | "pronto" | "iphone" | "navegador-interno" | "manual";

function detectar(): Modo {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (instalado || nav.standalone || matchMedia("(display-mode: standalone)").matches) return "instalado";
  const ua = navigator.userAgent;
  // navegadores dentro de outros apps (WhatsApp, Instagram, Facebook...) não instalam
  if (/WhatsApp|Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|; wv\)/i.test(ua)) return "navegador-interno";
  if (eventoGuardado) return "pronto";
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iphone";
  return "manual";
}

function assinar(f: () => void) {
  ouvintes.add(f);
  const mq = matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", f);
  return () => {
    ouvintes.delete(f);
    mq.removeEventListener("change", f);
  };
}

export function useInstalacao() {
  const modo = useSyncExternalStore<Modo>(assinar, detectar, () => "instalado");
  async function instalar() {
    if (!eventoGuardado) return false;
    await eventoGuardado.prompt();
    const { outcome } = await eventoGuardado.userChoice;
    eventoGuardado = null;
    avisar();
    return outcome === "accepted";
  }
  return { modo, instalar };
}

/** Botão "Instalar app" — some quando o app já está instalado. */
export function BotaoInstalar({
  className,
  bloco = true,
  rotulo = "Instalar app no celular",
}: {
  className?: string;
  bloco?: boolean;
  rotulo?: string;
}) {
  const { modo, instalar } = useInstalacao();
  const [ajuda, setAjuda] = useState(false);
  if (modo === "instalado") return null;

  return (
    <>
      <Botao
        type="button"
        variante="secundario"
        tamanho="lg"
        bloco={bloco}
        className={className}
        onClick={async () => {
          if (modo === "pronto") {
            const ok = await instalar();
            if (!ok) setAjuda(true);
          } else setAjuda(true);
        }}
      >
        <Download className="size-5" /> {rotulo}
      </Botao>
      <Dialogo aberto={ajuda} aoFechar={() => setAjuda(false)} titulo="Instalar o app">
        <InstrucoesInstalacao modo={modo} />
      </Dialogo>
    </>
  );
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primaria font-bold text-primaria-texto">{n}</span>
      <span className="pt-1">{children}</span>
    </li>
  );
}

export function InstrucoesInstalacao({ modo }: { modo: Modo }) {
  const [copiado, setCopiado] = useState(false);
  const link = typeof window !== "undefined" ? window.location.origin : "";

  if (modo === "navegador-interno") {
    return (
      <div className="space-y-4">
        <p className="text-lg font-semibold">Você abriu o link dentro de outro aplicativo (ex.: WhatsApp).</p>
        <p>Por aqui não dá para instalar. Abra no navegador do celular:</p>
        <ol className="space-y-3">
          <Passo n={1}>
            Toque nos <strong>⋮</strong> ou no ícone de <strong>navegador</strong> no canto da tela e escolha{" "}
            <strong>“Abrir no Chrome”</strong> (Android) ou <strong>“Abrir no Safari”</strong> (iPhone).
          </Passo>
          <Passo n={2}>Ou copie o link abaixo e cole no Chrome / Safari.</Passo>
        </ol>
        <Botao
          variante="primario"
          tamanho="lg"
          bloco
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopiado(true);
            } catch {
              prompt("Copie o link:", link);
            }
          }}
        >
          <Copy className="size-5" /> {copiado ? "Link copiado!" : "Copiar link"}
        </Botao>
        <p className="break-all text-center text-sm text-suave">{link}</p>
      </div>
    );
  }

  if (modo === "iphone") {
    return (
      <div className="space-y-4">
        <p className="font-semibold">No iPhone, a instalação é pelo <strong>Safari</strong>:</p>
        <ol className="space-y-3">
          <Passo n={1}>
            Toque no botão <strong>Compartilhar</strong> <Share className="inline size-5 align-text-bottom" /> (quadrado com seta
            para cima, na barra de baixo ou de cima).
          </Passo>
          <Passo n={2}>
            Role a lista e toque em <strong>Adicionar à Tela de Início</strong>{" "}
            <SquarePlus className="inline size-5 align-text-bottom" />.
          </Passo>
          <Passo n={3}>
            Toque em <strong>Adicionar</strong>. O ícone da Insista aparece na tela do celular.
          </Passo>
        </ol>
        <p className="rounded-tema bg-superficie-2 p-3 text-sm">
          Está no Chrome do iPhone? Toque no botão Compartilhar (ao lado do endereço) → <strong>Adicionar à Tela de Início</strong>.
          Se não aparecer, abra o link no Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-semibold">No Android, pelo <strong>Chrome</strong>:</p>
      <ol className="space-y-3">
        <Passo n={1}>
          Toque nos <strong>⋮</strong> (três pontinhos, no canto de cima à direita).
        </Passo>
        <Passo n={2}>
          Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong> → <strong>Instalar</strong>.
        </Passo>
        <Passo n={3}>O ícone da Insista aparece na tela do celular. Abra sempre por ele.</Passo>
      </ol>
      <p className="rounded-tema bg-superficie-2 p-3 text-sm">
        Se a opção não aparecer: atualize o Chrome na Play Store, recarregue a página e espere alguns segundos. No navegador
        Samsung: menu <strong>≡</strong> → <strong>Adicionar página a</strong> → <strong>Tela inicial</strong>.
      </p>
    </div>
  );
}

/** Faixa discreta no topo do app do vendedor, enquanto não estiver instalado. */
export function FaixaInstalar() {
  const { modo } = useInstalacao();
  const [fechada, setFechada] = useState(true);
  useEffect(() => {
    setFechada(sessionStorage.getItem("insista:faixa-instalar") === "fechada");
  }, []);
  if (modo === "instalado" || fechada) return null;
  return (
    <div className={cx("mb-3 flex items-center gap-2 rounded-tema border-2 border-primaria bg-superficie p-2 pl-3")}>
      <p className="flex-1 text-sm font-semibold">Instale o app para abrir mais rápido e usar sem internet.</p>
      <BotaoInstalar bloco={false} rotulo="Instalar" className="min-h-11 shrink-0 px-3 text-sm" />
      <button
        onClick={() => {
          sessionStorage.setItem("insista:faixa-instalar", "fechada");
          setFechada(true);
        }}
        className="grid size-10 place-items-center rounded-full text-suave"
        aria-label="Fechar aviso"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}

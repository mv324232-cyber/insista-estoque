"use client";

import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Loader2, X } from "lucide-react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variante = "primario" | "secundario" | "fantasma" | "perigo" | "destaque";
type Tamanho = "md" | "lg" | "xl" | "sm";

const variantes: Record<Variante, string> = {
  primario: "bg-primaria text-primaria-texto hover:bg-primaria-hover shadow-sm",
  secundario: "bg-superficie text-texto border-2 border-borda hover:bg-superficie-2",
  fantasma: "bg-transparent text-texto hover:bg-superficie-2",
  perigo: "bg-perigo text-white hover:opacity-90 dark:text-fundo",
  destaque: "bg-destaque text-destaque-texto hover:opacity-90",
};
const tamanhos: Record<Tamanho, string> = {
  sm: "min-h-9 px-3 text-sm gap-1.5",
  md: "min-h-12 px-4 text-base gap-2",
  lg: "min-h-14 px-5 text-lg gap-2",
  xl: "min-h-16 px-6 text-xl gap-3",
};

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
  bloco?: boolean;
}

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  { variante = "primario", tamanho = "md", carregando, bloco, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || carregando}
      className={cx(
        "inline-flex items-center justify-center rounded-tema font-semibold transition-colors select-none",
        "disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
        variantes[variante],
        tamanhos[tamanho],
        bloco && "w-full",
        className,
      )}
      {...props}
    >
      {carregando && <Loader2 className="size-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function Rotulo({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cx("mb-1.5 block text-sm font-semibold text-suave", className)}>
      {children}
    </label>
  );
}

const campoBase =
  "w-full rounded-tema border-2 border-borda bg-superficie px-3.5 text-base text-texto placeholder:text-suave/70 focus:border-primaria focus:outline-none disabled:opacity-60";

export const Campo = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Campo(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cx(campoBase, "min-h-12", className)} {...props} />;
});

export function AreaTexto({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(campoBase, "min-h-20 py-2.5", className)} {...props} />;
}

export function Selecao({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(campoBase, "min-h-12 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Cartao({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-tema-g border border-borda bg-superficie p-4", className)}>{children}</div>;
}

type Tom = "neutro" | "sucesso" | "alerta" | "perigo" | "primario";
const tons: Record<Tom, string> = {
  neutro: "bg-superficie-2 text-texto",
  sucesso: "bg-sucesso-fundo text-sucesso",
  alerta: "bg-alerta-fundo text-alerta",
  perigo: "bg-perigo-fundo text-perigo",
  primario: "bg-primaria text-primaria-texto",
};

export function Selo({ children, tom = "neutro", className }: { children: ReactNode; tom?: Tom; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold", tons[tom], className)}>
      {children}
    </span>
  );
}

export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-suave" role="status">
      <Loader2 className="size-5 animate-spin" aria-hidden /> {texto}
    </div>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-tema-g border-2 border-dashed border-borda px-4 py-10 text-center">
      <p className="font-semibold">{titulo}</p>
      {children && <div className="mt-1 text-sm text-suave">{children}</div>}
    </div>
  );
}

export function Aviso({ tom = "alerta", children, className }: { tom?: Tom; children: ReactNode; className?: string }) {
  return <div className={cx("rounded-tema px-3.5 py-3 text-sm font-medium", tons[tom], className)}>{children}</div>;
}

/** Diálogo modal (usa <dialog> nativo). Em telas pequenas aparece como folha inferior. */
export function Dialogo({
  aberto,
  aoFechar,
  titulo,
  children,
  largura = "sm:max-w-lg",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
  largura?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === ref.current) aoFechar();
      }}
      className={cx(
        "m-0 mt-auto w-full max-w-none rounded-t-tema-g bg-superficie p-0 text-texto sm:m-auto sm:rounded-tema-g",
        "max-h-[92dvh]",
        largura,
      )}
    >
      {aberto && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-borda px-4 py-3">
            <h2 className="font-marca text-xl font-bold uppercase tracking-wide">{titulo}</h2>
            <button
              type="button"
              onClick={aoFechar}
              className="grid size-11 place-items-center rounded-full hover:bg-superficie-2"
              aria-label="Fechar"
            >
              <X className="size-6" />
            </button>
          </div>
          <div className="overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export function Titulo({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-marca text-3xl font-bold uppercase tracking-wide">{children}</h1>
      {acao}
    </div>
  );
}

/** Grupo de botões grandes para escolha única (tamanho, forma de pagamento...). */
export function Escolha<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
  desabilitada,
  detalhe,
  colunas = 5,
  nome,
}: {
  opcoes: readonly T[];
  valor: T | null;
  aoMudar: (v: T) => void;
  rotulo?: (v: T) => ReactNode;
  desabilitada?: (v: T) => boolean;
  detalhe?: (v: T) => ReactNode;
  colunas?: number;
  nome: string;
}) {
  return (
    <div role="radiogroup" aria-label={nome} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}>
      {opcoes.map((o) => {
        const ativo = valor === o;
        const off = desabilitada?.(o) ?? false;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={ativo}
            disabled={off}
            onClick={() => aoMudar(o)}
            className={cx(
              "flex min-h-16 flex-col items-center justify-center rounded-tema border-2 px-1 font-bold transition-colors",
              ativo
                ? "border-primaria bg-primaria text-primaria-texto"
                : "border-borda bg-superficie text-texto hover:border-primaria",
              off && "cursor-not-allowed opacity-40 line-through",
            )}
          >
            <span className="text-lg leading-tight">{rotulo ? rotulo(o) : o}</span>
            {detalhe && <span className={cx("text-xs font-semibold", ativo ? "opacity-90" : "text-suave")}>{detalhe(o)}</span>}
          </button>
        );
      })}
    </div>
  );
}

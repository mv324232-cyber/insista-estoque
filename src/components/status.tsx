"use client";

import { CloudOff, CloudUpload, Wifi } from "lucide-react";
import { useAuth } from "./auth";
import { useFila, useOnline } from "./conexao";
import { cx } from "./ui";

/** Selo com o estado da conexão e das baixas pendentes de envio. */
export function StatusConexao({ aoClicar }: { aoClicar?: () => void }) {
  const { perfil } = useAuth();
  const online = useOnline();
  const fila = useFila(perfil?.id);
  const pendentes = fila.filter((b) => b.estado === "pendente").length;
  const rejeitadas = fila.filter((b) => b.estado === "rejeitada").length;

  let tom = "bg-sucesso-fundo text-sucesso";
  let icone = <Wifi className="size-4" />;
  let texto = "Online";
  if (!online) {
    tom = "bg-alerta-fundo text-alerta";
    icone = <CloudOff className="size-4" />;
    texto = "Sem conexão";
  }
  if (pendentes > 0) {
    tom = "bg-alerta-fundo text-alerta";
    icone = <CloudUpload className="size-4" />;
    texto = `${pendentes} pendente${pendentes > 1 ? "s" : ""} de envio`;
  }
  if (rejeitadas > 0) {
    tom = "bg-perigo-fundo text-perigo";
    texto = `${rejeitadas} com problema`;
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      data-testid="status-conexao"
      className={cx("inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold", tom)}
    >
      {icone}
      <span>{texto}</span>
    </button>
  );
}

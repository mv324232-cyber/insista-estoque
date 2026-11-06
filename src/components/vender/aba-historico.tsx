"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudUpload, RefreshCw, Trash2, Undo2 } from "lucide-react";
import { useAuth } from "../auth";
import { useAviso } from "../avisos";
import { useFila } from "../conexao";
import { Aviso, Botao, Dialogo, Selo, Vazio, cx } from "../ui";
import { mensagemErro } from "@/lib/erros";
import { atualizarNaFila, removerDaFila, type BaixaPendente } from "@/lib/offline/fila";
import { gravar, ler } from "@/lib/offline/armazenamento";
import { aoSincronizar, sincronizar } from "@/lib/offline/sincronizar";
import { dataHora, hora, moeda } from "@/lib/formato";
import { hoje } from "@/lib/periodos";
import { supabase } from "@/lib/supabase";
import { ROTULO_FORMA, SELECT_VENDA_DETALHADA, type VendaDetalhada } from "@/lib/tipos";

const PRAZO_MS = 10 * 60 * 1000;

export function AbaHistorico() {
  const { perfil } = useAuth();
  const avisar = useAviso();
  const fila = useFila(perfil?.id);
  const chaveCache = `insista:historico:${perfil?.id}`;
  const [vendas, setVendas] = useState<VendaDetalhada[]>(() => ler<VendaDetalhada[]>(chaveCache, []));
  const [offline, setOffline] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [cancelando, setCancelando] = useState<VendaDetalhada | null>(null);
  const [descartando, setDescartando] = useState<BaixaPendente | null>(null);

  const carregar = useCallback(async () => {
    if (!perfil) return;
    const { data, error } = await supabase()
      .from("vendas")
      .select(SELECT_VENDA_DETALHADA)
      .eq("vendedor_id", perfil.id)
      .order("vendida_em", { ascending: false })
      .limit(100);
    if (error) {
      setOffline(true);
      return;
    }
    setOffline(false);
    setVendas(data as VendaDetalhada[]);
    gravar(chaveCache, data);
  }, [perfil, chaveCache]);

  useEffect(() => {
    carregar();
    const parar = aoSincronizar((r) => {
      if (r.enviadas || r.rejeitadas) carregar();
    });
    const t = setInterval(() => setAgora(Date.now()), 15000);
    window.addEventListener("online", carregar);
    return () => {
      parar();
      clearInterval(t);
      window.removeEventListener("online", carregar);
    };
  }, [carregar]);

  const pendentes = fila.filter((b) => b.estado === "pendente");
  const rejeitadas = fila.filter((b) => b.estado === "rejeitada");

  const { inicio } = hoje();
  const deHoje = vendas.filter((v) => v.status === "ativa" && new Date(v.vendida_em) >= inicio);
  const pendHoje = pendentes.filter((b) => new Date(b.vendida_em) >= inicio);
  const qtdHoje = deHoje.reduce((s, v) => s + v.quantidade, 0) + pendHoje.reduce((s, b) => s + b.quantidade, 0);
  const valorHoje =
    deHoje.reduce((s, v) => s + Number(v.valor_total), 0) + pendHoje.reduce((s, b) => s + b.valor_unitario * b.quantidade, 0);

  async function tentarDeNovo(b: BaixaPendente) {
    if (!perfil) return;
    atualizarNaFila(perfil.id, b.client_id, { estado: "pendente", erro: undefined });
    const r = await sincronizar(perfil.id, "manual");
    if (r.enviadas) avisar("Baixa enviada");
    else if (r.rejeitadas) avisar("Ainda não foi aceita. Confira o estoque ou descarte.", "erro");
    else avisar("Sem conexão. Ficará pendente.", "info");
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-tema-g bg-primaria p-4 text-primaria-texto">
          <p className="text-sm font-semibold opacity-90">Vendido hoje</p>
          <p className="num font-marca text-4xl font-bold">{qtdHoje} <span className="text-xl">peças</span></p>
        </div>
        <div className="rounded-tema-g border border-borda bg-superficie p-4">
          <p className="text-sm font-semibold text-suave">Valor hoje</p>
          <p className="num font-marca text-3xl font-bold">{moeda(valorHoje)}</p>
        </div>
      </div>

      {offline && <Aviso>Sem conexão — mostrando o histórico guardado no aparelho.</Aviso>}

      {rejeitadas.length > 0 && (
        <section>
          <h2 className="mb-2 font-marca text-xl font-bold uppercase tracking-wide text-perigo">Não aceitas pelo sistema</h2>
          <ul className="space-y-2">
            {rejeitadas.map((b) => (
              <li key={b.client_id} className="rounded-tema-g border-2 border-perigo bg-perigo-fundo p-3">
                <LinhaPendente b={b} />
                <p className="mt-1 text-sm font-semibold text-perigo">{b.erro}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Botao variante="secundario" tamanho="sm" onClick={() => tentarDeNovo(b)}>
                    <RefreshCw className="size-4" /> Tentar de novo
                  </Botao>
                  <Botao variante="secundario" tamanho="sm" onClick={() => setDescartando(b)}>
                    <Trash2 className="size-4" /> Descartar
                  </Botao>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pendentes.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-marca text-xl font-bold uppercase tracking-wide text-alerta">Pendentes de envio</h2>
            <Botao tamanho="sm" variante="secundario" onClick={() => perfil && sincronizar(perfil.id)}>
              <CloudUpload className="size-4" /> Enviar agora
            </Botao>
          </div>
          <ul className="space-y-2">
            {pendentes.map((b) => (
              <li key={b.client_id} className="rounded-tema-g border-2 border-dashed border-alerta bg-alerta-fundo/60 p-3">
                <LinhaPendente b={b} />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Selo tom="alerta">
                    <CloudUpload className="size-3.5" /> Pendente de envio
                  </Selo>
                  <button onClick={() => setDescartando(b)} className="min-h-10 px-2 text-sm font-semibold text-perigo underline">
                    Cancelar baixa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-marca text-xl font-bold uppercase tracking-wide">Minhas vendas</h2>
        {vendas.length === 0 ? (
          <Vazio titulo="Nenhuma venda ainda" />
        ) : (
          <ul className="space-y-2">
            {vendas.map((v) => {
              const restante = PRAZO_MS - (agora - new Date(v.created_at).getTime());
              const podeCancelar = v.status === "ativa" && restante > 0;
              return (
                <li
                  key={v.id}
                  className={cx(
                    "rounded-tema-g border border-borda bg-superficie p-3",
                    v.status === "cancelada" && "opacity-60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cx("truncate font-bold", v.status === "cancelada" && "line-through")}>
                        {v.quantidade}× {v.produto?.nome} · {v.tamanho}
                      </p>
                      <p className="truncate text-sm text-suave">
                        {dataHora(v.vendida_em)} · {ROTULO_FORMA[v.forma_pagamento]}
                        {v.observacao ? ` · ${v.observacao}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num font-bold">{moeda(v.valor_total)}</p>
                      {v.status === "cancelada" ? (
                        <Selo tom="perigo">Cancelada</Selo>
                      ) : v.forma_pagamento === "fiado" ? (
                        <Selo tom="alerta">Fiado</Selo>
                      ) : (
                        <Selo tom="sucesso">Enviada</Selo>
                      )}
                    </div>
                  </div>
                  {v.status === "cancelada" && v.motivo_cancelamento && (
                    <p className="mt-1 text-sm text-suave">Motivo: {v.motivo_cancelamento}</p>
                  )}
                  {podeCancelar && (
                    <Botao variante="secundario" tamanho="sm" bloco className="mt-2" onClick={() => setCancelando(v)}>
                      <Undo2 className="size-4" /> Cancelar (resta {Math.max(1, Math.ceil(restante / 60000))} min)
                    </Botao>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-center text-sm text-suave">
          Você pode cancelar uma baixa em até 10 minutos. Depois disso, peça ao dono.
        </p>
      </section>

      <Dialogo aberto={!!cancelando} aoFechar={() => setCancelando(null)} titulo="Cancelar baixa?">
        {cancelando && (
          <ConfirmarCancelamento
            venda={cancelando}
            aoConcluir={() => {
              setCancelando(null);
              carregar();
            }}
          />
        )}
      </Dialogo>

      <Dialogo aberto={!!descartando} aoFechar={() => setDescartando(null)} titulo="Cancelar baixa?">
        {descartando && (
          <div className="space-y-4">
            <LinhaPendente b={descartando} />
            <p>Esta baixa ainda não foi enviada. Ela será apagada deste aparelho e o estoque não será alterado.</p>
            <Botao
              variante="perigo"
              tamanho="lg"
              bloco
              onClick={() => {
                if (perfil) removerDaFila(perfil.id, descartando.client_id);
                setDescartando(null);
                avisar("Baixa cancelada");
              }}
            >
              Sim, cancelar esta baixa
            </Botao>
          </div>
        )}
      </Dialogo>
    </div>
  );
}

function LinhaPendente({ b }: { b: BaixaPendente }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate font-bold">
          {b.quantidade}× {b.produto_nome} · {b.tamanho}
        </p>
        <p className="truncate text-sm text-suave">
          {hora(b.vendida_em)} · {ROTULO_FORMA[b.forma_pagamento]}
          {b.observacao ? ` · ${b.observacao}` : ""}
        </p>
      </div>
      <p className="num shrink-0 font-bold">{moeda(b.valor_unitario * b.quantidade)}</p>
    </div>
  );
}

function ConfirmarCancelamento({ venda, aoConcluir }: { venda: VendaDetalhada; aoConcluir: () => void }) {
  const avisar = useAviso();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function cancelar() {
    setEnviando(true);
    setErro(null);
    const { error } = await supabase().rpc("cancelar_venda", { p_venda_id: venda.id, p_motivo: null });
    setEnviando(false);
    if (error) return setErro(mensagemErro(error));
    avisar("Baixa cancelada e estoque devolvido");
    aoConcluir();
  }

  return (
    <div className="space-y-4">
      <p>
        <strong>
          {venda.quantidade}× {venda.produto?.nome} · {venda.tamanho}
        </strong>{" "}
        — {moeda(venda.valor_total)}
      </p>
      <p className="text-suave">As peças voltam para o estoque.</p>
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      <Botao variante="perigo" tamanho="lg" bloco carregando={enviando} onClick={cancelar}>
        Sim, cancelar esta baixa
      </Botao>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { KeyRound, Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { useAuth } from "@/components/auth";
import { useAviso } from "@/components/avisos";
import { Aviso, Botao, Campo, Carregando, Dialogo, Rotulo, Selo, Titulo, Vazio, cx } from "@/components/ui";
import { chamarApi } from "@/lib/api";
import { mensagemErro } from "@/lib/erros";
import { lerValor } from "@/lib/formato";
import { supabase } from "@/lib/supabase";
import type { Perfil } from "@/lib/tipos";

type Modo = { tipo: "novo" } | { tipo: "editar"; perfil: Perfil } | { tipo: "senha"; perfil: Perfil } | null;

export default function PaginaVendedores() {
  const avisar = useAviso();
  const { perfil: eu } = useAuth();
  const [lista, setLista] = useState<Perfil[] | null>(null);
  const [modo, setModo] = useState<Modo>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase().from("perfis").select("*").order("papel").order("nome");
    if (error) return avisar(mensagemErro(error), "erro");
    setLista(data as Perfil[]);
  }, [avisar]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function alternarAtivo(p: Perfil) {
    const novo = !p.ativo;
    if (!novo && !confirm(`Desativar ${p.nome}? Ele não conseguirá mais entrar nem registrar baixas.`)) return;
    try {
      // perfil (auditado com o usuário admin) + bloqueio de login no Auth
      const { error } = await supabase().from("perfis").update({ ativo: novo }).eq("id", p.id);
      if (error) throw error;
      await chamarApi("/api/admin/vendedores", "PATCH", { id: p.id, ativo: novo });
      avisar(novo ? `${p.nome} reativado` : `${p.nome} desativado`);
    } catch (e) {
      avisar(mensagemErro(e), "erro");
    }
    carregar();
  }

  return (
    <>
      <Titulo
        acao={
          <Botao onClick={() => setModo({ tipo: "novo" })}>
            <Plus className="size-5" /> Novo vendedor
          </Botao>
        }
      >
        Vendedores
      </Titulo>

      {!lista ? (
        <Carregando />
      ) : lista.length === 0 ? (
        <Vazio titulo="Nenhum vendedor cadastrado" />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((p) => (
            <div key={p.id} className={cx("rounded-tema-g border border-borda bg-superficie p-4", !p.ativo && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{p.nome}</p>
                  <p className="text-sm text-suave">
                    usuário: <strong className="text-texto">{p.usuario}</strong>
                    {p.telefone && <> · {p.telefone}</>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {p.papel === "admin" ? <Selo tom="primario">Dono</Selo> : <Selo>Vendedor</Selo>}
                  {p.ativo ? <Selo tom="sucesso">Ativo</Selo> : <Selo tom="perigo">Desativado</Selo>}
                </div>
              </div>
              {p.papel === "vendedor" && (
                <p className="mt-2 text-sm">
                  Comissão: <strong className="num">{Number(p.comissao_percentual).toLocaleString("pt-BR")}%</strong>
                </p>
              )}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Botao variante="secundario" tamanho="sm" onClick={() => setModo({ tipo: "editar", perfil: p })}>
                  <Pencil className="size-4" /> Editar
                </Botao>
                <Botao variante="secundario" tamanho="sm" onClick={() => setModo({ tipo: "senha", perfil: p })}>
                  <KeyRound className="size-4" /> Senha
                </Botao>
                <Botao
                  variante="secundario"
                  tamanho="sm"
                  disabled={p.id === eu?.id}
                  onClick={() => alternarAtivo(p)}
                  title={p.id === eu?.id ? "Você não pode desativar a si mesmo" : undefined}
                >
                  {p.ativo ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                  {p.ativo ? "Desativar" : "Ativar"}
                </Botao>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialogo
        aberto={modo !== null}
        aoFechar={() => setModo(null)}
        titulo={modo?.tipo === "novo" ? "Novo vendedor" : modo?.tipo === "senha" ? "Trocar senha" : "Editar vendedor"}
      >
        {modo?.tipo === "novo" && <FormNovo aoSalvar={() => (setModo(null), carregar())} />}
        {modo?.tipo === "editar" && <FormEditar perfil={modo.perfil} aoSalvar={() => (setModo(null), carregar())} />}
        {modo?.tipo === "senha" && <FormSenha perfil={modo.perfil} aoSalvar={() => setModo(null)} />}
      </Dialogo>
    </>
  );
}

function FormNovo({ aoSalvar }: { aoSalvar: () => void }) {
  const avisar = useAviso();
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [comissao, setComissao] = useState("10");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const r = await chamarApi<{ usuario: string }>("/api/admin/vendedores", "POST", {
        nome,
        usuario,
        telefone,
        senha,
        comissao_percentual: lerValor(comissao || "0"),
      });
      avisar(`Vendedor criado. Usuário: ${r.usuario}`);
      aoSalvar();
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div>
        <Rotulo htmlFor="nome">Nome completo</Rotulo>
        <Campo id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Rotulo htmlFor="usuario">Usuário (para entrar)</Rotulo>
          <Campo
            id="usuario"
            required
            autoCapitalize="none"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="ex.: joao"
          />
        </div>
        <div>
          <Rotulo htmlFor="senha">Senha inicial</Rotulo>
          <Campo id="senha" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <div>
          <Rotulo htmlFor="tel">Telefone</Rotulo>
          <Campo id="tel" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>
        <div>
          <Rotulo htmlFor="com">Comissão (%)</Rotulo>
          <Campo id="com" inputMode="decimal" value={comissao} onChange={(e) => setComissao(e.target.value)} />
        </div>
      </div>
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      <Botao type="submit" tamanho="lg" bloco carregando={salvando}>
        Criar vendedor
      </Botao>
    </form>
  );
}

function FormEditar({ perfil, aoSalvar }: { perfil: Perfil; aoSalvar: () => void }) {
  const avisar = useAviso();
  const [nome, setNome] = useState(perfil.nome);
  const [telefone, setTelefone] = useState(perfil.telefone ?? "");
  const [comissao, setComissao] = useState(String(perfil.comissao_percentual).replace(".", ","));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    const { error } = await supabase()
      .from("perfis")
      .update({ nome: nome.trim(), telefone: telefone.trim() || null, comissao_percentual: lerValor(comissao || "0") })
      .eq("id", perfil.id);
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    avisar("Dados atualizados");
    aoSalvar();
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <p className="text-sm text-suave">
        Usuário de acesso: <strong className="text-texto">{perfil.usuario}</strong> (não pode ser alterado)
      </p>
      <div>
        <Rotulo htmlFor="nome">Nome</Rotulo>
        <Campo id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Rotulo htmlFor="tel">Telefone</Rotulo>
          <Campo id="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>
        <div>
          <Rotulo htmlFor="com">Comissão (%)</Rotulo>
          <Campo id="com" inputMode="decimal" value={comissao} onChange={(e) => setComissao(e.target.value)} />
        </div>
      </div>
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      <Botao type="submit" tamanho="lg" bloco carregando={salvando}>
        Salvar
      </Botao>
    </form>
  );
}

function FormSenha({ perfil, aoSalvar }: { perfil: Perfil; aoSalvar: () => void }) {
  const avisar = useAviso();
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await chamarApi("/api/admin/vendedores", "PATCH", { id: perfil.id, senha });
      avisar(`Senha de ${perfil.nome} alterada`);
      aoSalvar();
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <p>
        Nova senha para <strong>{perfil.nome}</strong> ({perfil.usuario}):
      </p>
      <Campo required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mínimo 6 caracteres" />
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      <Botao type="submit" tamanho="lg" bloco carregando={salvando}>
        Trocar senha
      </Botao>
    </form>
  );
}

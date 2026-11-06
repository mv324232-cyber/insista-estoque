"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Camera, Pencil, Plus, Search } from "lucide-react";
import { useAviso } from "@/components/avisos";
import { CampoTamanhos } from "@/components/campo-tamanhos";
import { FotoProduto } from "@/components/foto-produto";
import { Aviso, Botao, Campo, Carregando, Dialogo, Rotulo, Selecao, Selo, Titulo, Vazio, cx } from "@/components/ui";
import { mensagemErro } from "@/lib/erros";
import { lerValor, moeda } from "@/lib/formato";
import { redimensionarImagem } from "@/lib/imagem";
import { supabase } from "@/lib/supabase";
import {
  montarCatalogo,
  tamanhosBaixos,
  totalEstoque,
  type LinhaEstoque,
  type Produto,
  type ProdutoComEstoque,
  type Tamanho,
} from "@/lib/tipos";

type Filtro = "ativos" | "inativos" | "todos";

export default function PaginaProdutos() {
  const avisar = useAviso();
  const [produtos, setProdutos] = useState<ProdutoComEstoque[] | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("ativos");
  const [editando, setEditando] = useState<ProdutoComEstoque | "novo" | null>(null);

  const carregar = useCallback(async () => {
    const sb = supabase();
    const [p, e] = await Promise.all([
      sb.from("produtos").select("*").order("nome"),
      sb.from("estoque").select("produto_id, tamanho, quantidade"),
    ]);
    if (p.error || e.error) {
      avisar(mensagemErro(p.error ?? e.error), "erro");
      return;
    }
    setProdutos(montarCatalogo(p.data as Produto[], e.data as LinhaEstoque[]));
  }, [avisar]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (produtos ?? []).filter(
      (p) =>
        (filtro === "todos" || (filtro === "ativos" ? p.ativo : !p.ativo)) &&
        (!termo || p.nome.toLowerCase().includes(termo) || p.sku.toLowerCase().includes(termo) || p.cor.toLowerCase().includes(termo)),
    );
  }, [produtos, busca, filtro]);

  async function alternarAtivo(p: ProdutoComEstoque) {
    const { error } = await supabase().from("produtos").update({ ativo: !p.ativo }).eq("id", p.id);
    if (error) return avisar(mensagemErro(error), "erro");
    avisar(p.ativo ? `"${p.nome}" desativado` : `"${p.nome}" ativado`);
    carregar();
  }

  return (
    <>
      <Titulo
        acao={
          <Botao onClick={() => setEditando("novo")}>
            <Plus className="size-5" /> Novo produto
          </Botao>
        }
      >
        Produtos
      </Titulo>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-suave" />
          <Campo
            placeholder="Buscar por design, SKU ou cor"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <Selecao value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} className="sm:w-44">
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </Selecao>
      </div>

      {!produtos ? (
        <Carregando />
      ) : lista.length === 0 ? (
        <Vazio titulo="Nenhum produto encontrado" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((p) => {
            const total = totalEstoque(p.estoque);
            const baixo = tamanhosBaixos(p);
            return (
              <div key={p.id} className={cx("rounded-tema-g border border-borda bg-superficie p-3", !p.ativo && "opacity-60")}>
                <div className="flex gap-3">
                  <FotoProduto url={p.foto_url} nome={p.nome} className="size-20" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold leading-tight">{p.nome}</p>
                    <p className="text-sm text-suave">
                      {p.sku} · {p.cor || "—"}
                    </p>
                    <p className="num mt-1 font-bold">{moeda(p.preco)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {p.ativo ? <Selo tom="sucesso">Ativo</Selo> : <Selo>Inativo</Selo>}
                    {p.ativo && baixo.length > 0 && <Selo tom="alerta">Estoque baixo</Selo>}
                  </div>
                </div>
                <div className="num mt-3 flex flex-wrap gap-1 text-center text-sm">
                  {p.tamanhos.map((t) => (
                    <div
                      key={t}
                      className={cx(
                        "min-w-11 rounded-lg px-1.5 py-1",
                        p.estoque[t] <= p.estoque_minimo ? "bg-alerta-fundo text-alerta" : "bg-superficie-2",
                      )}
                    >
                      <div className="text-[11px] font-semibold opacity-80">{t}</div>
                      <div className="font-bold">{p.estoque[t]}</div>
                    </div>
                  ))}
                  <div className="min-w-11 rounded-lg bg-primaria px-1.5 py-1 text-primaria-texto">
                    <div className="text-[11px] font-semibold opacity-80">Total</div>
                    <div className="font-bold">{total}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Botao variante="secundario" tamanho="sm" className="flex-1" onClick={() => setEditando(p)}>
                    <Pencil className="size-4" /> Editar
                  </Botao>
                  <Botao variante="secundario" tamanho="sm" className="flex-1" onClick={() => alternarAtivo(p)}>
                    {p.ativo ? "Desativar" : "Ativar"}
                  </Botao>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialogo
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando === "novo" ? "Novo produto" : "Editar produto"}
      >
        {editando !== null && (
          <FormProduto
            produto={editando === "novo" ? null : editando}
            aoSalvar={() => {
              setEditando(null);
              carregar();
            }}
          />
        )}
      </Dialogo>
    </>
  );
}

function FormProduto({ produto, aoSalvar }: { produto: ProdutoComEstoque | null; aoSalvar: () => void }) {
  const avisar = useAviso();
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [sku, setSku] = useState(produto?.sku ?? "");
  const [cor, setCor] = useState(produto?.cor ?? "");
  const [preco, setPreco] = useState(produto ? String(produto.preco).replace(".", ",") : "");
  const [minimo, setMinimo] = useState(String(produto?.estoque_minimo ?? 3));
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);
  const [foto, setFoto] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(produto?.foto_url ?? null);
  const [tamanhos, setTamanhos] = useState<Tamanho[]>(produto?.tamanhos ?? []);
  const [inicial, setInicial] = useState<Record<Tamanho, string>>({});
  const comEstoque = produto ? produto.tamanhos.filter((t) => (produto.estoque[t] ?? 0) > 0) : [];
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviarFoto(produtoId: string): Promise<string | null> {
    if (!foto) return null;
    const blob = await redimensionarImagem(foto);
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const caminho = `${produtoId}/${Date.now()}.${ext}`;
    const sb = supabase();
    const { error } = await sb.storage.from("produtos").upload(caminho, blob, { contentType: blob.type, upsert: true });
    if (error) throw error;
    return sb.storage.from("produtos").getPublicUrl(caminho).data.publicUrl;
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const valor = lerValor(preco);
    if (!nome.trim() || !sku.trim()) return setErro("Preencha nome e SKU.");
    if (!(valor >= 0) || preco.trim() === "") return setErro("Preço inválido.");
    if (tamanhos.length === 0) return setErro("Digite ao menos um tamanho.");
    setSalvando(true);
    try {
      const sb = supabase();
      const dados = {
        nome: nome.trim(),
        sku: sku.trim().toUpperCase(),
        cor: cor.trim(),
        preco: valor,
        estoque_minimo: Math.max(0, parseInt(minimo || "0", 10) || 0),
        tamanhos,
        ativo,
      };
      let id = produto?.id;
      if (produto) {
        const { error } = await sb.from("produtos").update(dados).eq("id", produto.id);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from("produtos").insert(dados).select("id").single();
        if (error) throw error;
        id = data.id as string;
        const itens = tamanhos.map((t) => ({ tamanho: t, quantidade: parseInt(inicial[t] || "0", 10) || 0 })).filter(
          (i) => i.quantidade > 0,
        );
        if (itens.length) {
          const { error: e2 } = await sb.rpc("registrar_entrada", {
            p_produto_id: id,
            p_itens: itens,
            p_observacao: "Estoque inicial",
          });
          if (e2) throw e2;
        }
      }
      if (foto && id) {
        const url = await enviarFoto(id);
        const { error } = await sb.from("produtos").update({ foto_url: url }).eq("id", id);
        if (error) throw error;
      }
      avisar(produto ? "Produto atualizado" : "Produto cadastrado");
      aoSalvar();
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="flex items-center gap-3">
        <FotoProduto url={previa} nome={nome} className="size-24" />
        <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-tema border-2 border-borda px-4 font-semibold hover:bg-superficie-2">
          <Camera className="size-5" /> {previa ? "Trocar foto" : "Adicionar foto"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFoto(f);
                setPrevia(URL.createObjectURL(f));
              }
            }}
          />
        </label>
      </div>
      <div>
        <Rotulo htmlFor="nome">Nome do design</Rotulo>
        <Campo id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Raiz Forte" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Rotulo htmlFor="sku">SKU</Rotulo>
          <Campo id="sku" required value={sku} onChange={(e) => setSku(e.target.value)} placeholder="INS-RAIZ-VM" className="uppercase" />
        </div>
        <div>
          <Rotulo htmlFor="cor">Cor</Rotulo>
          <Campo id="cor" value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Verde Musgo" />
        </div>
        <div>
          <Rotulo htmlFor="preco">Preço de venda (R$)</Rotulo>
          <Campo id="preco" inputMode="decimal" required value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="129,90" />
        </div>
        <div>
          <Rotulo htmlFor="minimo">Alerta de estoque baixo</Rotulo>
          <Campo id="minimo" type="number" min={0} inputMode="numeric" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
          <p className="mt-1 text-xs text-suave">Avisa quando um tamanho tiver esta quantidade ou menos.</p>
        </div>
      </div>
      <div>
        <Rotulo>Tamanhos</Rotulo>
        <CampoTamanhos valor={tamanhos} aoMudar={setTamanhos} bloqueados={comEstoque} />
        {comEstoque.length > 0 && (
          <p className="mt-1 text-xs text-suave">
            Tamanhos com peças em estoque não podem ser removidos ({comEstoque.join(", ")}). Zere-os em Estoque → Ajustar.
          </p>
        )}
      </div>
      {!produto && tamanhos.length > 0 && (
        <div>
          <Rotulo>Estoque inicial por tamanho (opcional)</Rotulo>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {tamanhos.map((t) => (
              <div key={t}>
                <span className="mb-1 block text-center text-sm font-bold">{t}</span>
                <Campo
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={`Estoque inicial ${t}`}
                  value={inicial[t] ?? ""}
                  onChange={(e) => setInicial((s) => ({ ...s, [t]: e.target.value }))}
                  className="px-2 text-center"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      <label className="flex min-h-12 items-center gap-3 font-semibold">
        <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="size-6 accent-[var(--cor-primaria)]" />
        Produto ativo (aparece para os vendedores)
      </label>
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      <Botao type="submit" tamanho="lg" bloco carregando={salvando}>
        Salvar
      </Botao>
    </form>
  );
}

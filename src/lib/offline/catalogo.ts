"use client";

import { supabase } from "../supabase";
import { montarCatalogo, type LinhaEstoque, type Produto, type ProdutoComEstoque } from "../tipos";
import { gravar, ler } from "./armazenamento";

const CHAVE = "insista:catalogo";

export interface CatalogoSalvo {
  atualizadoEm: string | null;
  produtos: ProdutoComEstoque[];
}

export function catalogoSalvo(): CatalogoSalvo {
  return ler<CatalogoSalvo>(CHAVE, { atualizadoEm: null, produtos: [] });
}

/** Busca produtos ativos + estoque no servidor e guarda no aparelho. */
export async function baixarCatalogo(): Promise<CatalogoSalvo> {
  const sb = supabase();
  const [p, e] = await Promise.all([
    sb.from("produtos").select("*").eq("ativo", true).order("nome"),
    sb.from("estoque").select("produto_id, tamanho, quantidade"),
  ]);
  if (p.error) throw p.error;
  if (e.error) throw e.error;
  const salvo: CatalogoSalvo = {
    atualizadoEm: new Date().toISOString(),
    produtos: montarCatalogo(p.data as Produto[], e.data as LinhaEstoque[]),
  };
  gravar(CHAVE, salvo);
  return salvo;
}

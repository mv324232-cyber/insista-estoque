export const TAMANHOS = ["P", "M", "G", "GG", "XG"] as const;
export type Tamanho = (typeof TAMANHOS)[number];

export const FORMAS_PAGAMENTO = ["dinheiro", "pix", "cartao", "fiado"] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export const ROTULO_FORMA: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
  fiado: "Fiado",
};

export type Papel = "admin" | "vendedor";

export interface Perfil {
  id: string;
  nome: string;
  usuario: string;
  telefone: string | null;
  papel: Papel;
  ativo: boolean;
  comissao_percentual: number;
  created_at: string;
}

export interface Produto {
  id: string;
  nome: string;
  sku: string;
  cor: string;
  foto_url: string | null;
  preco: number;
  estoque_minimo: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface LinhaEstoque {
  produto_id: string;
  tamanho: Tamanho;
  quantidade: number;
}

export type ProdutoComEstoque = Produto & { estoque: Record<Tamanho, number> };

export interface Venda {
  id: string;
  client_id: string;
  vendedor_id: string;
  produto_id: string;
  tamanho: Tamanho;
  quantidade: number;
  preco_tabela: number;
  valor_unitario: number;
  valor_total: number;
  forma_pagamento: FormaPagamento;
  observacao: string | null;
  vendida_em: string;
  created_at: string;
  status: "ativa" | "cancelada";
  cancelada_em: string | null;
  cancelada_por: string | null;
  motivo_cancelamento: string | null;
}

export type VendaDetalhada = Venda & {
  produto: { nome: string; sku: string; cor: string } | null;
  vendedor: { nome: string; usuario: string } | null;
};

export interface Resumo {
  num_vendas: number;
  quantidade: number;
  valor: number;
  desconto: number;
  por_forma: { forma: FormaPagamento; quantidade: number; valor: number; num_vendas: number }[];
  por_vendedor: {
    vendedor_id: string;
    nome: string;
    usuario: string;
    comissao_percentual: number;
    quantidade: number;
    valor: number;
    num_vendas: number;
    comissao: number;
    fiado: number | null;
  }[];
  por_design: { produto_id: string; nome: string; sku: string; cor: string; quantidade: number; valor: number }[];
  por_dia: { dia: string; quantidade: number; valor: number }[];
}

export const SELECT_VENDA_DETALHADA =
  "*, produto:produtos(nome, sku, cor), vendedor:perfis!vendas_vendedor_id_fkey(nome, usuario)";

export function estoqueVazio(): Record<Tamanho, number> {
  return { P: 0, M: 0, G: 0, GG: 0, XG: 0 };
}

export function montarCatalogo(produtos: Produto[], linhas: LinhaEstoque[]): ProdutoComEstoque[] {
  const mapa = new Map<string, Record<Tamanho, number>>();
  for (const l of linhas) {
    const e = mapa.get(l.produto_id) ?? estoqueVazio();
    e[l.tamanho] = l.quantidade;
    mapa.set(l.produto_id, e);
  }
  return produtos.map((p) => ({ ...p, preco: Number(p.preco), estoque: mapa.get(p.id) ?? estoqueVazio() }));
}

export function totalEstoque(e: Record<Tamanho, number>): number {
  return TAMANHOS.reduce((s, t) => s + (e[t] ?? 0), 0);
}

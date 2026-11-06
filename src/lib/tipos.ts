/** Tamanho livre, digitado no cadastro do produto (ex.: "M", "XGG", "G2", "38"). */
export type Tamanho = string;

/** Atalhos de listas de tamanhos no cadastro (o dono pode digitar qualquer um). */
export const GRADES_SUGERIDAS: { nome: string; tamanhos: string[] }[] = [
  { nome: "PP ao XGG", tamanhos: ["PP", "P", "M", "G", "GG", "XG", "XGG"] },
  { nome: "Plus (G1 a G5)", tamanhos: ["G1", "G2", "G3", "G4", "G5"] },
  { nome: "Infantil (2 a 16)", tamanhos: ["2", "4", "6", "8", "10", "12", "14", "16"] },
];

/** Separa um texto digitado em tamanhos: "p, m g;GG" → ["P","M","G","GG"] */
export function lerTamanhos(texto: string): string[] {
  const vistos = new Set<string>();
  return texto
    .split(/[\s,;/|]+/)
    .map((t) => t.trim().toUpperCase())
    .filter((t) => t && t.length <= 12 && !vistos.has(t) && (vistos.add(t), true));
}

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
  tamanhos: string[];
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

export function estoqueVazio(tamanhos: string[] = []): Record<Tamanho, number> {
  return Object.fromEntries(tamanhos.map((t) => [t, 0]));
}

export function montarCatalogo(produtos: Produto[], linhas: LinhaEstoque[]): ProdutoComEstoque[] {
  const mapa = new Map<string, Record<Tamanho, number>>();
  for (const l of linhas) {
    const e = mapa.get(l.produto_id) ?? {};
    e[l.tamanho] = l.quantidade;
    mapa.set(l.produto_id, e);
  }
  return produtos.map((p) => {
    const tamanhos = p.tamanhos ?? [];
    const doBanco = mapa.get(p.id) ?? {};
    // só os tamanhos ativos do produto, na ordem cadastrada
    const estoque = Object.fromEntries(tamanhos.map((t) => [t, doBanco[t] ?? 0]));
    return { ...p, tamanhos, preco: Number(p.preco), estoque };
  });
}

export function totalEstoque(e: Record<Tamanho, number>): number {
  return Object.values(e).reduce((s, q) => s + (q ?? 0), 0);
}

/** Tamanhos com estoque igual ou abaixo do alerta do produto. */
export function tamanhosBaixos(p: ProdutoComEstoque): Tamanho[] {
  return p.tamanhos.filter((t) => (p.estoque[t] ?? 0) <= p.estoque_minimo);
}

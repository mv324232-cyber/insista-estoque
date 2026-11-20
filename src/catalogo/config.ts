import type { ColecaoId, CorId, ProdutoCatalogo } from "./tipos";
import { PRODUTOS } from "./produtos";

/** ====== Ajuste aqui os dados da loja ====== */
export const LOJA = {
  nome: "Insista",
  whatsapp: "5543998365037", // DDI + DDD + número, só dígitos
  whatsappExibicao: "(43) 99836-5037",
  preco: 49.9,
  slogan: "Vista a força do campo.",
  /** Vídeo de fundo do topo (Mixkit, licença livre). Use null para mostrar só a cena animada de campo. */
  videoHero: {
    computador: "/video/campo-1280", // .webm e .mp4
    celular: "/video/campo-854",
    capa: "/video/campo-poster.jpg",
  } as { computador: string; celular: string; capa: string } | null,
};

export const TAMANHOS_CATALOGO = ["P", "M", "G", "GG"] as const;

/** Tabela de medidas (cm) — igual para todas as estampas */
export const MEDIDAS: { tamanho: string; largura: number; comprimento: number; manga: number }[] = [
  { tamanho: "P", largura: 52, comprimento: 70, manga: 61 },
  { tamanho: "M", largura: 56, comprimento: 76, manga: 63 },
  { tamanho: "G", largura: 60, comprimento: 78, manga: 65 },
  { tamanho: "GG", largura: 64, comprimento: 80, manga: 67 },
];

export const COLECOES: { id: ColecaoId; nome: string; chamada: string; capa: string }[] = [
  { id: "maquinas", nome: "Máquinas", chamada: "Tratores, colheitadeiras e o trabalho bruto", capa: "09" },
  { id: "pecuaria", nome: "Pecuária", chamada: "Boi, rebanho e a lida no curral", capa: "14" },
  { id: "cavalos", nome: "Cavalos & Cavalgada", chamada: "Raça, peão e tradição", capa: "64" },
  { id: "lavoura", nome: "Lavoura", chamada: "Grão, café, milho e a força da terra", capa: "98" },
  { id: "drones", nome: "Drones", chamada: "A tecnologia que produz", capa: "51" },
  { id: "brasil", nome: "Orgulho Brasil", chamada: "Bandeira no peito, agro no sangue", capa: "27" },
];

export const CORES: Record<CorId, { nome: string; hex: string }> = {
  preta: { nome: "Preta", hex: "#151515" },
  verde: { nome: "Verde", hex: "#1f7a32" },
  azul: { nome: "Azul", hex: "#1d4f9c" },
  marrom: { nome: "Marrom", hex: "#7a4a24" },
  cinza: { nome: "Cinza", hex: "#8a8a8a" },
  vermelha: { nome: "Vermelha", hex: "#c8102e" },
  laranja: { nome: "Laranja", hex: "#e8741c" },
  amarela: { nome: "Amarela", hex: "#f2c418" },
  vinho: { nome: "Vinho", hex: "#6e1630" },
  branca: { nome: "Branca", hex: "#f4f4f4" },
};

export const nomeColecao = (id: ColecaoId) => COLECOES.find((c) => c.id === id)?.nome ?? id;

export function produtoPorCodigo(codigo: string): ProdutoCatalogo | undefined {
  return PRODUTOS.find((p) => p.codigo === codigo);
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const precoTexto = (v: number = LOJA.preco) => brl.format(v);

export function imagem(codigo: string, tipo: "camiseta" | "camiseta-p" | "anuncio" | "anuncio-p" | "medidas") {
  return `/catalogo/${codigo}/${tipo}.webp`;
}

/** Link do WhatsApp com mensagem pronta */
export function linkWhatsapp(mensagem: string) {
  return `https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}

export function mensagemPedido(itens: { produto: ProdutoCatalogo; tamanho: string; quantidade: number }[]) {
  const linhas = itens.map(
    (i) => `• ${i.quantidade}x Cód. ${i.produto.codigo} — ${i.produto.nome} — Tam. ${i.tamanho}`,
  );
  const pecas = itens.reduce((s, i) => s + i.quantidade, 0);
  return [
    "Olá, Insista! Quero fazer um pedido:",
    "",
    ...linhas,
    "",
    `Total: ${pecas} peça${pecas > 1 ? "s" : ""} — ${precoTexto(pecas * LOJA.preco)}`,
    "",
    "Como fica o frete para minha cidade?",
  ].join("\n");
}

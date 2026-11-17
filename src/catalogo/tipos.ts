export type ColecaoId = "maquinas" | "pecuaria" | "cavalos" | "drones" | "lavoura" | "brasil";
export type CorId = "preta" | "verde" | "azul" | "marrom" | "cinza" | "vermelha" | "laranja" | "amarela" | "vinho" | "branca";

export interface ProdutoCatalogo {
  /** código da estampa (número da pasta original) */
  codigo: string;
  nome: string;
  colecao: ColecaoId;
  cor: CorId;
  descricao: string;
  /** dimensões da imagem da camiseta (para reservar espaço e evitar "pulos") */
  w: number;
  h: number;
}

export interface ItemSacola {
  codigo: string;
  tamanho: string;
  quantidade: number;
}

import { dataISO } from "./formato";

export type Intervalo = { inicio: Date; fim: Date };

export function inicioDoDia(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function hoje(): Intervalo {
  const inicio = inicioDoDia();
  return { inicio, fim: new Date(inicio.getTime() + 864e5) };
}

/** Semana de segunda a domingo */
export function semana(): Intervalo {
  const d = inicioDoDia();
  const dia = (d.getDay() + 6) % 7; // segunda = 0
  const inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dia);
  return { inicio, fim: new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 7) };
}

export function mes(d = new Date()): Intervalo {
  return { inicio: new Date(d.getFullYear(), d.getMonth(), 1), fim: new Date(d.getFullYear(), d.getMonth() + 1, 1) };
}

/** De "yyyy-mm-dd" (inclusive) até "yyyy-mm-dd" (inclusive), no fuso local. */
export function intervaloDeDatas(de: string, ate: string): Intervalo {
  const [a, b, c] = de.split("-").map(Number);
  const [x, y, z] = ate.split("-").map(Number);
  return { inicio: new Date(a, b - 1, c), fim: new Date(x, y - 1, z + 1) };
}

export function datasDoMes(): { de: string; ate: string } {
  const { inicio, fim } = mes();
  return { de: dataISO(inicio), ate: dataISO(new Date(fim.getTime() - 864e5)) };
}

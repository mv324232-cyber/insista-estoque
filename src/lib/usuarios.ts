/**
 * Vendedores entram com um "usuário" simples (ex.: joao). Internamente o
 * Supabase Auth exige e-mail, então usamos usuario@DOMINIO. Nenhum e-mail é enviado.
 * (Mesmo valor em scripts/seed.mjs.)
 */
export const DOMINIO_USUARIOS = "usuarios.insista.app";

export function normalizarUsuario(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

/** Aceita "joao" ou um e-mail completo. */
export function emailDeLogin(valor: string): string {
  const v = valor.trim().toLowerCase();
  if (v.includes("@")) return v;
  return `${normalizarUsuario(v)}@${DOMINIO_USUARIOS}`;
}

/** Pequeno wrapper de localStorage com JSON e tolerância a erros. */
export function ler<T>(chave: string, padrao: T): T {
  if (typeof window === "undefined") return padrao;
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

export function gravar(chave: string, valor: unknown) {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // armazenamento cheio ou bloqueado — segue sem cache
  }
}

export function remover(chave: string) {
  try {
    window.localStorage.removeItem(chave);
  } catch {}
}

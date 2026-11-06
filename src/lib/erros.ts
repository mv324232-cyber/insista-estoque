/** Mensagem amigável a partir de erros do Supabase/PostgREST. */
export function mensagemErro(erro: unknown): string {
  if (!erro) return "Erro desconhecido.";
  const e = erro as { message?: string; code?: string; details?: string };
  const msg = e.message ?? String(erro);
  if (e.code === "23505") {
    if (/sku/i.test(msg + (e.details ?? ""))) return "Já existe um produto com este SKU.";
    return "Registro duplicado.";
  }
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return "Sem conexão com a internet. Tente novamente.";
  if (e.code === "42501") return msg.includes("permission denied") ? "Sem permissão para esta ação." : msg;
  return msg;
}

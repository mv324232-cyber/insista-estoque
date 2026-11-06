"use client";

import { supabase } from "./supabase";

/** Chama as rotas /api/admin/* enviando o token da sessão. */
export async function chamarApi<T = unknown>(caminho: string, metodo: "POST" | "PATCH", corpo: unknown): Promise<T> {
  const { data } = await supabase().auth.getSession();
  const resp = await fetch(caminho, {
    method: metodo,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify(corpo),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.erro ?? `Erro ${resp.status}`);
  return json as T;
}

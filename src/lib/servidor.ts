import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Cliente com a chave secreta (service role). Usar SOMENTE no servidor. */
export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY no servidor.");
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Confere o token enviado pelo navegador e exige papel admin ativo. */
export async function exigirAdmin(request: Request): Promise<{ id: string } | Response> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ erro: "Não autenticado." }, { status: 401 });
  const sb = supabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return Response.json({ erro: "Sessão inválida." }, { status: 401 });
  const { data: perfil } = await sb.from("perfis").select("papel, ativo").eq("id", data.user.id).maybeSingle();
  if (!perfil || perfil.papel !== "admin" || !perfil.ativo) {
    return Response.json({ erro: "Apenas o administrador pode fazer isso." }, { status: 403 });
  }
  return { id: data.user.id };
}

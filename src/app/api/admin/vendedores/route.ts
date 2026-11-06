import { exigirAdmin, supabaseAdmin } from "@/lib/servidor";
import { emailDeLogin, normalizarUsuario } from "@/lib/usuarios";

/** Cria um vendedor (usuário no Supabase Auth + perfil). */
export async function POST(request: Request) {
  const admin = await exigirAdmin(request);
  if (admin instanceof Response) return admin;

  const corpo = await request.json().catch(() => ({}));
  const nome = String(corpo.nome ?? "").trim();
  const usuario = normalizarUsuario(String(corpo.usuario ?? ""));
  const senha = String(corpo.senha ?? "");
  const telefone = String(corpo.telefone ?? "").trim() || null;
  const comissao = Number(corpo.comissao_percentual ?? 0);
  const papel = corpo.papel === "admin" ? "admin" : "vendedor";

  if (!nome) return Response.json({ erro: "Informe o nome." }, { status: 400 });
  if (usuario.length < 3) return Response.json({ erro: "Usuário deve ter ao menos 3 letras (sem espaços)." }, { status: 400 });
  if (senha.length < 6) return Response.json({ erro: "A senha deve ter ao menos 6 caracteres." }, { status: 400 });
  if (!(comissao >= 0 && comissao <= 100)) return Response.json({ erro: "Comissão inválida." }, { status: 400 });

  const sb = supabaseAdmin();
  const { data, error } = await sb.auth.admin.createUser({
    email: emailDeLogin(usuario),
    password: senha,
    email_confirm: true,
    user_metadata: { nome, usuario, telefone, comissao_percentual: comissao },
    app_metadata: { papel },
  });
  if (error) {
    const existe = /already|registered|exists/i.test(error.message);
    return Response.json(
      { erro: existe ? `O usuário "${usuario}" já existe.` : error.message },
      { status: existe ? 409 : 400 },
    );
  }
  return Response.json({ id: data.user.id, usuario }, { status: 201 });
}

/**
 * Troca senha e/ou bloqueia/desbloqueia o login no Auth.
 * (Nome, telefone, comissão e "ativo" do perfil são gravados pelo próprio
 * painel, com a sessão do admin, para que a auditoria registre quem alterou.)
 */
export async function PATCH(request: Request) {
  const admin = await exigirAdmin(request);
  if (admin instanceof Response) return admin;

  const corpo = await request.json().catch(() => ({}));
  const id = String(corpo.id ?? "");
  if (!id) return Response.json({ erro: "Informe o vendedor." }, { status: 400 });

  const mudancas: { password?: string; ban_duration?: string } = {};
  if (corpo.senha !== undefined) {
    const senha = String(corpo.senha);
    if (senha.length < 6) return Response.json({ erro: "A senha deve ter ao menos 6 caracteres." }, { status: 400 });
    mudancas.password = senha;
  }
  if (corpo.ativo !== undefined) {
    if (id === admin.id && !corpo.ativo) {
      return Response.json({ erro: "Você não pode desativar a si mesmo." }, { status: 400 });
    }
    mudancas.ban_duration = corpo.ativo ? "none" : "876000h"; // ~100 anos
  }
  if (Object.keys(mudancas).length === 0) return Response.json({ ok: true });

  const { error } = await supabaseAdmin().auth.admin.updateUserById(id, mudancas);
  if (error) return Response.json({ erro: error.message }, { status: 400 });
  return Response.json({ ok: true });
}

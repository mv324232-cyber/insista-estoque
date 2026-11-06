// Cria (ou promove) o usuário DONO em produção, sem dados de exemplo.
// Uso:  npm run criar-admin -- <usuario> <senha> "<Nome completo>"
// Ex.:  npm run criar-admin -- dono MinhaSenhaForte "Fulano de Tal"
import { createClient } from "@supabase/supabase-js";

const [usuario, senha, ...resto] = process.argv.slice(2);
const nome = resto.join(" ") || usuario;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!usuario || !senha) {
  console.error('Uso: npm run criar-admin -- <usuario> <senha> "<Nome>"');
  process.exit(1);
}
if (!URL || !SERVICE) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}
if (senha.length < 6) {
  console.error("A senha precisa ter ao menos 6 caracteres.");
  process.exit(1);
}

const DOMINIO = "usuarios.insista.app"; // igual a src/lib/usuarios.ts
const u = usuario.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9._-]/g, "");
const email = u.includes("@") ? u : `${u}@${DOMINIO}`;
const sb = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: lista, error: e1 } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (e1) throw e1;
const existente = lista.users.find((x) => x.email === email);

if (existente) {
  const { error } = await sb.auth.admin.updateUserById(existente.id, {
    password: senha,
    app_metadata: { ...existente.app_metadata, papel: "admin" },
    ban_duration: "none",
  });
  if (error) throw error;
  await sb.from("perfis").update({ papel: "admin", ativo: true }).eq("id", existente.id);
  console.log(`Usuário "${u}" atualizado como DONO (admin).`);
} else {
  const { error } = await sb.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, usuario: u },
    app_metadata: { papel: "admin" },
  });
  if (error) throw error;
  console.log(`Dono criado. Entre com usuário "${u}" e a senha informada.`);
}

// Dados de exemplo: 1 dono (admin), 3 vendedores, produtos, estoque e vendas.
// Uso:  npm run seed   (lê .env.local)
//
// Pode ser rodado mais de uma vez: usuários e produtos existentes são reaproveitados
// e as vendas de exemplo só são criadas se o banco ainda não tiver vendas.
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SERVICE) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY (.env.local).",
  );
  process.exit(1);
}

// Mesmo domínio usado em src/lib/usuarios.ts
const DOMINIO = "usuarios.insista.app";
const emailDe = (usuario) => `${usuario}@${DOMINIO}`;

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const USUARIOS = [
  { usuario: "dono", nome: "Dono Insista", senha: "insista123", papel: "admin", comissao: 0 },
  { usuario: "joao", nome: "João Pereira", senha: "joao1234", papel: "vendedor", comissao: 10, telefone: "(34) 99999-0001" },
  { usuario: "maria", nome: "Maria Souza", senha: "maria1234", papel: "vendedor", comissao: 12, telefone: "(34) 99999-0002" },
  { usuario: "pedro", nome: "Pedro Lima", senha: "pedro1234", papel: "vendedor", comissao: 8, telefone: "(34) 99999-0003" },
];

const PRODUTOS = [
  { sku: "INS-RAIZ-VM", nome: "Raiz Forte", cor: "Verde Musgo", preco: 129.9, minimo: 3, foto: "raiz-forte.png",
    estoque: { P: 6, M: 14, G: 12, GG: 8, XG: 4 } },
  { sku: "INS-BOI-MT", nome: "Boiadeiro", cor: "Marrom Terra", preco: 129.9, minimo: 3, foto: "boiadeiro.png",
    estoque: { P: 4, M: 10, G: 10, GG: 6, XG: 2 } },
  { sku: "INS-SAFRA-AR", nome: "Safra Boa", cor: "Areia", preco: 119.9, minimo: 4, foto: "safra-boa.png",
    estoque: { P: 8, M: 16, G: 14, GG: 10, XG: 5 } },
  { sku: "INS-PORT-PT", nome: "Porteira Aberta", cor: "Preto", preco: 139.9, minimo: 3, foto: "porteira-aberta.png",
    estoque: { P: 5, M: 12, G: 12, GG: 7, XG: 3 } },
  { sku: "INS-CAMPO-OF", nome: "Nascer no Campo", cor: "Off-white", preco: 119.9, minimo: 3, foto: "nascer-no-campo.png",
    estoque: { P: 3, M: 8, G: 9, GG: 5, XG: 1 } },
  { sku: "INS-TRAT-CC", nome: "Trator Velho", cor: "Cinza Chumbo", preco: 129.9, minimo: 5, foto: "trator-velho.png",
    estoque: { P: 2, M: 6, G: 4, GG: 3, XG: 0 } },
  { sku: "INS-RAIZ-PLUS", nome: "Raiz Forte Plus", cor: "Preto", preco: 149.9, minimo: 2, foto: null,
    estoque: { G1: 4, G2: 5, G3: 3, G4: 2, G5: 1 } },
  { sku: "INS-ROD25-VN", nome: "Rodeio 2025 (edição antiga)", cor: "Vinho", preco: 99.9, minimo: 0, foto: null,
    estoque: { P: 0, M: 2, G: 1, GG: 0, XG: 0 }, inativo: true },
];

const FORMAS = ["pix", "pix", "pix", "dinheiro", "dinheiro", "cartao", "cartao", "fiado"];
const CLIENTES = ["Seu Zé da Fazenda Boa Vista", "Dona Cida", "Tonho do Leilão", "Carlos (peão)", "Lu do Haras", null, null, null];

function aleatorio(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function garantirUsuarios() {
  const { data: lista, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const ids = {};
  for (const u of USUARIOS) {
    const email = emailDe(u.usuario);
    let user = lista.users.find((x) => x.email === email);
    if (!user) {
      const { data, error: e } = await admin.auth.admin.createUser({
        email,
        password: u.senha,
        email_confirm: true,
        user_metadata: { nome: u.nome, usuario: u.usuario, telefone: u.telefone ?? null, comissao_percentual: u.comissao },
        app_metadata: { papel: u.papel },
      });
      if (e) throw new Error(`Criando ${u.usuario}: ${e.message}`);
      user = data.user;
      console.log(`+ usuário ${u.usuario} (${u.papel})`);
    } else {
      console.log(`= usuário ${u.usuario} já existe`);
    }
    ids[u.usuario] = user.id;
  }
  return ids;
}

async function clienteLogado(usuario, senha) {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email: emailDe(usuario), password: senha });
  if (error) throw new Error(`Login ${usuario}: ${error.message}`);
  return c;
}

async function enviarFoto(arquivo) {
  if (!arquivo) return null;
  const local = path.join(__dirname, "seed-fotos", arquivo);
  if (!existsSync(local)) return null;
  const buffer = await readFile(local);
  const destino = `exemplos/${arquivo}`;
  const { error } = await admin.storage.from("produtos").upload(destino, buffer, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) {
    console.warn(`  (foto ${arquivo} não enviada: ${error.message})`);
    return null;
  }
  return admin.storage.from("produtos").getPublicUrl(destino).data.publicUrl;
}

async function garantirProdutos(dono) {
  const mapa = {};
  for (const p of PRODUTOS) {
    const { data: existente } = await dono.from("produtos").select("id").eq("sku", p.sku).maybeSingle();
    if (existente) {
      console.log(`= produto ${p.sku} já existe`);
      mapa[p.sku] = { id: existente.id, ...p };
      continue;
    }
    const foto_url = await enviarFoto(p.foto);
    const { data, error } = await dono
      .from("produtos")
      .insert({ sku: p.sku, nome: p.nome, cor: p.cor, preco: p.preco, estoque_minimo: p.minimo, foto_url, tamanhos: Object.keys(p.estoque) })
      .select("id")
      .single();
    if (error) throw new Error(`Produto ${p.sku}: ${error.message}`);

    const itens = Object.keys(p.estoque).map((t) => ({ tamanho: t, quantidade: p.estoque[t] + 6 })).filter((i) => i.quantidade > 0);
    const dataEntrada = new Date(Date.now() - 32 * 864e5).toISOString().slice(0, 10);
    const { error: e2 } = await dono.rpc("registrar_entrada", {
      p_produto_id: data.id,
      p_itens: itens,
      p_data: dataEntrada,
      p_observacao: "Estoque inicial (dados de exemplo)",
    });
    if (e2) throw new Error(`Entrada ${p.sku}: ${e2.message}`);
    if (p.inativo) {
      await dono.from("produtos").update({ ativo: false }).eq("id", data.id);
    }
    console.log(`+ produto ${p.sku}`);
    mapa[p.sku] = { id: data.id, ...p };
  }
  return mapa;
}

async function criarVendas(ids, produtos) {
  const { count } = await admin.from("vendas").select("id", { count: "exact", head: true });
  if (count && count > 0) {
    console.log(`= já existem ${count} vendas; vendas de exemplo não serão criadas`);
    return;
  }
  const vendedores = ["joao", "maria", "pedro"];
  const ativos = Object.values(produtos).filter((p) => !p.inativo);
  let criadas = 0;
  // ~35 dias de histórico, mais vendas recentes
  for (let dia = 34; dia >= 0; dia--) {
    const vendasNoDia = dia === 0 ? 5 : Math.floor(Math.random() * 3);
    for (let i = 0; i < vendasNoDia; i++) {
      const vendedor = aleatorio(vendedores);
      const produto = aleatorio(ativos);
      const tamanho = aleatorio(Object.keys(produto.estoque));
      const quantidade = Math.random() < 0.85 ? 1 : 2;
      const desconto = Math.random() < 0.2 ? 10 : 0;
      const quando = new Date(Date.now() - dia * 864e5);
      quando.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
      if (quando > new Date()) quando.setTime(Date.now() - (5 - i) * 15 * 60e3);
      const { error } = await admin.rpc("_registrar_venda", {
        p_vendedor_id: ids[vendedor],
        p_client_id: crypto.randomUUID(),
        p_produto_id: produto.id,
        p_tamanho: tamanho,
        p_quantidade: quantidade,
        p_valor_unitario: Math.max(0, produto.preco - desconto),
        p_forma_pagamento: aleatorio(FORMAS),
        p_observacao: aleatorio(CLIENTES),
        p_vendida_em: quando.toISOString(),
      });
      if (error) {
        // estoque acabou para essa combinação — tudo bem, segue
        if (!/Estoque insuficiente/.test(error.message)) throw error;
      } else {
        criadas++;
      }
    }
  }
  console.log(`+ ${criadas} vendas de exemplo`);
}

const ids = await garantirUsuarios();
const dono = await clienteLogado("dono", "insista123");
const produtos = await garantirProdutos(dono);
await criarVendas(ids, produtos);

console.log("\nPronto! Acessos de teste:");
for (const u of USUARIOS) console.log(`  ${u.papel.padEnd(8)}  usuário: ${u.usuario.padEnd(6)} senha: ${u.senha}`);

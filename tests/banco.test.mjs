// Testes das regras de negócio e da segurança (RLS) no Supabase LOCAL.
// Pré-requisitos: `npx supabase start`, `npx supabase db reset` e `npm run seed`.
// Uso: npm run test:banco
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_URL = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const DOMINIO = "usuarios.insista.app";

const sql = (q) => execFileSync("psql", [DB_URL, "-tAc", q], { encoding: "utf8" }).trim();
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

async function login(usuario, senha) {
  const c = createClient(URL, ANON, opts);
  const { data, error } = await c.auth.signInWithPassword({ email: `${usuario}@${DOMINIO}`, password: senha });
  if (error) throw error;
  c.userId = data.user.id;
  return c;
}

const anon = createClient(URL, ANON, opts);
const service = createClient(URL, SERVICE, opts);
const dono = await login("dono", "insista123");
const joao = await login("joao", "joao1234");
const maria = await login("maria", "maria1234");

// produto de teste com estoque controlado
const SKU = `TESTE-${Date.now()}`;
const { data: produto, error: eProd } = await dono
  .from("produtos")
  .insert({ nome: "Produto Teste", sku: SKU, cor: "Teste", preco: 100, estoque_minimo: 1, tamanhos: ["P", " m ", "G2", "38"] })
  .select()
  .single();
if (eProd) throw eProd;
{
  const { error } = await dono.rpc("registrar_entrada", {
    p_produto_id: produto.id,
    p_itens: [{ tamanho: "M", quantidade: 5 }],
    p_observacao: "teste",
  });
  if (error) throw error;
}
const estoqueM = async () =>
  (await service.from("estoque").select("quantidade").eq("produto_id", produto.id).eq("tamanho", "M").single()).data
    .quantidade;

const venda = (cliente, extra = {}) =>
  cliente.rpc("registrar_venda", {
    p_client_id: crypto.randomUUID(),
    p_produto_id: produto.id,
    p_tamanho: "M",
    p_quantidade: 1,
    p_valor_unitario: 90,
    p_forma_pagamento: "pix",
    p_observacao: "Cliente teste",
    ...extra,
  });

test("anônimo não lê nada", async () => {
  for (const t of ["produtos", "estoque", "vendas", "perfis", "auditoria"]) {
    const { data } = await anon.from(t).select("*").limit(1);
    assert.ok(!data || data.length === 0, `anon leu ${t}`);
  }
  const { error } = await anon.rpc("registrar_venda", {
    p_client_id: crypto.randomUUID(), p_produto_id: produto.id, p_tamanho: "M",
    p_quantidade: 1, p_valor_unitario: 1, p_forma_pagamento: "pix",
  });
  assert.ok(error, "anon conseguiu vender");
});

test("estoque começa com a entrada registrada", async () => {
  assert.equal(await estoqueM(), 5);
});

test("tamanhos livres: normaliza, cria estoque e recusa tamanho inexistente", async () => {
  const { data: p } = await service.from("produtos").select("tamanhos").eq("id", produto.id).single();
  assert.deepEqual(p.tamanhos, ["P", "M", "G2", "38"]);
  const linhas = sql(`select string_agg(tamanho, ',' order by tamanho) from public.estoque where produto_id='${produto.id}'`);
  assert.equal(linhas, "38,G2,M,P");
  const r1 = await venda(joao, { p_tamanho: "XGG" });
  assert.ok(r1.error);
  assert.match(r1.error.message, /não existe/);
  const r2 = await dono.rpc("registrar_entrada", { p_produto_id: produto.id, p_itens: [{ tamanho: "g2", quantidade: 2 }] });
  assert.ifError(r2.error);
  const g2 = sql(`select quantidade from public.estoque where produto_id='${produto.id}' and tamanho='G2'`);
  assert.equal(g2, "2");
  // não deixa remover tamanho com estoque
  const r3 = await dono.from("produtos").update({ tamanhos: ["P", "M", "38"] }).eq("id", produto.id);
  assert.ok(r3.error);
  assert.match(r3.error.message, /G2 ainda tem 2/);
  // sem estoque pode remover e adicionar outro
  const r4 = await dono.from("produtos").update({ tamanhos: ["P", "M", "G2", "XGG"] }).eq("id", produto.id);
  assert.ifError(r4.error);
  assert.equal(sql(`select count(*) from public.estoque where produto_id='${produto.id}' and tamanho='XGG'`), "1");
  const r5 = await dono.from("produtos").update({ tamanhos: [] }).eq("id", produto.id);
  assert.ok(r5.error, "aceitou produto sem tamanhos");
});

test("vendedor registra baixa com valor alterado e o valor cobrado fica gravado", async () => {
  const { data, error } = await venda(joao, { p_quantidade: 2, p_valor_unitario: 85.5 });
  assert.ifError(error);
  assert.equal(Number(data.preco_tabela), 100);
  assert.equal(Number(data.valor_unitario), 85.5);
  assert.equal(Number(data.valor_total), 171);
  assert.equal(data.vendedor_id, joao.userId);
  assert.equal(await estoqueM(), 3);
});

test("mesma baixa reenviada (offline) não duplica", async () => {
  const id = crypto.randomUUID();
  const a = await venda(maria, { p_client_id: id });
  const b = await venda(maria, { p_client_id: id });
  assert.ifError(a.error);
  assert.ifError(b.error);
  assert.equal(a.data.id, b.data.id);
  assert.equal(await estoqueM(), 2);
});

test("bloqueia baixa maior que o estoque", async () => {
  const { error } = await venda(joao, { p_quantidade: 3 });
  assert.ok(error);
  assert.match(error.message, /Estoque insuficiente/);
  assert.equal(error.hint, "ESTOQUE_INSUFICIENTE");
  assert.equal(await estoqueM(), 2);
});

test("vendedor não vê vendas de outros vendedores nem perfis alheios", async () => {
  const { data: vendas } = await joao.from("vendas").select("vendedor_id");
  assert.ok(vendas.length > 0);
  assert.ok(vendas.every((v) => v.vendedor_id === joao.userId));
  const { data: perfis } = await joao.from("perfis").select("id");
  assert.deepEqual(perfis.map((p) => p.id), [joao.userId]);
  const { data: resumo } = await joao.rpc("resumo_vendas", { p_inicio: "2000-01-01", p_fim: "2100-01-01" });
  assert.ok(resumo.por_vendedor.every((v) => v.vendedor_id === joao.userId));
});

test("vendedor não edita produtos, estoque, vendas nem o próprio papel", async () => {
  const r1 = await joao.from("produtos").update({ preco: 1 }).eq("id", produto.id).select();
  assert.ok(r1.error || r1.data.length === 0, "vendedor alterou produto");
  const r2 = await joao.from("produtos").insert({ nome: "X", sku: `X-${Date.now()}`, preco: 1 });
  assert.ok(r2.error, "vendedor criou produto");
  const r3 = await joao.from("estoque").update({ quantidade: 999 }).eq("produto_id", produto.id);
  assert.ok(r3.error, "vendedor alterou estoque");
  const r4 = await joao.from("vendas").update({ valor_total: 1 }).eq("vendedor_id", joao.userId);
  assert.ok(r4.error, "vendedor alterou venda");
  const r5 = await joao.from("perfis").update({ papel: "admin" }).eq("id", joao.userId);
  assert.ok(r5.error, "vendedor virou admin");
  const r6 = await joao.rpc("registrar_entrada", { p_produto_id: produto.id, p_itens: [{ tamanho: "M", quantidade: 50 }] });
  assert.ok(r6.error, "vendedor deu entrada");
  const r7 = await joao.rpc("ajustar_estoque", { p_produto_id: produto.id, p_tamanho: "M", p_nova_quantidade: 50, p_motivo: "x" });
  assert.ok(r7.error, "vendedor ajustou estoque");
  const r8 = await joao.rpc("_registrar_venda", {
    p_vendedor_id: maria.userId, p_client_id: crypto.randomUUID(), p_produto_id: produto.id, p_tamanho: "M",
    p_quantidade: 1, p_valor_unitario: 1, p_forma_pagamento: "pix", p_observacao: null, p_vendida_em: null,
  });
  assert.ok(r8.error, "vendedor chamou função interna");
  const { data: aud } = await joao.from("auditoria").select("id").limit(1);
  assert.equal(aud.length, 0);
  assert.equal(await estoqueM(), 2);
});

test("vendedor cancela a própria baixa em até 10 min; não cancela a de outro", async () => {
  const { data: v } = await venda(joao);
  assert.equal(await estoqueM(), 1);
  const outro = await maria.rpc("cancelar_venda", { p_venda_id: v.id });
  assert.ok(outro.error, "maria cancelou venda do joão");
  const { data, error } = await joao.rpc("cancelar_venda", { p_venda_id: v.id });
  assert.ifError(error);
  assert.equal(data.status, "cancelada");
  assert.equal(await estoqueM(), 2);
  const denovo = await joao.rpc("cancelar_venda", { p_venda_id: v.id });
  assert.ok(denovo.error);
});

test("após 10 min só o admin cancela, com motivo obrigatório", async () => {
  const { data: v } = await venda(joao);
  sql(`update public.vendas set created_at = now() - interval '11 minutes' where id = '${v.id}'`);
  const r1 = await joao.rpc("cancelar_venda", { p_venda_id: v.id });
  assert.ok(r1.error);
  assert.equal(r1.error.hint, "PRAZO_EXPIRADO");
  const r2 = await dono.rpc("cancelar_venda", { p_venda_id: v.id, p_motivo: "  " });
  assert.ok(r2.error, "admin cancelou sem motivo");
  const r3 = await dono.rpc("cancelar_venda", { p_venda_id: v.id, p_motivo: "Cliente devolveu" });
  assert.ifError(r3.error);
  assert.equal(r3.data.motivo_cancelamento, "Cliente devolveu");
  assert.equal(await estoqueM(), 2);
  const aud = sql(
    `select motivo from public.auditoria where tabela='vendas' and registro_id='${v.id}' and acao='UPDATE' order by id desc limit 1`,
  );
  assert.equal(aud, "Cliente devolveu");
});

test("admin altera valor da venda e a auditoria registra de/para e motivo", async () => {
  const { data: v } = await venda(maria);
  const r = await dono.rpc("alterar_venda", {
    p_venda_id: v.id, p_valor_unitario: 70, p_forma_pagamento: "fiado", p_observacao: "Fiado p/ dia 10", p_motivo: "Acerto",
  });
  assert.ifError(r.error);
  assert.equal(Number(r.data.valor_total), 70);
  const alt = JSON.parse(
    sql(`select alteracoes from public.auditoria where tabela='vendas' and registro_id='${v.id}' and acao='UPDATE' order by id desc limit 1`),
  );
  assert.equal(alt.valor_total.para, 70);
  assert.equal(alt.forma_pagamento.de, "pix");
  const quem = sql(`select usuario_id from public.auditoria where tabela='vendas' and registro_id='${v.id}' and acao='UPDATE' order by id desc limit 1`);
  assert.equal(quem, dono.userId);
});

test("ajuste de estoque exige motivo e gera movimentação", async () => {
  const r1 = await dono.rpc("ajustar_estoque", { p_produto_id: produto.id, p_tamanho: "M", p_nova_quantidade: 10, p_motivo: "" });
  assert.ok(r1.error);
  const r2 = await dono.rpc("ajustar_estoque", { p_produto_id: produto.id, p_tamanho: "M", p_nova_quantidade: 10, p_motivo: "Contagem" });
  assert.ifError(r2.error);
  assert.equal(await estoqueM(), 10);
  const mov = sql(`select tipo || ':' || quantidade from public.movimentacoes_estoque where produto_id='${produto.id}' order by id desc limit 1`);
  assert.equal(mov, "ajuste:9");
});

test("nada é apagado de verdade", async () => {
  const r = await dono.from("vendas").delete().eq("vendedor_id", joao.userId);
  assert.ok(r.error || (r.count ?? 0) === 0);
  assert.throws(() => sql(`delete from public.vendas where produto_id = '${produto.id}'`), /não podem ser apagados/);
  assert.throws(() => sql(`delete from public.produtos where id = '${produto.id}'`), /não podem ser apagados/);
  assert.throws(() => sql(`update public.auditoria set motivo = 'x' where id = (select min(id) from public.auditoria)`), /não podem ser alterados/);
});

test("vendedor não vê produto inativo; admin vê", async () => {
  await dono.from("produtos").update({ ativo: false }).eq("id", produto.id);
  const { data: j } = await joao.from("produtos").select("id").eq("id", produto.id);
  assert.equal(j.length, 0);
  const { data: d } = await dono.from("produtos").select("id").eq("id", produto.id);
  assert.equal(d.length, 1);
  const r = await venda(joao);
  assert.ok(r.error, "vendeu produto inativo");
  await dono.from("produtos").update({ ativo: true }).eq("id", produto.id);
});

test("vendedor desativado não registra baixa", async () => {
  sql(`update public.perfis set ativo = false where usuario = 'pedro'`);
  try {
    const pedro = await login("pedro", "pedro1234");
    const r = await venda(pedro);
    assert.ok(r.error);
    assert.match(r.error.message, /desativado/);
  } finally {
    sql(`update public.perfis set ativo = true where usuario = 'pedro'`);
  }
});

test("data da venda offline não pode ser futura nem muito antiga", async () => {
  const futuro = new Date(Date.now() + 864e5 * 3).toISOString();
  const { data: v1 } = await venda(joao, { p_vendida_em: futuro });
  assert.ok(new Date(v1.vendida_em) <= new Date(Date.now() + 5000));
  const antigo = new Date(Date.now() - 864e5 * 30).toISOString();
  const { data: v2 } = await venda(joao, { p_vendida_em: antigo });
  assert.ok(new Date(v2.vendida_em) >= new Date(Date.now() - 864e5 * 7 - 60000));
  const umaHora = new Date(Date.now() - 3600e3).toISOString();
  const { data: v3 } = await venda(joao, { p_vendida_em: umaHora });
  assert.equal(new Date(v3.vendida_em).toISOString(), umaHora);
});

test("resumo do admin traz totais, formas de pagamento e rankings", async () => {
  const { data, error } = await dono.rpc("resumo_vendas", { p_inicio: "2000-01-01", p_fim: "2100-01-01" });
  assert.ifError(error);
  assert.ok(Number(data.valor) > 0);
  assert.ok(data.por_vendedor.length >= 2);
  assert.ok(data.por_forma.length >= 1);
  assert.ok(data.por_design.length >= 1);
  const joaoLinha = data.por_vendedor.find((v) => v.vendedor_id === joao.userId);
  assert.equal(Number(joaoLinha.comissao), Math.round(Number(joaoLinha.valor) * 10) / 100);
});

test.after(() => {
  // desativa o produto de teste para não poluir o catálogo
  sql(`update public.produtos set ativo = false where sku = '${SKU}'`);
});

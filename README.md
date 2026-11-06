# Insista — Estoque e Baixa de Vendas

Sistema web da **Insista** (camisetas manga longa agro) para controle de estoque e baixa de vendas feitas por vendedores de rua.
Cada vendedor dá baixa pelo celular — **mesmo sem internet** — e o dono acompanha tudo **em tempo real**.

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **Supabase**: Postgres + Auth + Realtime + Storage (fotos)
- **PWA instalável**, mobile-first, com fila offline e sincronização automática
- Modo claro/escuro; cores da marca (preto, vermelho e branco) num único arquivo (`src/app/tema.css`)

---

## Sumário

1. [O que o sistema faz](#o-que-o-sistema-faz)
2. [Rodar no seu computador](#rodar-no-seu-computador)
3. [Publicar na Vercel (produção)](#publicar-na-vercel-produção)
4. [Instalar no celular](#instalar-no-celular-pwa)
5. [Como funciona o modo offline](#como-funciona-o-modo-offline)
6. [Segurança e auditoria](#segurança-e-auditoria)
7. [Personalizar cores e logo](#personalizar-cores-e-logo)
8. [Estrutura do projeto](#estrutura-do-projeto)
9. [Testes](#testes)
10. [Dúvidas comuns](#dúvidas-comuns)

---

## O que o sistema faz

### Vendedor (celular)
- **Dar baixa em poucos toques:** produto → tamanho → (quantidade) → pagamento → **Confirmar**.
- Busca por nome ou SKU e filtro por design.
- Valor já vem com o preço de venda; dá para alterar (desconto) e o **valor cobrado fica registrado**.
- Pagamento: **Dinheiro, Pix, Cartão ou Fiado**. Observação opcional (ex.: nome do cliente).
- **Bloqueia baixa maior que o estoque** (no aparelho e no servidor).
- Consulta de estoque e **histórico próprio** (com total vendido no dia).
- **Cancela a própria baixa em até 10 minutos.** Depois disso, só o dono cancela.
- **Sem sinal?** A baixa fica guardada no aparelho com o aviso **"pendente de envio"** e é enviada sozinha quando a conexão volta.

### Dono (admin)
- **Painel ao vivo:** vendas de hoje, da semana e do mês (quantidade e valor), ranking de vendedores, designs mais vendidos, totais por forma de pagamento com **destaque para o fiado**, alerta de estoque baixo e **feed em tempo real** das últimas baixas.
- **Produtos:** nome do design, SKU, foto, cor, preço, alerta de estoque baixo por produto, ativar/desativar.
- **Tamanhos digitados livremente** por produto (PP, P, M, G, GG, XG, XGG, G1…G5, 2…16, 36…46 ou qualquer outro), com atalhos para grades comuns.
- **Estoque** único por produto e tamanho: **entrada/reposição** com data e quantidade, **ajuste de inventário** com motivo, histórico de movimentações.
- **Vendedores:** cadastrar, editar, trocar senha, definir % de comissão, **desativar** (bloqueia o login na hora).
- **Vendas:** histórico completo com filtros (período, vendedor, produto, pagamento, situação), **cancelar** ou **alterar valor** (motivo obrigatório), exportar **CSV** e **PDF**.
- **Relatórios:** faturamento por período e por vendedor, **cálculo de comissão**, faturamento por dia, por design e por pagamento — com exportação **CSV/PDF**.
- **Auditoria:** quem fez, quando e o que mudou (de → para), com o motivo.

---

## Rodar no seu computador

### Pré-requisitos
- [Node.js 20+](https://nodejs.org)
- Um projeto no [Supabase](https://supabase.com) (o plano gratuito serve) **ou** o Supabase local (precisa de Docker)

### 1. Instalar
```bash
git clone https://github.com/SEU-USUARIO/insista.git
cd insista
npm install
```

### 2. Criar o banco no Supabase
1. Em [supabase.com/dashboard](https://supabase.com/dashboard), clique em **New project** (região sugerida: *South America (São Paulo)*).
2. Abra **SQL Editor → New query** e rode, **em ordem e uma vez cada**, os arquivos da pasta `supabase/migrations/`:
   1. `20261106000000_schema_inicial.sql` — tabelas, regras, políticas de segurança (RLS), Realtime e bucket de fotos;
   2. `20261107000000_tamanhos_livres.sql` — tamanhos digitados por produto.
   3. `20261108000000_codigo_produto.sql` — código do produto (opcional).

   Cole **todo** o conteúdo de cada arquivo e clique em **Run**.

   > Alternativa pela linha de comando:
   > ```bash
   > npx supabase login
   > npx supabase link --project-ref SEU_PROJECT_REF
   > npx supabase db push
   > ```
3. Em **Authentication → Sign In / Providers**, **desative "Allow new users to sign up"**.
   Os acessos são criados só pelo dono, dentro do sistema.

### 3. Configurar as chaves
Copie o arquivo de exemplo e preencha com os dados de **Project Settings → API Keys** (e a URL em **Project Settings → Data API**):
```bash
cp .env.example .env.local
```
| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave **publishable** (ou a antiga **anon**) |
| `SUPABASE_SERVICE_ROLE_KEY` | chave **secret** (ou a antiga **service_role**) — **nunca** coloque no navegador nem publique |

### 4. Dados de exemplo (para testar)
```bash
npm run seed
```
Cria 6 produtos com fotos ilustrativas e estoque, ~35 dias de vendas e estes acessos:

| Papel | Usuário | Senha |
|---|---|---|
| Dono (admin) | `dono` | `insista123` |
| Vendedor | `joao` | `joao1234` |
| Vendedor | `maria` | `maria1234` |
| Vendedor | `pedro` | `pedro1234` |

> **Em produção, não rode o seed.** Crie só o seu acesso de dono:
> ```bash
> npm run criar-admin -- dono SuaSenhaForte "Seu Nome"
> ```
> Se já rodou o seed em produção, troque as senhas ou desative os vendedores de exemplo na tela **Vendedores**.

### 5. Rodar
```bash
npm run dev
```
Abra <http://localhost:3000>. O dono cai no **Painel**; o vendedor, na tela **Dar baixa**.

> O modo offline (service worker) só funciona no build de produção:
> `npm run build && npm start`.

### (Opcional) Supabase local com Docker
```bash
npx supabase start        # sobe Postgres/Auth/Realtime/Storage locais e aplica a migração
npx supabase status       # mostra URL e chaves para o .env.local
npm run seed
```

---

## Publicar na Vercel (produção)

1. Envie o código para o GitHub (repositório privado é o recomendado).
2. Em [vercel.com/new](https://vercel.com/new), clique em **Import** no repositório. O framework **Next.js** é detectado sozinho.
3. Em **Environment Variables**, adicione as 3 variáveis do `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
4. Clique em **Deploy**. Em ~1 minuto o sistema estará em `https://seu-projeto.vercel.app`.
5. No Supabase, em **Authentication → URL Configuration**, coloque a URL da Vercel em **Site URL**.
6. Crie o acesso do dono (no seu computador, com o `.env.local` apontando para o Supabase de produção):
   ```bash
   npm run criar-admin -- dono SuaSenhaForte "Seu Nome"
   ```
7. Entre como dono → **Produtos** (cadastre as camisetas) → **Estoque** (dê entrada) → **Vendedores** (crie os acessos).

Cada `git push` na branch principal publica uma nova versão automaticamente.

> **Domínio próprio:** Vercel → Project → Settings → Domains.
> **Plano gratuito do Supabase:** o projeto é pausado após ~1 semana sem uso; para operação diária isso não acontece, mas considere o plano Pro para backups diários.

---

## Instalar no celular (PWA)

Abra o endereço do sistema no celular e faça login uma vez **com internet**. Depois:

- **Android (Chrome):** menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").
- **iPhone (Safari):** botão **Compartilhar** → **Adicionar à Tela de Início**.

O ícone da Insista aparece na tela inicial e o app abre em tela cheia, como um aplicativo.

---

## Como funciona o modo offline

1. Toda baixa entra primeiro numa **fila guardada no aparelho** e é enviada na hora se houver sinal.
2. Sem sinal, ela fica **"pendente de envio"** (selo amarelo no topo e na aba Histórico). O estoque mostrado no aparelho já desconta as baixas pendentes, então o vendedor não vende a mesma peça duas vezes.
3. O app tenta reenviar sozinho quando a conexão volta, quando o app é reaberto e a cada 20 segundos.
4. Cada baixa tem um **identificador único** gerado no aparelho: reenviar nunca duplica uma venda.
5. Se o servidor recusar uma baixa pendente (ex.: outro vendedor vendeu a última peça enquanto este estava sem sinal), ela aparece em vermelho em **"Não aceitas"**. O vendedor pode **tentar de novo** ou **descartar**.
6. A data registrada é a **hora em que a venda aconteceu no aparelho** (limitada a até 7 dias atrás).
7. O app (telas, produtos, fotos e histórico) fica guardado pelo service worker e **abre mesmo sem internet**, depois do primeiro acesso.

> **Importante para os vendedores:** não "limpar dados do navegador" e não sair da conta com baixas pendentes — o app avisa se houver alguma.

---

## Segurança e auditoria

- **RLS (Row Level Security)** em todas as tabelas:
  - Vendedor vê só os **próprios** perfil, vendas e histórico; vê produtos ativos e o estoque; **não** edita produtos nem estoque.
  - Dono vê e edita tudo.
  - Usuários anônimos não acessam nada.
- **Baixas, cancelamentos, entradas e ajustes** só acontecem por **funções no banco** (`registrar_venda`, `cancelar_venda`, `alterar_venda`, `registrar_entrada`, `ajustar_estoque`). Elas validam estoque com trava de linha (dois vendedores não vendem a mesma última peça), o prazo de 10 minutos, o motivo obrigatório e as permissões.
- **Nada é apagado:** `DELETE` é bloqueado por trigger; vendas são **canceladas** e produtos/vendedores **desativados**.
- **Auditoria automática** (`auditoria`): cada criação/alteração em vendas, produtos, usuários e estoque grava quem fez, quando, o antes/depois, os campos alterados e o motivo. A tabela de auditoria não pode ser alterada.
- O papel de **admin** só pode ser definido pelo servidor (service role); ninguém se cadastra como dono.
- A chave secreta (`SUPABASE_SERVICE_ROLE_KEY`) é usada **apenas** na rota de servidor `/api/admin/vendedores` (criar vendedor, trocar senha, bloquear login), que confere se quem chamou é o dono.

---

## Personalizar cores e logo

- **Cores** (hoje: preto, vermelho e branco): edite **`src/app/tema.css`** — há um bloco para o modo claro (`:root`) e outro para o escuro (`.dark`). Todo o sistema usa essas variáveis.
- **Logo:** o emblema está em `src/components/logo.tsx`; os ícones do app em `public/icons/` (192, 512, maskable e apple-touch).
- **Nome/cor do app instalado:** `src/app/manifest.ts`.

---

## Estrutura do projeto

```
supabase/
  migrations/…_schema_inicial.sql   # tabelas, funções, RLS, auditoria, realtime, storage
  migrations/…_tamanhos_livres.sql  # tamanhos digitados por produto
  migrations/…_codigo_produto.sql   # código curto do produto
scripts/
  seed.mjs                          # dados de exemplo
  criar-admin.mjs                   # cria o dono em produção
  seed-fotos/                       # fotos ilustrativas dos produtos de exemplo
tests/banco.test.mjs                # testes das regras e da segurança (RLS)
public/
  sw.js                             # service worker (offline)
  icons/  offline.html
src/
  app/
    tema.css                        # ← CORES DA MARCA
    login/                          # entrada
    vender/                         # app do vendedor (Dar baixa / Estoque / Histórico)
    admin/                          # painel, vendas, estoque, produtos, vendedores, relatórios, auditoria
    api/admin/vendedores/route.ts   # criação/bloqueio de usuários (servidor)
  components/                       # UI, autenticação, gráficos, telas do vendedor
  lib/
    offline/                        # fila, sincronização e catálogo guardados no aparelho
    exportar.ts                     # CSV e PDF
```

---

## Testes

Os testes de banco usam o **Supabase local** (Docker):
```bash
npx supabase start
npx supabase db reset
npm run seed
npm run test:banco
```
Eles verificam: baixa com valor alterado, bloqueio acima do estoque, reenvio offline sem duplicar, prazo de 10 minutos, cancelamento pelo admin com motivo, vendedor sem acesso a dados de outros, vendedor sem permissão de editar produto/estoque, vendedor desativado bloqueado, auditoria com de/para e motivo, e que nada é apagado.

Outros comandos: `npm run typecheck` · `npm run lint` · `npm run build`.

---

## Dúvidas comuns

**O vendedor esqueceu a senha.** Dono → **Vendedores** → **Senha**.

**Um vendedor saiu da equipe.** Dono → **Vendedores** → **Desativar**. O login é bloqueado na hora, e o histórico dele continua nos relatórios.

**Lancei uma entrada errada.** Use **Estoque → Ajustar** informando a quantidade correta e o motivo (fica na auditoria).

**Venda cobrada errado.** Dono → **Vendas** → ✏️ (alterar valor/pagamento) com motivo, ou **Cancelar** com motivo.

**Como os vendedores entram?** Com o **usuário** (ex.: `joao`) e a senha criados pelo dono. Internamente o Supabase usa um e-mail técnico `usuario@usuarios.insista.app`; nenhum e-mail é enviado.

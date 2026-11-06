-- =====================================================================
-- Insista — Controle de estoque e baixa de vendas
-- Schema inicial: tabelas, regras de negócio (RPC), auditoria e RLS.
--
-- Princípios:
--  * Nada é apagado: DELETE é bloqueado por trigger nas tabelas de negócio.
--  * Vendedores NÃO escrevem direto nas tabelas: toda baixa/cancelamento
--    passa por funções (RPC) que validam estoque, prazos e permissões.
--  * Toda alteração relevante fica registrada em public.auditoria.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.papel as enum ('admin', 'vendedor');
create type public.tamanho as enum ('P', 'M', 'G', 'GG', 'XG');
create type public.forma_pagamento as enum ('dinheiro', 'pix', 'cartao', 'fiado');
create type public.status_venda as enum ('ativa', 'cancelada');
create type public.tipo_movimento as enum ('entrada', 'ajuste', 'venda', 'cancelamento_venda');

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

-- Perfil de cada usuário (1:1 com auth.users)
create table public.perfis (
  id uuid primary key references auth.users (id) on delete restrict,
  nome text not null,
  usuario text not null unique,
  telefone text,
  papel public.papel not null default 'vendedor',
  ativo boolean not null default true,
  comissao_percentual numeric(5, 2) not null default 0
    check (comissao_percentual between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),        -- nome do design
  sku text not null unique check (length(trim(sku)) > 0),
  cor text not null default '',
  foto_url text,
  preco numeric(10, 2) not null check (preco >= 0),          -- preço de venda
  estoque_minimo integer not null default 3 check (estoque_minimo >= 0),
  ativo boolean not null default true,
  created_by uuid references public.perfis (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Estoque único e geral, por produto e tamanho
create table public.estoque (
  produto_id uuid not null references public.produtos (id) on delete restrict,
  tamanho public.tamanho not null,
  quantidade integer not null default 0 check (quantidade >= 0),
  updated_at timestamptz not null default now(),
  primary key (produto_id, tamanho)
);

create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  -- gerado no aparelho; garante que a mesma baixa offline não entre duas vezes
  client_id uuid not null unique,
  vendedor_id uuid not null references public.perfis (id),
  produto_id uuid not null references public.produtos (id),
  tamanho public.tamanho not null,
  quantidade integer not null check (quantidade > 0),
  preco_tabela numeric(10, 2) not null check (preco_tabela >= 0),     -- unitário de tabela
  valor_unitario numeric(10, 2) not null check (valor_unitario >= 0), -- unitário cobrado
  valor_total numeric(10, 2) not null check (valor_total >= 0),       -- total cobrado
  forma_pagamento public.forma_pagamento not null,
  observacao text,
  vendida_em timestamptz not null default now(),  -- quando a venda aconteceu (aparelho)
  created_at timestamptz not null default now(),  -- quando chegou ao servidor
  status public.status_venda not null default 'ativa',
  cancelada_em timestamptz,
  cancelada_por uuid references public.perfis (id),
  motivo_cancelamento text,
  updated_at timestamptz not null default now()
);

create index vendas_vendida_em_idx on public.vendas (vendida_em desc);
create index vendas_vendedor_idx on public.vendas (vendedor_id, vendida_em desc);
create index vendas_produto_idx on public.vendas (produto_id, vendida_em desc);

-- Livro-razão do estoque: toda variação de quantidade gera um movimento
create table public.movimentacoes_estoque (
  id bigint generated always as identity primary key,
  produto_id uuid not null references public.produtos (id),
  tamanho public.tamanho not null,
  tipo public.tipo_movimento not null,
  quantidade integer not null,          -- variação (+ entrada / - saída)
  saldo_apos integer not null,
  data_movimento date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  observacao text,
  venda_id uuid references public.vendas (id),
  created_by uuid references public.perfis (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index movimentacoes_produto_idx on public.movimentacoes_estoque (produto_id, created_at desc);

-- Trilha de auditoria (somente inserção)
create table public.auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text not null,
  acao text not null,                    -- INSERT / UPDATE
  antes jsonb,
  depois jsonb,
  alteracoes jsonb,                      -- apenas os campos que mudaram
  motivo text,
  usuario_id uuid references public.perfis (id),
  created_at timestamptz not null default now()
);

create index auditoria_created_idx on public.auditoria (created_at desc);
create index auditoria_registro_idx on public.auditoria (tabela, registro_id);

-- ---------------------------------------------------------------------
-- Funções utilitárias
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = 'admin' and ativo
  );
$$;

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger perfis_updated_at before update on public.perfis
  for each row execute function public.tg_set_updated_at();
create trigger produtos_updated_at before update on public.produtos
  for each row execute function public.tg_set_updated_at();
create trigger estoque_updated_at before update on public.estoque
  for each row execute function public.tg_set_updated_at();
create trigger vendas_updated_at before update on public.vendas
  for each row execute function public.tg_set_updated_at();

-- Bloqueia DELETE: nada é apagado de verdade
create or replace function public.tg_bloquear_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Registros de % não podem ser apagados. Desative ou cancele.', tg_table_name
    using errcode = 'P0001';
end;
$$;

create trigger perfis_sem_delete before delete on public.perfis
  for each row execute function public.tg_bloquear_delete();
create trigger produtos_sem_delete before delete on public.produtos
  for each row execute function public.tg_bloquear_delete();
create trigger estoque_sem_delete before delete on public.estoque
  for each row execute function public.tg_bloquear_delete();
create trigger vendas_sem_delete before delete on public.vendas
  for each row execute function public.tg_bloquear_delete();
create trigger movimentacoes_sem_delete before delete on public.movimentacoes_estoque
  for each row execute function public.tg_bloquear_delete();
create trigger auditoria_sem_delete before delete on public.auditoria
  for each row execute function public.tg_bloquear_delete();

-- Auditoria é imutável
create or replace function public.tg_bloquear_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Registros de % não podem ser alterados.', tg_table_name
    using errcode = 'P0001';
end;
$$;

create trigger auditoria_sem_update before update on public.auditoria
  for each row execute function public.tg_bloquear_update();
create trigger movimentacoes_sem_update before update on public.movimentacoes_estoque
  for each row execute function public.tg_bloquear_update();

-- Grava a auditoria. O motivo pode ser informado pelas funções via
-- set_config('app.motivo', ..., true).
create or replace function public.tg_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes jsonb;
  v_depois jsonb;
  v_alteracoes jsonb;
  v_id text;
  v_usuario uuid;
begin
  if tg_op = 'INSERT' then
    v_depois := to_jsonb(new);
    v_id := v_depois ->> 'id';
  else
    v_antes := to_jsonb(old);
    v_depois := to_jsonb(new);
    v_id := v_depois ->> 'id';
    select coalesce(jsonb_object_agg(d.key, jsonb_build_object('de', v_antes -> d.key, 'para', d.value)), '{}'::jsonb)
      into v_alteracoes
      from jsonb_each(v_depois) d
     where d.key <> 'updated_at'
       and (v_antes -> d.key) is distinct from d.value;
    if v_alteracoes = '{}'::jsonb then
      return new; -- nada relevante mudou
    end if;
  end if;

  -- usuário só é gravado se existir perfil (chamadas do sistema ficam nulas)
  select p.id into v_usuario from public.perfis p where p.id = auth.uid();

  insert into public.auditoria (tabela, registro_id, acao, antes, depois, alteracoes, motivo, usuario_id)
  values (
    tg_table_name, coalesce(v_id, ''), tg_op, v_antes, v_depois, v_alteracoes,
    nullif(current_setting('app.motivo', true), ''),
    v_usuario
  );
  return new;
end;
$$;

create trigger perfis_auditoria after insert or update on public.perfis
  for each row execute function public.tg_auditoria();
create trigger produtos_auditoria after insert or update on public.produtos
  for each row execute function public.tg_auditoria();
create trigger vendas_auditoria after insert or update on public.vendas
  for each row execute function public.tg_auditoria();
create trigger movimentacoes_auditoria after insert on public.movimentacoes_estoque
  for each row execute function public.tg_auditoria();

-- Ao criar produto, cria as linhas de estoque (zeradas) para todos os tamanhos
create or replace function public.tg_produto_criar_estoque()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.estoque (produto_id, tamanho, quantidade)
  select new.id, t, 0
    from unnest(enum_range(null::public.tamanho)) as t
  on conflict do nothing;
  return new;
end;
$$;

create trigger produtos_criar_estoque after insert on public.produtos
  for each row execute function public.tg_produto_criar_estoque();

-- Ao criar usuário no Auth, cria o perfil.
-- O papel vem de app_metadata (só o service role consegue definir), então
-- ninguém se cadastra como admin por conta própria.
create or replace function public.tg_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario text;
begin
  v_usuario := coalesce(
    nullif(new.raw_user_meta_data ->> 'usuario', ''),
    split_part(new.email, '@', 1),
    new.id::text
  );
  insert into public.perfis (id, nome, usuario, telefone, papel, comissao_percentual)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), v_usuario),
    lower(v_usuario),
    nullif(new.raw_user_meta_data ->> 'telefone', ''),
    case when new.raw_app_meta_data ->> 'papel' = 'admin' then 'admin'::public.papel
         else 'vendedor'::public.papel end,
    coalesce((new.raw_user_meta_data ->> 'comissao_percentual')::numeric, 0)
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.tg_novo_usuario();

-- O Auth pode gravar o app_metadata logo após o INSERT; sincroniza o papel.
create or replace function public.tg_usuario_papel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.raw_app_meta_data ->> 'papel') is distinct from (old.raw_app_meta_data ->> 'papel')
     and (new.raw_app_meta_data ->> 'papel') in ('admin', 'vendedor') then
    update public.perfis
       set papel = (new.raw_app_meta_data ->> 'papel')::public.papel
     where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_papel after update of raw_app_meta_data on auth.users
  for each row execute function public.tg_usuario_papel();

-- Impede que um usuário comum altere o próprio papel/ativo/comissão
create or replace function public.tg_perfis_protecao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.papel is distinct from old.papel
       or new.ativo is distinct from old.ativo
       or new.comissao_percentual is distinct from old.comissao_percentual
       or new.usuario is distinct from old.usuario then
      raise exception 'Sem permissão para alterar estes dados.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger perfis_protecao before update on public.perfis
  for each row execute function public.tg_perfis_protecao();

-- ---------------------------------------------------------------------
-- Regras de negócio (RPC)
-- ---------------------------------------------------------------------

-- Núcleo da baixa. Não exposto a clientes: chamado por registrar_venda
-- (vendedor logado) ou pelo service role (seed/importações).
create or replace function public._registrar_venda(
  p_vendedor_id uuid,
  p_client_id uuid,
  p_produto_id uuid,
  p_tamanho public.tamanho,
  p_quantidade integer,
  p_valor_unitario numeric,
  p_forma_pagamento public.forma_pagamento,
  p_observacao text,
  p_vendida_em timestamptz
)
returns public.vendas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venda public.vendas;
  v_produto public.produtos;
  v_disponivel integer;
  v_saldo integer;
begin
  -- Idempotência: a mesma baixa (client_id) reenviada devolve o registro original
  select * into v_venda from public.vendas where client_id = p_client_id;
  if found then
    if v_venda.vendedor_id <> p_vendedor_id then
      raise exception 'Identificador de baixa já utilizado.' using errcode = 'P0001';
    end if;
    return v_venda;
  end if;

  if not exists (select 1 from public.perfis where id = p_vendedor_id and ativo) then
    raise exception 'Usuário desativado. Fale com o administrador.' using errcode = 'P0001';
  end if;

  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade inválida.' using errcode = 'P0001';
  end if;
  if p_valor_unitario is null or p_valor_unitario < 0 then
    raise exception 'Valor inválido.' using errcode = 'P0001';
  end if;

  select * into v_produto from public.produtos where id = p_produto_id;
  if not found or not v_produto.ativo then
    raise exception 'Produto indisponível.' using errcode = 'P0001';
  end if;

  -- trava a linha de estoque para evitar venda simultânea do mesmo item
  select quantidade into v_disponivel
    from public.estoque
   where produto_id = p_produto_id and tamanho = p_tamanho
   for update;

  if coalesce(v_disponivel, 0) < p_quantidade then
    raise exception 'Estoque insuficiente: % tam. % tem apenas % un.',
      v_produto.nome, p_tamanho, coalesce(v_disponivel, 0)
      using errcode = 'P0001', hint = 'ESTOQUE_INSUFICIENTE';
  end if;

  update public.estoque
     set quantidade = quantidade - p_quantidade
   where produto_id = p_produto_id and tamanho = p_tamanho
   returning quantidade into v_saldo;

  insert into public.vendas (
    client_id, vendedor_id, produto_id, tamanho, quantidade,
    preco_tabela, valor_unitario, valor_total, forma_pagamento,
    observacao, vendida_em
  ) values (
    p_client_id, p_vendedor_id, p_produto_id, p_tamanho, p_quantidade,
    v_produto.preco, round(p_valor_unitario, 2), round(p_valor_unitario * p_quantidade, 2),
    p_forma_pagamento, nullif(trim(coalesce(p_observacao, '')), ''),
    coalesce(p_vendida_em, now())
  )
  returning * into v_venda;

  insert into public.movimentacoes_estoque (
    produto_id, tamanho, tipo, quantidade, saldo_apos, venda_id, created_by, data_movimento
  ) values (
    p_produto_id, p_tamanho, 'venda', -p_quantidade, v_saldo, v_venda.id, p_vendedor_id,
    (v_venda.vendida_em at time zone 'America/Sao_Paulo')::date
  );

  return v_venda;
end;
$$;

-- Baixa feita pelo usuário logado (vendedor ou admin).
-- p_vendida_em: horário do aparelho (baixas offline). Não pode ser no futuro
-- nem mais antigo que 7 dias.
create or replace function public.registrar_venda(
  p_client_id uuid,
  p_produto_id uuid,
  p_tamanho public.tamanho,
  p_quantidade integer,
  p_valor_unitario numeric,
  p_forma_pagamento public.forma_pagamento,
  p_observacao text default null,
  p_vendida_em timestamptz default null
)
returns public.vendas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quando timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Faça login novamente.' using errcode = '42501';
  end if;
  v_quando := least(coalesce(p_vendida_em, now()), now());
  v_quando := greatest(v_quando, now() - interval '7 days');
  return public._registrar_venda(
    auth.uid(), p_client_id, p_produto_id, p_tamanho, p_quantidade,
    p_valor_unitario, p_forma_pagamento, p_observacao, v_quando
  );
end;
$$;

-- Cancelamento: vendedor cancela a própria baixa em até 10 minutos após o
-- registro. Depois disso, só o admin, e o motivo é obrigatório.
create or replace function public.cancelar_venda(
  p_venda_id uuid,
  p_motivo text default null
)
returns public.vendas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venda public.vendas;
  v_admin boolean := public.is_admin();
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_saldo integer;
begin
  if auth.uid() is null then
    raise exception 'Faça login novamente.' using errcode = '42501';
  end if;

  select * into v_venda from public.vendas where id = p_venda_id for update;
  if not found then
    raise exception 'Venda não encontrada.' using errcode = 'P0001';
  end if;
  if v_venda.status = 'cancelada' then
    raise exception 'Esta venda já foi cancelada.' using errcode = 'P0001';
  end if;

  if v_admin then
    if v_motivo is null then
      raise exception 'Informe o motivo do cancelamento.' using errcode = 'P0001';
    end if;
  else
    if v_venda.vendedor_id <> auth.uid() then
      raise exception 'Você só pode cancelar as suas vendas.' using errcode = '42501';
    end if;
    if now() - v_venda.created_at > interval '10 minutes' then
      raise exception 'O prazo de 10 minutos para cancelar terminou. Peça ao administrador.'
        using errcode = 'P0001', hint = 'PRAZO_EXPIRADO';
    end if;
    if not exists (select 1 from public.perfis where id = auth.uid() and ativo) then
      raise exception 'Usuário desativado.' using errcode = '42501';
    end if;
  end if;

  perform set_config('app.motivo', coalesce(v_motivo, 'Cancelado pelo vendedor'), true);

  update public.vendas
     set status = 'cancelada',
         cancelada_em = now(),
         cancelada_por = auth.uid(),
         motivo_cancelamento = coalesce(v_motivo, 'Cancelado pelo vendedor')
   where id = p_venda_id
   returning * into v_venda;

  update public.estoque
     set quantidade = quantidade + v_venda.quantidade
   where produto_id = v_venda.produto_id and tamanho = v_venda.tamanho
   returning quantidade into v_saldo;

  insert into public.movimentacoes_estoque (
    produto_id, tamanho, tipo, quantidade, saldo_apos, venda_id, observacao
  ) values (
    v_venda.produto_id, v_venda.tamanho, 'cancelamento_venda', v_venda.quantidade,
    v_saldo, v_venda.id, v_venda.motivo_cancelamento
  );

  perform set_config('app.motivo', '', true);
  return v_venda;
end;
$$;

-- Admin altera valor/forma de pagamento/observação de uma venda (auditado)
create or replace function public.alterar_venda(
  p_venda_id uuid,
  p_valor_unitario numeric,
  p_forma_pagamento public.forma_pagamento,
  p_observacao text,
  p_motivo text
)
returns public.vendas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venda public.vendas;
begin
  if not public.is_admin() then
    raise exception 'Apenas o administrador pode alterar vendas.' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_motivo, '')), '') is null then
    raise exception 'Informe o motivo da alteração.' using errcode = 'P0001';
  end if;
  if p_valor_unitario is null or p_valor_unitario < 0 then
    raise exception 'Valor inválido.' using errcode = 'P0001';
  end if;

  select * into v_venda from public.vendas where id = p_venda_id for update;
  if not found then
    raise exception 'Venda não encontrada.' using errcode = 'P0001';
  end if;
  if v_venda.status = 'cancelada' then
    raise exception 'Venda cancelada não pode ser alterada.' using errcode = 'P0001';
  end if;

  perform set_config('app.motivo', trim(p_motivo), true);

  update public.vendas
     set valor_unitario = round(p_valor_unitario, 2),
         valor_total = round(p_valor_unitario * quantidade, 2),
         forma_pagamento = p_forma_pagamento,
         observacao = nullif(trim(coalesce(p_observacao, '')), '')
   where id = p_venda_id
   returning * into v_venda;

  perform set_config('app.motivo', '', true);
  return v_venda;
end;
$$;

-- Entrada de estoque (reposição). p_itens: [{"tamanho":"M","quantidade":10}, ...]
create or replace function public.registrar_entrada(
  p_produto_id uuid,
  p_itens jsonb,
  p_data date default null,
  p_observacao text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_tamanho public.tamanho;
  v_qtd integer;
  v_saldo integer;
  v_total integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Apenas o administrador registra entradas.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.produtos where id = p_produto_id) then
    raise exception 'Produto não encontrado.' using errcode = 'P0001';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'Itens inválidos.' using errcode = 'P0001';
  end if;

  perform set_config('app.motivo', coalesce(nullif(trim(coalesce(p_observacao, '')), ''), 'Entrada de estoque'), true);

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_tamanho := (v_item ->> 'tamanho')::public.tamanho;
    v_qtd := (v_item ->> 'quantidade')::integer;
    if v_qtd is null or v_qtd = 0 then
      continue;
    end if;
    if v_qtd < 0 then
      raise exception 'Quantidade de entrada deve ser positiva.' using errcode = 'P0001';
    end if;

    update public.estoque
       set quantidade = quantidade + v_qtd
     where produto_id = p_produto_id and tamanho = v_tamanho
     returning quantidade into v_saldo;

    insert into public.movimentacoes_estoque (
      produto_id, tamanho, tipo, quantidade, saldo_apos, data_movimento, observacao
    ) values (
      p_produto_id, v_tamanho, 'entrada', v_qtd, v_saldo,
      coalesce(p_data, (now() at time zone 'America/Sao_Paulo')::date),
      nullif(trim(coalesce(p_observacao, '')), '')
    );
    v_total := v_total + v_qtd;
  end loop;

  if v_total = 0 then
    raise exception 'Informe ao menos uma quantidade.' using errcode = 'P0001';
  end if;

  perform set_config('app.motivo', '', true);
  return v_total;
end;
$$;

-- Ajuste de inventário (contagem): define a quantidade exata. Motivo obrigatório.
create or replace function public.ajustar_estoque(
  p_produto_id uuid,
  p_tamanho public.tamanho,
  p_nova_quantidade integer,
  p_motivo text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atual integer;
begin
  if not public.is_admin() then
    raise exception 'Apenas o administrador ajusta o estoque.' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_motivo, '')), '') is null then
    raise exception 'Informe o motivo do ajuste.' using errcode = 'P0001';
  end if;
  if p_nova_quantidade is null or p_nova_quantidade < 0 then
    raise exception 'Quantidade inválida.' using errcode = 'P0001';
  end if;

  select quantidade into v_atual
    from public.estoque
   where produto_id = p_produto_id and tamanho = p_tamanho
   for update;
  if not found then
    raise exception 'Produto não encontrado.' using errcode = 'P0001';
  end if;
  if v_atual = p_nova_quantidade then
    return v_atual;
  end if;

  perform set_config('app.motivo', trim(p_motivo), true);

  update public.estoque
     set quantidade = p_nova_quantidade
   where produto_id = p_produto_id and tamanho = p_tamanho;

  insert into public.movimentacoes_estoque (
    produto_id, tamanho, tipo, quantidade, saldo_apos, observacao
  ) values (
    p_produto_id, p_tamanho, 'ajuste', p_nova_quantidade - v_atual, p_nova_quantidade, trim(p_motivo)
  );

  perform set_config('app.motivo', '', true);
  return p_nova_quantidade;
end;
$$;

-- Resumo de vendas de um período (somente vendas ativas).
-- SECURITY INVOKER: respeita RLS — admin vê tudo, vendedor vê só as próprias.
create or replace function public.resumo_vendas(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_vendedor_id uuid default null,
  p_produto_id uuid default null,
  p_forma public.forma_pagamento default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (
    select v.*
      from public.vendas v
     where v.status = 'ativa'
       and v.vendida_em >= p_inicio
       and v.vendida_em < p_fim
       and (p_vendedor_id is null or v.vendedor_id = p_vendedor_id)
       and (p_produto_id is null or v.produto_id = p_produto_id)
       and (p_forma is null or v.forma_pagamento = p_forma)
  )
  select jsonb_build_object(
    'num_vendas', (select count(*) from base),
    'quantidade', (select coalesce(sum(quantidade), 0) from base),
    'valor', (select coalesce(sum(valor_total), 0) from base),
    'desconto', (select coalesce(sum(preco_tabela * quantidade - valor_total), 0) from base),
    'por_forma', coalesce((
      select jsonb_agg(x order by x.valor desc)
        from (select forma_pagamento as forma, sum(quantidade) as quantidade,
                     sum(valor_total) as valor, count(*) as num_vendas
                from base group by forma_pagamento) x
    ), '[]'::jsonb),
    'por_vendedor', coalesce((
      select jsonb_agg(x order by x.valor desc, x.quantidade desc)
        from (select b.vendedor_id, p.nome, p.usuario, p.comissao_percentual,
                     sum(b.quantidade) as quantidade, sum(b.valor_total) as valor,
                     count(*) as num_vendas,
                     round(sum(b.valor_total) * p.comissao_percentual / 100, 2) as comissao,
                     sum(b.valor_total) filter (where b.forma_pagamento = 'fiado') as fiado
                from base b join public.perfis p on p.id = b.vendedor_id
               group by b.vendedor_id, p.nome, p.usuario, p.comissao_percentual) x
    ), '[]'::jsonb),
    'por_design', coalesce((
      select jsonb_agg(x order by x.quantidade desc, x.valor desc)
        from (select b.produto_id, pr.nome, pr.sku, pr.cor,
                     sum(b.quantidade) as quantidade, sum(b.valor_total) as valor
                from base b join public.produtos pr on pr.id = b.produto_id
               group by b.produto_id, pr.nome, pr.sku, pr.cor) x
    ), '[]'::jsonb),
    'por_dia', coalesce((
      select jsonb_agg(x order by x.dia)
        from (select (vendida_em at time zone 'America/Sao_Paulo')::date as dia,
                     sum(quantidade) as quantidade, sum(valor_total) as valor
                from base group by 1) x
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------
-- Segurança: RLS
-- ---------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.produtos enable row level security;
alter table public.estoque enable row level security;
alter table public.vendas enable row level security;
alter table public.movimentacoes_estoque enable row level security;
alter table public.auditoria enable row level security;

-- perfis: cada um vê o próprio; admin vê e edita todos
create policy "perfis: ver o próprio ou admin" on public.perfis
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "perfis: admin edita" on public.perfis
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- produtos: todos logados veem os ativos; admin vê todos e edita
create policy "produtos: ver ativos ou admin" on public.produtos
  for select to authenticated
  using (ativo or (select public.is_admin()));
create policy "produtos: admin cria" on public.produtos
  for insert to authenticated
  with check ((select public.is_admin()));
create policy "produtos: admin edita" on public.produtos
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- estoque: leitura para logados; escrita só via funções
create policy "estoque: ver" on public.estoque
  for select to authenticated
  using (true);

-- vendas: vendedor vê as próprias; admin vê todas; escrita só via funções
create policy "vendas: ver próprias ou admin" on public.vendas
  for select to authenticated
  using (vendedor_id = (select auth.uid()) or (select public.is_admin()));

-- movimentações e auditoria: só admin
create policy "movimentacoes: admin" on public.movimentacoes_estoque
  for select to authenticated
  using ((select public.is_admin()));
create policy "auditoria: admin" on public.auditoria
  for select to authenticated
  using ((select public.is_admin()));

-- Privilégios: anônimos não acessam nada; logados só o necessário
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant select on public.perfis, public.produtos, public.estoque, public.vendas,
  public.movimentacoes_estoque, public.auditoria to authenticated;
grant insert (nome, sku, cor, foto_url, preco, estoque_minimo, ativo) on public.produtos to authenticated;
grant update (nome, sku, cor, foto_url, preco, estoque_minimo, ativo) on public.produtos to authenticated;
grant update (nome, telefone, comissao_percentual, ativo) on public.perfis to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.registrar_venda(uuid, uuid, public.tamanho, integer, numeric, public.forma_pagamento, text, timestamptz) to authenticated;
grant execute on function public.cancelar_venda(uuid, text) to authenticated;
grant execute on function public.alterar_venda(uuid, numeric, public.forma_pagamento, text, text) to authenticated;
grant execute on function public.registrar_entrada(uuid, jsonb, date, text) to authenticated;
grant execute on function public.ajustar_estoque(uuid, public.tamanho, integer, text) to authenticated;
grant execute on function public.resumo_vendas(timestamptz, timestamptz, uuid, uuid, public.forma_pagamento) to authenticated;
-- _registrar_venda fica disponível só para o service role (seed/importação)
grant execute on function public._registrar_venda(uuid, uuid, uuid, public.tamanho, integer, numeric, public.forma_pagamento, text, timestamptz) to service_role;

alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Realtime: painel do dono e estoque ao vivo
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.vendas;
alter publication supabase_realtime add table public.estoque;

-- ---------------------------------------------------------------------
-- Storage: fotos dos produtos (bucket público para leitura)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "fotos: admin envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'produtos' and (select public.is_admin()));
create policy "fotos: admin atualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'produtos' and (select public.is_admin()));
create policy "fotos: leitura" on storage.objects
  for select to authenticated, anon
  using (bucket_id = 'produtos');

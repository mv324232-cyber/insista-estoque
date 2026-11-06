-- =====================================================================
-- Insista — Tamanhos livres (digitados) por produto
--
-- Antes: tamanhos fixos P, M, G, GG, XG.
-- Agora: cada produto tem a sua lista de tamanhos (ex.: PP, P, M, G, GG,
-- XG, XGG, G1, G2, 2, 4, 6, 36, 38...), digitada no cadastro.
--
-- Dados existentes são preservados: produtos antigos ficam com P, M, G, GG, XG.
-- Rode este arquivo UMA vez, depois do schema inicial.
-- =====================================================================

-- 1) Colunas de tamanho passam a ser texto ------------------------------
alter table public.estoque alter column tamanho type text using tamanho::text;
alter table public.vendas alter column tamanho type text using tamanho::text;
alter table public.movimentacoes_estoque alter column tamanho type text using tamanho::text;

alter table public.estoque add constraint estoque_tamanho_valido
  check (length(tamanho) between 1 and 12 and tamanho = upper(trim(tamanho)));

-- 2) Lista de tamanhos do produto (na ordem em que aparecem para o vendedor)
alter table public.produtos add column tamanhos text[] not null default '{}';

update public.produtos p
   set tamanhos = coalesce((
     select array_agg(e.tamanho order by array_position(array['P','M','G','GG','XG'], e.tamanho), e.tamanho)
       from public.estoque e
      where e.produto_id = p.id
   ), '{}');

grant insert (tamanhos) on public.produtos to authenticated;
grant update (tamanhos) on public.produtos to authenticated;

-- 3) Normaliza a lista (maiúsculas, sem espaços/repetidos) e protege tamanhos
--    que ainda têm peças em estoque.
create or replace function public.tg_produto_tamanhos()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_lista text[];
  v_removido record;
begin
  select coalesce(array_agg(t order by ord), '{}')
    into v_lista
    from (
      select distinct on (t) t, ord
        from (
          select upper(trim(x)) as t, ord
            from unnest(coalesce(new.tamanhos, '{}')) with ordinality as u(x, ord)
        ) a
       where t <> ''
       order by t, ord
    ) b;

  if exists (select 1 from unnest(v_lista) t where length(t) > 12) then
    raise exception 'Cada tamanho pode ter no máximo 12 caracteres.' using errcode = 'P0001';
  end if;
  if cardinality(v_lista) = 0 then
    raise exception 'Informe ao menos um tamanho.' using errcode = 'P0001';
  end if;
  if cardinality(v_lista) > 60 then
    raise exception 'Máximo de 60 tamanhos por produto.' using errcode = 'P0001';
  end if;
  new.tamanhos := v_lista;

  if tg_op = 'UPDATE' then
    for v_removido in
      select e.tamanho, e.quantidade
        from public.estoque e
       where e.produto_id = new.id
         and e.quantidade > 0
         and not (e.tamanho = any (v_lista))
    loop
      raise exception 'O tamanho % ainda tem % peça(s) em estoque. Zere o estoque dele (Estoque → Ajustar) antes de removê-lo.',
        v_removido.tamanho, v_removido.quantidade using errcode = 'P0001';
    end loop;
  end if;
  return new;
end;
$$;

create trigger produtos_tamanhos before insert or update of tamanhos on public.produtos
  for each row execute function public.tg_produto_tamanhos();

-- Cria a linha de estoque (zerada) para cada tamanho novo
create or replace function public.tg_produto_criar_estoque()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.estoque (produto_id, tamanho, quantidade)
  select new.id, t, 0
    from unnest(new.tamanhos) as t
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists produtos_criar_estoque on public.produtos;
create trigger produtos_criar_estoque after insert or update of tamanhos on public.produtos
  for each row execute function public.tg_produto_criar_estoque();

-- 4) Funções que usavam o tipo antigo ------------------------------------
drop function if exists public.registrar_venda(uuid, uuid, public.tamanho, integer, numeric, public.forma_pagamento, text, timestamptz);
drop function if exists public._registrar_venda(uuid, uuid, uuid, public.tamanho, integer, numeric, public.forma_pagamento, text, timestamptz);
drop function if exists public.ajustar_estoque(uuid, public.tamanho, integer, text);

create or replace function public._registrar_venda(
  p_vendedor_id uuid,
  p_client_id uuid,
  p_produto_id uuid,
  p_tamanho text,
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
  v_tamanho text := upper(trim(coalesce(p_tamanho, '')));
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
   where produto_id = p_produto_id and tamanho = v_tamanho
   for update;
  if not found then
    raise exception 'O tamanho % não existe para %.', v_tamanho, v_produto.nome using errcode = 'P0001';
  end if;

  if v_disponivel < p_quantidade then
    raise exception 'Estoque insuficiente: % tam. % tem apenas % un.',
      v_produto.nome, v_tamanho, v_disponivel
      using errcode = 'P0001', hint = 'ESTOQUE_INSUFICIENTE';
  end if;

  update public.estoque
     set quantidade = quantidade - p_quantidade
   where produto_id = p_produto_id and tamanho = v_tamanho
   returning quantidade into v_saldo;

  insert into public.vendas (
    client_id, vendedor_id, produto_id, tamanho, quantidade,
    preco_tabela, valor_unitario, valor_total, forma_pagamento,
    observacao, vendida_em
  ) values (
    p_client_id, p_vendedor_id, p_produto_id, v_tamanho, p_quantidade,
    v_produto.preco, round(p_valor_unitario, 2), round(p_valor_unitario * p_quantidade, 2),
    p_forma_pagamento, nullif(trim(coalesce(p_observacao, '')), ''),
    coalesce(p_vendida_em, now())
  )
  returning * into v_venda;

  insert into public.movimentacoes_estoque (
    produto_id, tamanho, tipo, quantidade, saldo_apos, venda_id, created_by, data_movimento
  ) values (
    p_produto_id, v_tamanho, 'venda', -p_quantidade, v_saldo, v_venda.id, p_vendedor_id,
    (v_venda.vendida_em at time zone 'America/Sao_Paulo')::date
  );

  return v_venda;
end;
$$;

create or replace function public.registrar_venda(
  p_client_id uuid,
  p_produto_id uuid,
  p_tamanho text,
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
  v_tamanho text;
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
    v_tamanho := upper(trim(coalesce(v_item ->> 'tamanho', '')));
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
    if not found then
      raise exception 'O tamanho % não está cadastrado neste produto.', v_tamanho using errcode = 'P0001';
    end if;

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

create or replace function public.ajustar_estoque(
  p_produto_id uuid,
  p_tamanho text,
  p_nova_quantidade integer,
  p_motivo text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tamanho text := upper(trim(coalesce(p_tamanho, '')));
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
   where produto_id = p_produto_id and tamanho = v_tamanho
   for update;
  if not found then
    raise exception 'Tamanho não encontrado neste produto.' using errcode = 'P0001';
  end if;
  if v_atual = p_nova_quantidade then
    return v_atual;
  end if;

  perform set_config('app.motivo', trim(p_motivo), true);

  update public.estoque
     set quantidade = p_nova_quantidade
   where produto_id = p_produto_id and tamanho = v_tamanho;

  insert into public.movimentacoes_estoque (
    produto_id, tamanho, tipo, quantidade, saldo_apos, observacao
  ) values (
    p_produto_id, v_tamanho, 'ajuste', p_nova_quantidade - v_atual, p_nova_quantidade, trim(p_motivo)
  );

  perform set_config('app.motivo', '', true);
  return p_nova_quantidade;
end;
$$;

drop type public.tamanho;

-- 5) Permissões das novas assinaturas ------------------------------------
revoke execute on function public._registrar_venda(uuid, uuid, uuid, text, integer, numeric, public.forma_pagamento, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.registrar_venda(uuid, uuid, text, integer, numeric, public.forma_pagamento, text, timestamptz) from public, anon;
revoke execute on function public.ajustar_estoque(uuid, text, integer, text) from public, anon;
revoke execute on function public.tg_produto_tamanhos() from public, anon, authenticated;
grant execute on function public.registrar_venda(uuid, uuid, text, integer, numeric, public.forma_pagamento, text, timestamptz) to authenticated;
grant execute on function public.ajustar_estoque(uuid, text, integer, text) to authenticated;
grant execute on function public._registrar_venda(uuid, uuid, uuid, text, integer, numeric, public.forma_pagamento, text, timestamptz) to service_role;

-- Faz a API do Supabase enxergar as colunas novas na hora
notify pgrst, 'reload schema';

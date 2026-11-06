-- =====================================================================
-- Insista — Código do produto (opcional, único)
-- Um código curto que o vendedor pode digitar na busca (ex.: 101, CAM-07).
-- Pode ser rodado mais de uma vez sem problema.
-- =====================================================================

alter table public.produtos add column if not exists codigo text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'produtos_codigo_valido') then
    alter table public.produtos add constraint produtos_codigo_valido
      check (codigo is null or (length(codigo) between 1 and 30 and codigo = upper(trim(codigo))));
  end if;
end $$;

-- único quando preenchido
create unique index if not exists produtos_codigo_unico on public.produtos (codigo) where codigo is not null;

-- normaliza: sem espaços nas pontas, maiúsculas, vazio vira nulo
create or replace function public.tg_produto_codigo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.codigo := nullif(upper(trim(coalesce(new.codigo, ''))), '');
  return new;
end;
$$;

drop trigger if exists produtos_codigo on public.produtos;
create trigger produtos_codigo before insert or update of codigo on public.produtos
  for each row execute function public.tg_produto_codigo();

revoke execute on function public.tg_produto_codigo() from public, anon, authenticated;
grant insert (codigo) on public.produtos to authenticated;
grant update (codigo) on public.produtos to authenticated;

notify pgrst, 'reload schema';

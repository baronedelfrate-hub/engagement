-- Recibos emitidos a partir das baixas de títulos (pagamento a fornecedor ou recebimento de cliente), numerados por empresa.
create table if not exists public.recibos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  numero integer not null,
  baixa_id uuid references public.movimentacao_baixas(id) on delete set null,
  movimentacao_id uuid references public.movimentacao_financeira(id) on delete set null,
  tipo text not null default 'pagar',
  pagador_nome text not null,
  pagador_documento text,
  recebedor_nome text not null,
  recebedor_documento text,
  valor numeric(14,2) not null,
  data date not null,
  referente text not null,
  forma text,
  local text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (company_id, numero)
);
create index if not exists recibos_empresa_data on public.recibos (company_id, data desc);
create index if not exists recibos_baixa on public.recibos (baixa_id);
create or replace function public.recibos_numerar() returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext('recibos:' || new.company_id::text));
  select coalesce(max(numero), 0) + 1 into new.numero from public.recibos where company_id = new.company_id;
  return new;
end $$;
drop trigger if exists recibos_numerar on public.recibos;
create trigger recibos_numerar before insert on public.recibos for each row execute function public.recibos_numerar();
alter table public.recibos enable row level security;
create policy recibos_select on public.recibos for select to authenticated using (
  company_id = (select company_id from public.profiles where id = auth.uid())
  or (select role from public.profiles where id = auth.uid()) = 'superadmin');
create policy recibos_insert on public.recibos for insert to authenticated with check (
  company_id = (select company_id from public.profiles where id = auth.uid())
  or (select role from public.profiles where id = auth.uid()) = 'superadmin');
create policy recibos_delete on public.recibos for delete to authenticated using (
  (select role from public.profiles where id = auth.uid()) in ('admin', 'superadmin')
  and (company_id = (select company_id from public.profiles where id = auth.uid()) or (select role from public.profiles where id = auth.uid()) = 'superadmin'));

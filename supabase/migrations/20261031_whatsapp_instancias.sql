-- Uma instância da Evolution API por empresa. As linhas são criadas/removidas só pela função enviar-whatsapp (service role).
create table if not exists public.whatsapp_instancias (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.empresas(id) on delete cascade,
  instancia text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_instancias enable row level security;

drop policy if exists "Acesso por empresa" on public.whatsapp_instancias;
create policy "Acesso por empresa" on public.whatsapp_instancias for select using (
  (select role from public.profiles where id = auth.uid()) = 'superadmin'
  or company_id = (select company_id from public.profiles where id = auth.uid())
);

revoke insert, update, delete on public.whatsapp_instancias from anon, authenticated;

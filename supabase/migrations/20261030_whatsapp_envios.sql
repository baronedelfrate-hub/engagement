-- Registro das mensagens enviadas pelo WhatsApp (Evolution API). A gravação é feita só pela função enviar-whatsapp (service role).
create table if not exists public.whatsapp_envios (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.empresas(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  tipo text not null,
  destinatario text not null,
  mensagem text not null,
  anexo text,
  status text not null default 'enviado' check (status in ('enviado', 'erro')),
  mensagem_id text,
  erro text,
  ref_tipo text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_envios_empresa_idx on public.whatsapp_envios (company_id, created_at desc);
create index if not exists whatsapp_envios_ref_idx on public.whatsapp_envios (ref_tipo, ref_id, created_at desc);

alter table public.whatsapp_envios enable row level security;

drop policy if exists "Acesso por empresa" on public.whatsapp_envios;
create policy "Acesso por empresa" on public.whatsapp_envios for select using (
  (select role from public.profiles where id = auth.uid()) = 'superadmin'
  or (company_id is not null and company_id = (select company_id from public.profiles where id = auth.uid()))
);

revoke insert, update, delete on public.whatsapp_envios from anon, authenticated;

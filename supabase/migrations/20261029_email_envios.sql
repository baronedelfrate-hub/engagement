-- Registro dos e-mails enviados pela plataforma (Resend). A gravação é feita só pela função enviar-email (service role).
create table if not exists public.email_envios (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.empresas(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  tipo text not null,
  destinatarios text[] not null,
  assunto text not null,
  status text not null default 'enviado' check (status in ('enviado', 'erro')),
  resend_id text,
  erro text,
  anexos text[] not null default '{}',
  ref_tipo text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists email_envios_empresa_idx on public.email_envios (company_id, created_at desc);
create index if not exists email_envios_ref_idx on public.email_envios (ref_tipo, ref_id, created_at desc);

alter table public.email_envios enable row level security;

drop policy if exists "Acesso por empresa" on public.email_envios;
create policy "Acesso por empresa" on public.email_envios for select using (
  (select role from public.profiles where id = auth.uid()) = 'superadmin'
  or (company_id is not null and company_id = (select company_id from public.profiles where id = auth.uid()))
);

-- só leitura para o app; inserções vêm da função (service role)
revoke insert, update, delete on public.email_envios from anon, authenticated;

-- Agenda da empresa (compromissos, eventos, gravacoes, viagens). Os prazos das tarefas aparecem junto na tela, sem duplicar aqui.
create table if not exists public.agenda_eventos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  titulo text not null,
  tipo text not null default 'compromisso' check (tipo in ('compromisso', 'reuniao', 'evento', 'gravacao', 'viagem', 'outro')),
  data_inicio date not null,
  hora_inicio time,
  data_fim date,
  hora_fim time,
  dia_inteiro boolean not null default false,
  local text,
  descricao text,
  responsavel_id uuid references public.profiles(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agenda_eventos_idx on public.agenda_eventos (company_id, data_inicio);

alter table public.agenda_eventos enable row level security;
drop policy if exists "Acesso por empresa" on public.agenda_eventos;
create policy "Acesso por empresa" on public.agenda_eventos for all
  using (((select role from public.profiles where id = auth.uid()) = 'superadmin') or company_id = (select company_id from public.profiles where id = auth.uid()))
  with check (((select role from public.profiles where id = auth.uid()) = 'superadmin') or company_id = (select company_id from public.profiles where id = auth.uid()));

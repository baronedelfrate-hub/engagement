-- Quadro de tarefas (estilo Trello) por empresa e layout personalizavel da tela inicial.
-- Tudo isolado por empresa (company_id), no mesmo padrao do resto do ERP.

create table if not exists public.tarefas_quadros (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  cor text,
  arquivado boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.tarefas_colunas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  quadro_id uuid not null references public.tarefas_quadros(id) on delete cascade,
  nome text not null,
  ordem int not null default 1,
  concluida boolean not null default false
);
create index if not exists tarefas_colunas_idx on public.tarefas_colunas (quadro_id, ordem);

create table if not exists public.tarefas_cartoes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  quadro_id uuid not null references public.tarefas_quadros(id) on delete cascade,
  coluna_id uuid not null references public.tarefas_colunas(id) on delete cascade,
  titulo text not null,
  descricao text,
  responsavel_id uuid references public.profiles(id) on delete set null,
  prazo date,
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  ordem numeric not null default 0,
  checklist jsonb not null default '[]'::jsonb,
  etiquetas text[] not null default '{}',
  concluido_em timestamptz,
  origem text,
  origem_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tarefas_cartoes_idx on public.tarefas_cartoes (company_id, quadro_id, coluna_id, ordem);
create index if not exists tarefas_cartoes_resp_idx on public.tarefas_cartoes (company_id, responsavel_id, concluido_em);

create table if not exists public.tarefas_comentarios (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  cartao_id uuid not null references public.tarefas_cartoes(id) on delete cascade,
  autor_id uuid,
  texto text not null,
  created_at timestamptz not null default now()
);

-- layout da tela inicial: user_id nulo = modelo padrao da empresa; preenchido = personalizacao do usuario
create table if not exists public.dashboard_layouts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  widgets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
create unique index if not exists dashboard_layouts_usuario_uq on public.dashboard_layouts (company_id, user_id) where user_id is not null;
create unique index if not exists dashboard_layouts_padrao_uq on public.dashboard_layouts (company_id) where user_id is null;

-- RLS por empresa (superadmin ve tudo)
do $$
declare t text;
begin
  foreach t in array array['tarefas_quadros','tarefas_colunas','tarefas_cartoes','tarefas_comentarios'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Acesso por empresa" on public.%I', t);
    execute format($p$create policy "Acesso por empresa" on public.%I for all
      using (((select profiles.role from public.profiles where profiles.id = auth.uid()) = 'superadmin') or company_id = (select profiles.company_id from public.profiles where profiles.id = auth.uid()))
      with check (((select profiles.role from public.profiles where profiles.id = auth.uid()) = 'superadmin') or company_id = (select profiles.company_id from public.profiles where profiles.id = auth.uid()))$p$, t);
  end loop;
end $$;

alter table public.dashboard_layouts enable row level security;
drop policy if exists "layout leitura" on public.dashboard_layouts;
create policy "layout leitura" on public.dashboard_layouts for select
  using (((select role from public.profiles where id = auth.uid()) = 'superadmin') or company_id = (select company_id from public.profiles where id = auth.uid()));
drop policy if exists "layout escrita" on public.dashboard_layouts;
create policy "layout escrita" on public.dashboard_layouts for all
  using (
    ((select role from public.profiles where id = auth.uid()) = 'superadmin')
    or (company_id = (select company_id from public.profiles where id = auth.uid())
        and ((user_id = auth.uid()) or (user_id is null and (select role from public.profiles where id = auth.uid()) = 'admin')))
  )
  with check (
    ((select role from public.profiles where id = auth.uid()) = 'superadmin')
    or (company_id = (select company_id from public.profiles where id = auth.uid())
        and ((user_id = auth.uid()) or (user_id is null and (select role from public.profiles where id = auth.uid()) = 'admin')))
  );

-- Colegas da mesma empresa (para escolher o responsavel de uma tarefa). profiles so deixa cada um ver a propria linha.
create or replace function public.usuarios_da_empresa()
returns table (id uuid, nome text, email text, role text)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(nullif(trim(p.nome), ''), split_part(u.email, '@', 1)) as nome, u.email::text, p.role
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.company_id is not null
    and p.company_id = (select company_id from public.profiles where id = auth.uid())
  order by 2;
$$;
revoke all on function public.usuarios_da_empresa() from public, anon;
grant execute on function public.usuarios_da_empresa() to authenticated;

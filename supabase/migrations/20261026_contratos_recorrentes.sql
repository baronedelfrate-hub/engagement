-- Faturamento recorrente: contratos mensais que geram, a cada competencia, um pedido de venda (base da nota).
-- Regras: cobranca no mes seguinte a competencia, dia de faturamento e vencimento por contrato (padrao 15),
-- primeiro e ultimo mes proporcionais aos dias do contrato. Multiempresa (company_id) como o resto do ERP.

create table if not exists public.contratos_recorrentes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  cliente_bpo_id uuid references public.clientes_bpo(id) on delete set null,
  proposta_id uuid references public.crm_propostas(id) on delete set null,
  numero text not null,
  titulo text not null,
  status text not null default 'ativo' check (status in ('ativo', 'pausado', 'encerrado')),
  data_inicio date not null,
  data_fim date,
  vigencia_meses int,
  dia_faturamento int not null default 15 check (dia_faturamento between 1 and 28),
  dia_vencimento int not null default 15 check (dia_vencimento between 1 and 28),
  proporcional boolean not null default true,
  reajuste_mes int check (reajuste_mes between 1 and 12),
  reajuste_indice text,
  ultimo_reajuste date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, numero)
);
create index if not exists contratos_recorrentes_idx on public.contratos_recorrentes (company_id, status);

create table if not exists public.contratos_recorrentes_itens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  contrato_id uuid not null references public.contratos_recorrentes(id) on delete cascade,
  servico_id uuid not null references public.servicos(id) on delete restrict,
  ordem int not null default 1,
  descricao text not null,
  quantidade numeric not null default 1,
  preco_unitario numeric not null default 0,
  desconto numeric not null default 0
);

create table if not exists public.contratos_faturamentos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  contrato_id uuid not null references public.contratos_recorrentes(id) on delete cascade,
  competencia date not null check (extract(day from competencia) = 1),
  valor numeric not null,
  proporcional boolean not null default false,
  dias_cobrados int,
  dias_mes int,
  pedido_venda_id uuid references public.pedidos_venda(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (contrato_id, competencia)
);

create table if not exists public.contratos_reajustes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  contrato_id uuid not null references public.contratos_recorrentes(id) on delete cascade,
  data date not null default current_date,
  percentual numeric not null,
  valor_antes numeric not null,
  valor_depois numeric not null,
  indice text,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['contratos_recorrentes','contratos_recorrentes_itens','contratos_faturamentos','contratos_reajustes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Acesso por empresa" on public.%I', t);
    execute format($p$create policy "Acesso por empresa" on public.%I for all
      using (((select profiles.role from public.profiles where profiles.id = auth.uid()) = 'superadmin') or company_id = (select profiles.company_id from public.profiles where profiles.id = auth.uid()))
      with check (((select profiles.role from public.profiles where profiles.id = auth.uid()) = 'superadmin') or company_id = (select profiles.company_id from public.profiles where profiles.id = auth.uid()))$p$, t);
  end loop;
end $$;

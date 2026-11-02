-- Pessoa fisica (socios) como cadastro proprio, ligada as empresas de que participa.
-- Cada PF e um cadastro em "empresas" (tipo_pessoa = 'PF'): extrato, contas e categorias ficam isolados pelas regras de acesso ja existentes.
alter table public.empresas add column if not exists tipo_pessoa text not null default 'PJ';
alter table public.empresas drop constraint if exists empresas_tipo_pessoa_check;
alter table public.empresas add constraint empresas_tipo_pessoa_check check (tipo_pessoa in ('PJ', 'PF'));

-- novas linhas das categorias pessoais (entradas, gastos, fora do saldo)
alter table public.categorias drop constraint if exists categorias_grupo_dre_check;
alter table public.categorias add constraint categorias_grupo_dre_check check (
  grupo_dre is null or grupo_dre = any (array[
    'custo_servico', 'despesa_operacional', 'nao_operacional',
    'receita_bruta', 'deducoes',
    'custo_mao_obra', 'custo_ferramentas', 'custo_midia', 'custo_deslocamento', 'custo_comissoes',
    'desp_administrativas', 'desp_comerciais', 'desp_estrutura', 'desp_gerais',
    'receita_financeira', 'desp_financeira',
    'socios', 'investimentos', 'emprestimos',
    'repasse_clientes', 'transferencias',
    'pf_entrada', 'pf_gasto', 'pf_fora'
  ]::text[])
);

-- vinculo socio (PF) x empresa (PJ)
create table if not exists public.empresa_socios (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references public.empresas(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  participacao numeric(5,2),
  created_at timestamptz not null default now(),
  unique (pessoa_id, empresa_id),
  check (pessoa_id <> empresa_id)
);
alter table public.empresa_socios enable row level security;
drop policy if exists empresa_socios_superadmin on public.empresa_socios;
drop policy if exists empresa_socios_leitura on public.empresa_socios;
create policy empresa_socios_superadmin on public.empresa_socios for all to authenticated
  using ((select p.role from public.profiles p where p.id = auth.uid()) = 'superadmin')
  with check ((select p.role from public.profiles p where p.id = auth.uid()) = 'superadmin');
create policy empresa_socios_leitura on public.empresa_socios for select to authenticated
  using (
    pessoa_id = (select p.company_id from public.profiles p where p.id = auth.uid())
    or empresa_id = (select p.company_id from public.profiles p where p.id = auth.uid()));

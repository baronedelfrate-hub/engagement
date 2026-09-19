-- Plano de contas unificado (Financeiro + Contabilidade), na estrutura da planilha gerencial.
-- Um mesmo código liga categorias/subcategorias (Financeiro, DRE) e contas_contabeis (Contabilidade).
-- Nada é removido nem substituído: só colunas e índices novos.

-- 1) categorias / subcategorias: código (chave de ligação com o plano) e ordem de exibição
alter table public.categorias    add column if not exists codigo text;
alter table public.categorias    add column if not exists ordem integer;
alter table public.subcategorias add column if not exists codigo text;

create unique index if not exists categorias_company_codigo_uk
  on public.categorias (company_id, codigo) where codigo is not null;
create unique index if not exists subcategorias_company_codigo_uk
  on public.subcategorias (company_id, codigo) where codigo is not null;

-- 2) grupo_dre: linhas da DRE gerencial (mantém os três valores antigos)
alter table public.categorias drop constraint if exists categorias_grupo_dre_check;
alter table public.categorias add constraint categorias_grupo_dre_check check (
  grupo_dre is null or grupo_dre in (
    'custo_servico', 'despesa_operacional', 'nao_operacional',
    'receita_bruta', 'deducoes',
    'custo_mao_obra', 'custo_ferramentas', 'custo_midia',
    'desp_administrativas', 'desp_comerciais', 'desp_estrutura', 'desp_gerais',
    'receita_financeira', 'desp_financeira',
    'socios', 'investimentos', 'emprestimos'
  )
);

-- 3) contas_contabeis: hierarquia (pai), sintética/analítica e linha da DRE
alter table public.contas_contabeis add column if not exists analitica boolean not null default true;
alter table public.contas_contabeis add column if not exists conta_pai_id uuid
  references public.contas_contabeis(id) on delete set null;
alter table public.contas_contabeis add column if not exists grupo_dre text;

create unique index if not exists contas_contabeis_empresa_codigo_uk
  on public.contas_contabeis (coalesce(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid), codigo);

-- 4) A vinculação financeiro x contábil passa a usar o plano único (pc_vinculacoes está vazia)
alter table public.pc_vinculacoes drop constraint if exists pc_vinculacoes_conta_contabil_id_fkey;
alter table public.pc_vinculacoes add constraint pc_vinculacoes_conta_contabil_id_fkey
  foreign key (conta_contabil_id) references public.contas_contabeis(id) on delete set null;

notify pgrst, 'reload schema';

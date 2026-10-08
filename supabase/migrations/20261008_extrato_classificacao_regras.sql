-- Fase 2: extrato do Asaas classificado + regras de de-para

alter table extrato_bancario
  add column if not exists nota_fiscal text,
  add column if not exists categoria_id uuid references categorias(id) on delete set null,
  add column if not exists subcategoria_id uuid references subcategorias(id) on delete set null,
  add column if not exists centro_custo_id uuid references centros_custo(id) on delete set null,
  add column if not exists cliente_nome text,
  add column if not exists classificacao_origem text check (classificacao_origem in ('arquivo', 'regra', 'manual')),
  add column if not exists regra_id uuid,
  add column if not exists estornada boolean not null default false,
  add column if not exists tipo_norm text,
  add column if not exists assinatura text;

-- mesma transação (id do Asaas) não entra duas vezes na mesma empresa/banco
create unique index if not exists extrato_bancario_transacao_unica
  on extrato_bancario (company_id, banco_id, numero_documento)
  where company_id is not null and numero_documento is not null and numero_documento <> '';

create index if not exists extrato_bancario_classificacao_idx
  on extrato_bancario (company_id, tipo_norm, assinatura);

create table if not exists extrato_regras (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references empresas(id) on delete cascade,
  tipo_norm text not null,
  assinatura text,
  categoria_id uuid references categorias(id) on delete set null,
  subcategoria_id uuid references subcategorias(id) on delete set null,
  centro_custo_id uuid references centros_custo(id) on delete set null,
  cliente_nome text,
  created_at timestamptz not null default now(),
  created_by uuid
);

create unique index if not exists extrato_regras_chave
  on extrato_regras (company_id, tipo_norm, coalesce(assinatura, ''));

alter table extrato_regras enable row level security;

create policy "Acesso por empresa" on extrato_regras for all
  using (
    (select role from profiles where id = auth.uid()) = 'superadmin'
    or company_id = (select company_id from profiles where id = auth.uid())
  )
  with check (
    (select role from profiles where id = auth.uid()) = 'superadmin'
    or company_id = (select company_id from profiles where id = auth.uid())
  );

notify pgrst, 'reload schema';

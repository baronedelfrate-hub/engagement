-- Cartoes de credito (etapa 1): cadastro do cartao, lancamentos classificados e fatura ligada ao titulo a pagar.
create table public.cartoes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  final text,
  bandeira text,
  emissor_fornecedor_id uuid references public.fornecedores(id) on delete set null,
  banco_id uuid references public.bancos(id) on delete set null,
  limite numeric(14,2) not null default 0 check (limite >= 0),
  dia_fechamento int not null check (dia_fechamento between 1 and 31),
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  categoria_fatura_id uuid references public.categorias(id) on delete set null,
  subcategoria_fatura_id uuid references public.subcategorias(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cartao_lancamentos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  cartao_id uuid not null references public.cartoes(id) on delete cascade,
  data_compra date not null,
  descricao text not null,
  valor numeric(14,2) not null, -- gasto positivo; estorno/credito negativo
  categoria_id uuid references public.categorias(id) on delete set null,
  subcategoria_id uuid references public.subcategorias(id) on delete set null,
  parcela_atual int,
  total_parcelas int,
  observacoes text,
  created_at timestamptz not null default now()
);
create index cartao_lancamentos_cartao_idx on public.cartao_lancamentos (cartao_id, data_compra);

alter table public.movimentacao_financeira add column cartao_id uuid references public.cartoes(id) on delete set null;
alter table public.movimentacao_financeira add column fatura_ciclo date;
create index movimentacao_cartao_idx on public.movimentacao_financeira (cartao_id, fatura_ciclo);

alter table public.cartoes enable row level security;
alter table public.cartao_lancamentos enable row level security;
create policy "Acesso por empresa" on public.cartoes for all to authenticated
  using ((select p.role from public.profiles p where p.id = auth.uid()) = 'superadmin' or company_id = (select p.company_id from public.profiles p where p.id = auth.uid()))
  with check ((select p.role from public.profiles p where p.id = auth.uid()) = 'superadmin' or company_id = (select p.company_id from public.profiles p where p.id = auth.uid()));
create policy "Acesso por empresa" on public.cartao_lancamentos for all to authenticated
  using ((select p.role from public.profiles p where p.id = auth.uid()) = 'superadmin' or company_id = (select p.company_id from public.profiles p where p.id = auth.uid()))
  with check ((select p.role from public.profiles p where p.id = auth.uid()) = 'superadmin' or company_id = (select p.company_id from public.profiles p where p.id = auth.uid()));

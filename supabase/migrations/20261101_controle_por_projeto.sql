-- Controle financeiro por projeto: o projeto passa a poder ser informado em todo lançamento
-- (título, baixa, extrato classificado e regra de classificação), além de categoria e subcategoria.
-- "Não se aplica" = projeto_id nulo.

alter table public.projetos add column if not exists codigo text;

alter table public.extrato_bancario  add column if not exists projeto_id uuid references public.projetos(id) on delete set null;
alter table public.extrato_regras    add column if not exists projeto_id uuid references public.projetos(id) on delete set null;
alter table public.movimentacao_baixas add column if not exists projeto_id uuid references public.projetos(id) on delete set null;

create index if not exists idx_extrato_bancario_projeto on public.extrato_bancario(projeto_id) where projeto_id is not null;
create index if not exists idx_movimentacao_baixas_projeto on public.movimentacao_baixas(projeto_id) where projeto_id is not null;
create index if not exists idx_movimentacao_financeira_projeto on public.movimentacao_financeira(projeto_id) where projeto_id is not null;

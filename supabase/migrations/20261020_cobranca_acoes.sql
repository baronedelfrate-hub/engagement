-- Cobrança sobre a Movimentação Financeira: histórico de ações de cobrança por título a receber.
-- A fase da régua continua automática (pelo vencimento); o que o time registra (contato, promessa de pagamento,
-- negociação, suspensão) fica aqui, uma linha por ação.

create table if not exists cobranca_acoes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references empresas(id) on delete cascade,
  movimentacao_id uuid not null references movimentacao_financeira(id) on delete cascade,
  tipo text not null check (tipo in ('contato', 'promessa', 'negociacao', 'observacao', 'suspensao', 'retomada')),
  canal text check (canal in ('telefone', 'whatsapp', 'email', 'presencial', 'outro')),
  descricao text,
  data_promessa date,
  valor_prometido numeric,
  usuario_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint cobranca_acoes_promessa_ck check (tipo <> 'promessa' or data_promessa is not null)
);

create index if not exists idx_cobranca_acoes_titulo on cobranca_acoes (company_id, movimentacao_id, created_at desc);

alter table cobranca_acoes enable row level security;

create policy "Acesso por empresa" on cobranca_acoes for all
  using (
    (select role from profiles where id = auth.uid()) = 'superadmin'
    or company_id = (select company_id from profiles where id = auth.uid())
  )
  with check (
    (select role from profiles where id = auth.uid()) = 'superadmin'
    or company_id = (select company_id from profiles where id = auth.uid())
  );

notify pgrst, 'reload schema';

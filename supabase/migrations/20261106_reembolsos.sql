-- Relatório de reembolso: o solicitante (ex.: marketing) passa as despesas de forma consolidada, com comprovantes,
-- para aprovação e pagamento. Os comprovantes ficam na pasta privada movimentacao-docs (<empresa>/reembolsos/<reembolso>/...).
create table if not exists public.reembolsos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  numero serial,
  beneficiario text not null,
  cpf_cnpj text,
  tipo_chave_pix text,
  chave_pix text,
  referencia text,
  aprovador text,
  observacoes text,
  status text not null default 'rascunho' check (status in ('rascunho','enviado','aprovado','pago','recusado')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.reembolso_itens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  reembolso_id uuid not null references public.reembolsos(id) on delete cascade,
  data date,
  descricao text not null,
  categoria text,
  valor numeric(14,2) not null default 0,
  comprovante_path text,
  comprovante_nome text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists reembolso_itens_reembolso on public.reembolso_itens (reembolso_id, ordem);

alter table public.reembolsos enable row level security;
alter table public.reembolso_itens enable row level security;
create policy "Acesso por empresa" on public.reembolsos for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'superadmin' or company_id = (select company_id from public.profiles where id = auth.uid()))
  with check ((select role from public.profiles where id = auth.uid()) = 'superadmin' or company_id = (select company_id from public.profiles where id = auth.uid()));
create policy "Acesso por empresa" on public.reembolso_itens for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'superadmin' or company_id = (select company_id from public.profiles where id = auth.uid()))
  with check ((select role from public.profiles where id = auth.uid()) = 'superadmin' or company_id = (select company_id from public.profiles where id = auth.uid()));

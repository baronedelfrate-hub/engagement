-- Proposta aceita -> pedido de venda (que depois alimenta a emissao da nota).
-- Liga o catalogo do CRM ao cadastro fiscal de servicos, a proposta ao pedido e o pedido de volta a proposta.

alter table public.crm_catalogo add column if not exists servico_id uuid references public.servicos(id) on delete set null;
alter table public.crm_propostas add column if not exists pedido_venda_id uuid references public.pedidos_venda(id) on delete set null;
alter table public.pedidos_venda add column if not exists proposta_crm_id uuid references public.crm_propostas(id) on delete set null;

-- uma proposta gera no maximo um pedido
create unique index if not exists pedidos_venda_proposta_crm_uq on public.pedidos_venda (proposta_crm_id) where proposta_crm_id is not null;

-- Centro de custo nos lancamentos do cartao (ex.: gastos da filha, da mae, da propria pessoa).
alter table public.cartao_lancamentos add column centro_custo_id uuid references public.centros_custo(id) on delete set null;

-- Provisões na Movimentação Financeira: o que se espera pagar/receber antes de existir o lançamento real.
-- Uma provisão é uma linha de movimentacao_financeira com provisao = true. Ela não recebe baixa; quando o lançamento real
-- existe, a provisão é "substituída" (status 'substituido') e o lançamento real aponta para ela em provisao_id.

alter table movimentacao_financeira
  add column if not exists provisao boolean not null default false,
  add column if not exists provisao_id uuid references movimentacao_financeira(id) on delete set null;

-- novo status: substituido (só para provisões)
alter table movimentacao_financeira drop constraint if exists movimentacao_financeira_status_check;
alter table movimentacao_financeira add constraint movimentacao_financeira_status_check
  check (status = any (array['pendente','pago_parcial','pago','vencido','cancelado','substituido']));

-- provisão só pode estar pendente, substituída ou cancelada; "substituido" só existe para provisão
alter table movimentacao_financeira add constraint movimentacao_financeira_provisao_status_check
  check ((not provisao or status in ('pendente','substituido','cancelado')) and (status <> 'substituido' or provisao));

create index if not exists idx_movfin_provisao on movimentacao_financeira (company_id, provisao, data_vencimento);
create index if not exists idx_movfin_provisao_id on movimentacao_financeira (provisao_id) where provisao_id is not null;

-- provisão não recebe baixa (a baixa é do lançamento real que a substitui)
create or replace function public.baixa_nao_em_provisao()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from movimentacao_financeira m where m.id = new.movimentacao_id and m.provisao) then
    raise exception 'Provisão não recebe baixa. Substitua a provisão por um lançamento real e dê a baixa nele.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists baixa_nao_em_provisao on movimentacao_baixas;
create trigger baixa_nao_em_provisao
  before insert on movimentacao_baixas
  for each row execute function public.baixa_nao_em_provisao();

revoke execute on function public.baixa_nao_em_provisao() from public, anon, authenticated;

-- Painel da carteira: provisão não é título em aberto nem vencido
create or replace function public.painel_carteira()
returns table (
  empresa_id uuid, razao_social text, nome_fantasia text,
  extrato_total bigint, extrato_ate date,
  a_classificar_qtd bigint, a_classificar_valor numeric, nao_conciliados bigint,
  titulos_abertos_qtd bigint, titulos_abertos_valor numeric,
  titulos_vencidos_qtd bigint, titulos_vencidos_valor numeric,
  mes_ref date, receita_mes numeric, resultado_mes numeric
)
language sql stable security invoker set search_path = public, pg_temp
as $$
  select e.id, e.razao_social, e.nome_fantasia,
    x.total, x.ate, x.pend_qtd, x.pend_val, x.nao_conc,
    t.abertos_qtd, t.abertos_val, t.venc_qtd, t.venc_val,
    m.mes_ref, m.receita, m.resultado
  from empresas e
  left join lateral (
    select count(*) as total, max(eb.data_transacao) as ate,
      count(*) filter (where eb.categoria_id is null) as pend_qtd,
      coalesce(sum(eb.valor) filter (where eb.categoria_id is null), 0) as pend_val,
      count(*) filter (where eb.status_conciliacao is distinct from 'Conciliado') as nao_conc
    from extrato_bancario eb where eb.company_id = e.id
  ) x on true
  left join lateral (
    select count(*) filter (where s.saldo > 0.005) as abertos_qtd,
      coalesce(sum(s.saldo) filter (where s.saldo > 0.005), 0) as abertos_val,
      count(*) filter (where s.saldo > 0.005 and s.data_vencimento < current_date) as venc_qtd,
      coalesce(sum(s.saldo) filter (where s.saldo > 0.005 and s.data_vencimento < current_date), 0) as venc_val
    from (
      select mf.data_vencimento,
        mf.valor_total - coalesce((select sum(b.valor_baixa - b.valor_juros + b.valor_desconto) from movimentacao_baixas b where b.movimentacao_id = mf.id), 0) as saldo
      from movimentacao_financeira mf
      where mf.company_id = e.id and mf.provisao = false and mf.status in ('pendente', 'pago_parcial', 'vencido')
    ) s
  ) t on true
  left join lateral (
    select date_trunc('month', x.ate)::date as mes_ref,
      coalesce(sum(eb.valor) filter (where c.grupo_dre = 'receita_bruta'), 0) as receita,
      coalesce(sum(eb.valor) filter (where c.grupo_dre in ('receita_bruta','deducoes','custo_mao_obra','custo_ferramentas','custo_midia','desp_administrativas','desp_comerciais','desp_estrutura','desp_gerais','receita_financeira','desp_financeira')), 0) as resultado
    from extrato_bancario eb left join categorias c on c.id = eb.categoria_id
    where x.ate is not null and eb.company_id = e.id
      and eb.data_transacao >= date_trunc('month', x.ate)::date
      and eb.data_transacao < (date_trunc('month', x.ate) + interval '1 month')::date
  ) m on true
  order by e.razao_social;
$$;

notify pgrst, 'reload schema';

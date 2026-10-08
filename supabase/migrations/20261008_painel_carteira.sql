-- Painel da carteira (BPO): uma linha por empresa com pendências e resultado do último mês com extrato.
-- SECURITY INVOKER: respeita o isolamento por empresa (superadmin vê todas; admin vê só a sua).
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
      where mf.company_id = e.id and mf.status in ('pendente', 'pago_parcial', 'vencido')
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

revoke execute on function public.painel_carteira() from public, anon;
grant execute on function public.painel_carteira() to authenticated;

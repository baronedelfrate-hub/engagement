-- Visao consolidada da socia: o que as empresas pagaram a ela x o que entrou/saiu no PF dela, por mes.
-- Cada cadastro continua isolado; esta funcao devolve so totais, e so para a equipe Engagement ou para quem tem acesso ao PF.
create or replace function public._visao_socia_dados(p_pessoa uuid, p_ano int)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_nome text; v_vinc jsonb; v_emp jsonb; v_pf jsonb;
begin
  select razao_social into v_nome from public.empresas where id = p_pessoa and tipo_pessoa = 'PF';
  if v_nome is null then raise exception 'O cadastro informado não é uma pessoa física'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'nome', coalesce(nullif(e.nome_fantasia, ''), e.razao_social), 'participacao', es.participacao) order by e.razao_social), '[]'::jsonb)
    into v_vinc from public.empresa_socios es join public.empresas e on e.id = es.empresa_id where es.pessoa_id = p_pessoa;

  -- empresas: pro-labore, distribuicao (9.1), retiradas (9.2) e aportes (9.3)
  select coalesce(jsonb_agg(jsonb_build_object('empresa_id', t.company_id, 'mes', t.mes, 'tipo', t.tipo, 'total', t.total)), '[]'::jsonb) into v_emp from (
    select x.company_id, extract(month from x.data_transacao)::int as mes,
      case when s.codigo like '9.1%' then 'distribuicao' when s.codigo like '9.2%' then 'retirada' when s.codigo like '9.3%' then 'aporte' else 'pro_labore' end as tipo,
      sum(x.valor) as total
    from public.extrato_bancario x
    join public.subcategorias s on s.id = x.subcategoria_id
    where x.company_id in (select empresa_id from public.empresa_socios where pessoa_id = p_pessoa)
      and x.data_transacao >= make_date(p_ano, 1, 1) and x.data_transacao < make_date(p_ano + 1, 1, 1)
      and (s.codigo like '9.1%' or s.codigo like '9.2%' or s.codigo like '9.3%' or s.nome ilike '%labore%')
    group by 1, 2, 3) t;

  -- pessoa fisica: rendimentos, gastos, aportes as empresas
  select coalesce(jsonb_agg(jsonb_build_object('mes', t.mes, 'tipo', t.tipo, 'total', t.total)), '[]'::jsonb) into v_pf from (
    select extract(month from x.data_transacao)::int as mes,
      case when c.grupo_dre = 'pf_entrada' then (case s.codigo when '1.1.01' then 'pro_labore' when '1.1.02' then 'distribuicao' else 'outras' end)
           when c.grupo_dre = 'pf_gasto' then 'gastos'
           when s.codigo = '5.5' then 'aporte_empresas'
           else 'fora_outros' end as tipo,
      sum(x.valor) as total
    from public.extrato_bancario x
    join public.categorias c on c.id = x.categoria_id
    left join public.subcategorias s on s.id = x.subcategoria_id
    where x.company_id = p_pessoa
      and x.data_transacao >= make_date(p_ano, 1, 1) and x.data_transacao < make_date(p_ano + 1, 1, 1)
    group by 1, 2) t;

  return jsonb_build_object('ano', p_ano, 'pessoa', jsonb_build_object('id', p_pessoa, 'nome', v_nome), 'empresas', v_vinc, 'mov_empresas', v_emp, 'mov_pf', v_pf);
end;
$$;

create or replace function public.visao_consolidada_socia(p_pessoa uuid, p_ano int)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not (coalesce((select role from public.profiles where id = auth.uid()), '') = 'superadmin'
          or exists (select 1 from public.usuario_empresas where user_id = auth.uid() and empresa_id = p_pessoa)) then
    raise exception 'Sem acesso a este cadastro';
  end if;
  return public._visao_socia_dados(p_pessoa, p_ano);
end;
$$;

revoke all on function public._visao_socia_dados(uuid, int) from public, anon, authenticated;
revoke all on function public.visao_consolidada_socia(uuid, int) from public, anon;
grant execute on function public.visao_consolidada_socia(uuid, int) to authenticated;

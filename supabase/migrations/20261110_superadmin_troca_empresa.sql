-- Superadmin vê todas as empresas no seletor do topo e pode trocar para qualquer uma (os demais continuam só nas liberadas em usuario_empresas).
create or replace function public.minhas_empresas()
returns table (id uuid, nome text, tipo_pessoa text, atual boolean)
language sql stable security definer set search_path = public as $$
  select e.id, coalesce(nullif(e.nome_fantasia, ''), e.razao_social), e.tipo_pessoa,
         e.id = (select p.company_id from public.profiles p where p.id = auth.uid())
  from public.empresas e
  where coalesce(e.ativo, true)
    and (coalesce((select p.role from public.profiles p where p.id = auth.uid()), '') = 'superadmin'
         or e.id in (select ue.empresa_id from public.usuario_empresas ue where ue.user_id = auth.uid()))
  order by e.tipo_pessoa desc, 2;
$$;
create or replace function public.trocar_empresa(p_empresa uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select role from public.profiles where id = auth.uid()), '') <> 'superadmin'
     and not exists (select 1 from public.usuario_empresas where user_id = auth.uid() and empresa_id = p_empresa) then
    raise exception 'Sem acesso a este cadastro';
  end if;
  update public.profiles set company_id = p_empresa where id = auth.uid();
end;
$$;

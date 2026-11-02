-- Um login pode ter acesso a varios cadastros (ex.: socia = pessoa fisica + empresas dela) e trocar entre eles.
-- A troca atualiza profiles.company_id, que e o que todas as regras de acesso (RLS) ja usam: cada cadastro continua isolado.
create table if not exists public.usuario_empresas (
  user_id uuid not null references public.profiles(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, empresa_id)
);
alter table public.usuario_empresas enable row level security;
drop policy if exists usuario_empresas_superadmin on public.usuario_empresas;
drop policy if exists usuario_empresas_proprio on public.usuario_empresas;
create policy usuario_empresas_superadmin on public.usuario_empresas for all to authenticated
  using ((select p.role from public.profiles p where p.id = auth.uid()) = 'superadmin')
  with check ((select p.role from public.profiles p where p.id = auth.uid()) = 'superadmin');
create policy usuario_empresas_proprio on public.usuario_empresas for select to authenticated using (user_id = auth.uid());

-- cadastros que o usuario logado pode escolher
create or replace function public.minhas_empresas()
returns table (id uuid, nome text, tipo_pessoa text, atual boolean)
language sql stable security definer set search_path = public as $$
  select e.id, coalesce(nullif(e.nome_fantasia, ''), e.razao_social), e.tipo_pessoa,
         e.id = (select p.company_id from public.profiles p where p.id = auth.uid())
  from public.usuario_empresas ue
  join public.empresas e on e.id = ue.empresa_id
  where ue.user_id = auth.uid()
  order by e.tipo_pessoa desc, 2;
$$;

-- troca o cadastro ativo do usuario logado (so entre os que ele tem acesso)
create or replace function public.trocar_empresa(p_empresa uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.usuario_empresas where user_id = auth.uid() and empresa_id = p_empresa) then
    raise exception 'Sem acesso a este cadastro';
  end if;
  update public.profiles set company_id = p_empresa where id = auth.uid();
end;
$$;

-- equipe Engagement (superadmin): da acesso a um cadastro (e, se for pessoa fisica, as empresas vinculadas)
create or replace function public.conceder_acesso_empresa(p_user uuid, p_empresa uuid, p_incluir_vinculadas boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select role from public.profiles where id = auth.uid()), '') <> 'superadmin' then
    raise exception 'Apenas a equipe Engagement pode conceder acesso';
  end if;
  insert into public.usuario_empresas (user_id, empresa_id) values (p_user, p_empresa) on conflict do nothing;
  -- o cadastro de origem do usuario fica sempre disponivel para ele voltar
  insert into public.usuario_empresas (user_id, empresa_id)
    select p_user, p.company_id from public.profiles p where p.id = p_user and p.company_id is not null on conflict do nothing;
  if p_incluir_vinculadas then
    insert into public.usuario_empresas (user_id, empresa_id)
      select p_user, s.empresa_id from public.empresa_socios s where s.pessoa_id = p_empresa on conflict do nothing;
  end if;
end;
$$;

create or replace function public.revogar_acesso_empresa(p_user uuid, p_empresa uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select role from public.profiles where id = auth.uid()), '') <> 'superadmin' then
    raise exception 'Apenas a equipe Engagement pode remover acesso';
  end if;
  delete from public.usuario_empresas where user_id = p_user and empresa_id = p_empresa;
end;
$$;

create or replace function public.listar_acessos_empresa(p_empresa uuid)
returns table (user_id uuid, nome text, role text)
language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce((select role from public.profiles where id = auth.uid()), '') <> 'superadmin' then
    raise exception 'Apenas a equipe Engagement pode ver os acessos';
  end if;
  return query select p.id, p.nome, p.role from public.usuario_empresas ue join public.profiles p on p.id = ue.user_id where ue.empresa_id = p_empresa order by p.nome;
end;
$$;

revoke all on function public.minhas_empresas() from public, anon;
revoke all on function public.trocar_empresa(uuid) from public, anon;
revoke all on function public.conceder_acesso_empresa(uuid, uuid, boolean) from public, anon;
revoke all on function public.revogar_acesso_empresa(uuid, uuid) from public, anon;
revoke all on function public.listar_acessos_empresa(uuid) from public, anon;
grant execute on function public.minhas_empresas() to authenticated;
grant execute on function public.trocar_empresa(uuid) to authenticated;
grant execute on function public.conceder_acesso_empresa(uuid, uuid, boolean) to authenticated;
grant execute on function public.revogar_acesso_empresa(uuid, uuid) to authenticated;
grant execute on function public.listar_acessos_empresa(uuid) to authenticated;

-- Acesso do cliente da Engagement (login somente leitura para acompanhar projeto, entregas, agenda e OS publicadas).
-- A equipe Engagement vincula um usuario ja criado (perfil user/viewer) a um cliente; o vinculo e o unico caminho para
-- preencher profiles.cliente_bpo_id (a coluna nao e editavel pelo proprio usuario).

create or replace function public.eng_usuarios_do_cliente(p_cliente uuid)
returns table (id uuid, email text, nome text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.eng_e_equipe() then raise exception 'Sem permissão'; end if;
  return query
    select p.id, u.email::text, p.nome
    from public.profiles p join auth.users u on u.id = p.id
    where p.cliente_bpo_id = p_cliente
    order by u.email;
end $$;

create or replace function public.eng_vincular_usuario_cliente(p_email text, p_cliente uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid; papel text;
begin
  if not public.eng_e_equipe() then raise exception 'Sem permissão'; end if;
  if not exists (select 1 from public.clientes_bpo where id = p_cliente) then raise exception 'Cliente não encontrado'; end if;
  select u.id into uid from auth.users u where lower(u.email) = lower(trim(p_email));
  if uid is null then raise exception 'Não existe usuário com este e-mail. Crie o usuário primeiro (Administração > Usuários).'; end if;
  select role into papel from public.profiles where id = uid;
  if papel is null then raise exception 'Este usuário ainda não tem perfil'; end if;
  if papel not in ('user', 'viewer') then raise exception 'Só é possível vincular usuários com perfil comum ou somente leitura (este é %).', papel; end if;
  update public.profiles set role = 'viewer', company_id = null, cliente_bpo_id = p_cliente where id = uid;
end $$;

create or replace function public.eng_desvincular_usuario_cliente(p_usuario uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.eng_e_equipe() then raise exception 'Sem permissão'; end if;
  update public.profiles set cliente_bpo_id = null where id = p_usuario and cliente_bpo_id is not null;
end $$;

revoke all on function public.eng_usuarios_do_cliente(uuid) from public, anon;
revoke all on function public.eng_vincular_usuario_cliente(text, uuid) from public, anon;
revoke all on function public.eng_desvincular_usuario_cliente(uuid) from public, anon;
grant execute on function public.eng_usuarios_do_cliente(uuid) to authenticated;
grant execute on function public.eng_vincular_usuario_cliente(text, uuid) to authenticated;
grant execute on function public.eng_desvincular_usuario_cliente(uuid) to authenticated;

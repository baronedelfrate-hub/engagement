-- Quem tem acesso a mais de uma empresa (login do BPO) também move documentos entre elas, não só o superadmin.
create or replace function public.pode_acessar_empresa(p_empresa text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), '') = 'superadmin'
      or exists (select 1 from public.profiles where id = auth.uid() and company_id::text = p_empresa)
      or exists (select 1 from public.usuario_empresas where user_id = auth.uid() and empresa_id::text = p_empresa);
$$;
revoke all on function public.pode_acessar_empresa(text) from public, anon;
grant execute on function public.pode_acessar_empresa(text) to authenticated;

drop policy if exists empdocs_select on storage.objects;
create policy empdocs_select on storage.objects for select to authenticated
  using (bucket_id = 'empresa-docs' and public.pode_acessar_empresa((storage.foldername(name))[1]));
drop policy if exists empdocs_update on storage.objects;
create policy empdocs_update on storage.objects for update to authenticated
  using (bucket_id = 'empresa-docs' and public.pode_acessar_empresa((storage.foldername(name))[1]))
  with check (bucket_id = 'empresa-docs' and public.pode_acessar_empresa((storage.foldername(name))[1]));

-- Troca a empresa do registro do documento (o arquivo já foi movido pelo storage).
create or replace function public.mover_doc_empresa(p_doc uuid, p_destino uuid, p_path text)
returns void language plpgsql security definer set search_path = public as $$
declare v_origem uuid;
begin
  select company_id into v_origem from public.empresa_documentos where id = p_doc;
  if v_origem is null then raise exception 'Documento não encontrado'; end if;
  if not (public.pode_acessar_empresa(v_origem::text) and public.pode_acessar_empresa(p_destino::text)) then
    raise exception 'Sem acesso às duas empresas';
  end if;
  update public.empresa_documentos set company_id = p_destino, storage_path = p_path where id = p_doc;
end $$;
revoke all on function public.mover_doc_empresa(uuid, uuid, text) from public, anon;
grant execute on function public.mover_doc_empresa(uuid, uuid, text) to authenticated;

-- Empresas que o usuário pode abrir (com CNPJ), para a tela de documentos escolher o destino de um arquivo.
create or replace function public.empresas_para_mover()
returns table (id uuid, nome text, cnpj text) language sql stable security definer set search_path = public as $$
  select e.id, coalesce(nullif(e.nome_fantasia, ''), e.razao_social), e.cnpj from public.empresas e
  where public.pode_acessar_empresa(e.id::text) order by 2;
$$;
revoke all on function public.empresas_para_mover() from public, anon;
grant execute on function public.empresas_para_mover() to authenticated;

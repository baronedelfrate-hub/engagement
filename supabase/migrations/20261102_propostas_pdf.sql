-- PDF externo anexado a propostas do CRM: colunas + bucket privado com acesso por empresa (pasta = company_id).
alter table public.crm_propostas add column if not exists pdf_path text;
alter table public.crm_propostas add column if not exists pdf_nome text;

insert into storage.buckets (id, name, public) values ('propostas', 'propostas', false) on conflict (id) do nothing;

drop policy if exists propostas_select on storage.objects;
drop policy if exists propostas_insert on storage.objects;
drop policy if exists propostas_update on storage.objects;
drop policy if exists propostas_delete on storage.objects;

create policy propostas_select on storage.objects for select to authenticated using (
  bucket_id = 'propostas' and (
    (storage.foldername(name))[1] = (select p.company_id::text from public.profiles p where p.id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')));
create policy propostas_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'propostas' and (
    (storage.foldername(name))[1] = (select p.company_id::text from public.profiles p where p.id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')));
create policy propostas_update on storage.objects for update to authenticated using (
  bucket_id = 'propostas' and (
    (storage.foldername(name))[1] = (select p.company_id::text from public.profiles p where p.id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')));
create policy propostas_delete on storage.objects for delete to authenticated using (
  bucket_id = 'propostas' and (
    (storage.foldername(name))[1] = (select p.company_id::text from public.profiles p where p.id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')));

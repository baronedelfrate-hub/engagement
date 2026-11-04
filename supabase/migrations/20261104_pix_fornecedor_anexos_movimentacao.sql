-- Chave Pix no cadastro do fornecedor e pasta privada de anexos da movimentação financeira
-- (documentos: notas, recibos, boletos; e comprovante de pagamento).
alter table public.fornecedores add column if not exists tipo_chave_pix text;
alter table public.fornecedores add column if not exists chave_pix text;

insert into storage.buckets (id, name, public) values ('movimentacao-docs', 'movimentacao-docs', false) on conflict (id) do nothing;

create policy movdocs_select on storage.objects for select to authenticated using (
  bucket_id = 'movimentacao-docs' and (
    (storage.foldername(name))[1] = (select p.company_id::text from public.profiles p where p.id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')));
create policy movdocs_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'movimentacao-docs' and (
    (storage.foldername(name))[1] = (select p.company_id::text from public.profiles p where p.id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')));
create policy movdocs_update on storage.objects for update to authenticated using (
  bucket_id = 'movimentacao-docs' and (
    (storage.foldername(name))[1] = (select p.company_id::text from public.profiles p where p.id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')));
create policy movdocs_delete on storage.objects for delete to authenticated using (
  bucket_id = 'movimentacao-docs' and (
    (storage.foldername(name))[1] = (select p.company_id::text from public.profiles p where p.id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')));

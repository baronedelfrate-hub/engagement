-- Superadmin pode mover documentos da empresa para a pasta de outra empresa (storage.move faz UPDATE em storage.objects).
create policy empdocs_update on storage.objects for update to authenticated
  using (bucket_id = 'empresa-docs' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin'))
  with check (bucket_id = 'empresa-docs' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin'));

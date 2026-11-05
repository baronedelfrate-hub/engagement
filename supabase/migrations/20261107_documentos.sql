-- Documentos pessoais (RG, CPF, CNH...): só o superadmin enxerga, em pasta privada, com registro de cada abertura e envio.
-- Documentos da empresa (contrato social, CNDs...): por empresa, em pasta privada.
create table if not exists public.docs_pessoais (
  id uuid primary key default gen_random_uuid(),
  titular text not null,
  tipo text not null,
  validade date,
  observacoes text,
  storage_path text not null,
  nome_arquivo text not null,
  mime text,
  tamanho integer,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table if not exists public.docs_pessoais_acessos (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid references public.docs_pessoais(id) on delete set null,
  titular text,
  nome_arquivo text,
  acao text not null,
  destino text,
  user_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.docs_pessoais enable row level security;
alter table public.docs_pessoais_acessos enable row level security;
create policy docs_pessoais_superadmin on public.docs_pessoais for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'superadmin')
  with check ((select role from public.profiles where id = auth.uid()) = 'superadmin');
create policy docs_acessos_ler on public.docs_pessoais_acessos for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'superadmin');
create policy docs_acessos_gravar on public.docs_pessoais_acessos for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) = 'superadmin');

insert into storage.buckets (id, name, public) values ('docs-pessoais', 'docs-pessoais', false) on conflict (id) do nothing;
create policy docspessoais_select on storage.objects for select to authenticated using (bucket_id = 'docs-pessoais' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin'));
create policy docspessoais_insert on storage.objects for insert to authenticated with check (bucket_id = 'docs-pessoais' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin'));
create policy docspessoais_delete on storage.objects for delete to authenticated using (bucket_id = 'docs-pessoais' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin'));

create table if not exists public.empresa_documentos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null,
  titulo text,
  validade date,
  observacoes text,
  storage_path text not null,
  nome_arquivo text not null,
  mime text,
  tamanho integer,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists empresa_documentos_empresa on public.empresa_documentos (company_id, tipo);
alter table public.empresa_documentos enable row level security;
create policy "Acesso por empresa" on public.empresa_documentos for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'superadmin' or company_id = (select company_id from public.profiles where id = auth.uid()))
  with check ((select role from public.profiles where id = auth.uid()) = 'superadmin' or company_id = (select company_id from public.profiles where id = auth.uid()));

insert into storage.buckets (id, name, public) values ('empresa-docs', 'empresa-docs', false) on conflict (id) do nothing;
create policy empdocs_select on storage.objects for select to authenticated using (bucket_id = 'empresa-docs' and ((storage.foldername(name))[1] = (select p.company_id::text from public.profiles p where p.id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')));
create policy empdocs_insert on storage.objects for insert to authenticated with check (bucket_id = 'empresa-docs' and ((storage.foldername(name))[1] = (select p.company_id::text from public.profiles p where p.id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')));
create policy empdocs_delete on storage.objects for delete to authenticated using (bucket_id = 'empresa-docs' and ((storage.foldername(name))[1] = (select p.company_id::text from public.profiles p where p.id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')));

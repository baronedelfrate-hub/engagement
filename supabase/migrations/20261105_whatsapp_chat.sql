-- Chat do WhatsApp dentro do ERP: conversas e mensagens por empresa (as linhas são gravadas só pelas funções
-- receber-whatsapp e enviar-whatsapp, com a service role) e pasta privada para as mídias.
create table if not exists public.whatsapp_conversas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  jid text not null,
  nome text,
  eh_grupo boolean not null default false,
  ultima_mensagem text,
  ultima_data timestamptz,
  nao_lidas integer not null default 0,
  created_at timestamptz not null default now(),
  unique (company_id, jid)
);
create index if not exists whatsapp_conversas_ordem on public.whatsapp_conversas (company_id, ultima_data desc);

create table if not exists public.whatsapp_mensagens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  conversa_id uuid not null references public.whatsapp_conversas(id) on delete cascade,
  message_id text not null,
  de_mim boolean not null default false,
  remetente_nome text,
  tipo text not null default 'texto',
  texto text,
  midia_path text,
  midia_nome text,
  midia_mime text,
  status text not null default 'recebida',
  data timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (company_id, message_id)
);
create index if not exists whatsapp_mensagens_conversa on public.whatsapp_mensagens (conversa_id, data);

alter table public.whatsapp_conversas enable row level security;
alter table public.whatsapp_mensagens enable row level security;

drop policy if exists "Acesso por empresa" on public.whatsapp_conversas;
create policy "Acesso por empresa" on public.whatsapp_conversas for select using (
  (select role from public.profiles where id = auth.uid()) = 'superadmin'
  or company_id = (select company_id from public.profiles where id = auth.uid()));
drop policy if exists "Acesso por empresa" on public.whatsapp_mensagens;
create policy "Acesso por empresa" on public.whatsapp_mensagens for select using (
  (select role from public.profiles where id = auth.uid()) = 'superadmin'
  or company_id = (select company_id from public.profiles where id = auth.uid()));

revoke insert, update, delete on public.whatsapp_conversas from anon, authenticated;
revoke insert, update, delete on public.whatsapp_mensagens from anon, authenticated;

-- Marcar a conversa como lida (zera o contador de não lidas) sem liberar update na tabela.
create or replace function public.whatsapp_marcar_lida(p_conversa uuid) returns void
language sql security definer set search_path = public as $$
  update public.whatsapp_conversas c set nao_lidas = 0
  where c.id = p_conversa and (
    c.company_id = (select company_id from public.profiles where id = auth.uid())
    or (select role from public.profiles where id = auth.uid()) = 'superadmin');
$$;
grant execute on function public.whatsapp_marcar_lida(uuid) to authenticated;

-- Atualização em tempo real da tela.
alter publication supabase_realtime add table public.whatsapp_conversas;
alter publication supabase_realtime add table public.whatsapp_mensagens;

-- Mídias (fotos, áudios, documentos): pasta privada, acesso por empresa (pasta = company_id).
insert into storage.buckets (id, name, public) values ('whatsapp-midia', 'whatsapp-midia', false) on conflict (id) do nothing;
create policy whatsmidia_select on storage.objects for select to authenticated using (
  bucket_id = 'whatsapp-midia' and (
    (storage.foldername(name))[1] = (select p.company_id::text from public.profiles p where p.id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')));

-- Número do telefone, nome dado no ERP (apelido) e agenda de contatos por empresa.
alter table public.whatsapp_conversas add column if not exists telefone text;
alter table public.whatsapp_conversas add column if not exists apelido text;
update public.whatsapp_conversas set nome = null where nome ~ '^[0-9]+$';
create table if not exists public.whatsapp_contatos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  jid text not null,
  nome_whatsapp text,
  apelido text,
  telefone text,
  created_at timestamptz not null default now(),
  unique (company_id, jid)
);
alter table public.whatsapp_contatos enable row level security;
create policy "Acesso por empresa" on public.whatsapp_contatos for select using (
  (select role from public.profiles where id = auth.uid()) = 'superadmin'
  or company_id = (select company_id from public.profiles where id = auth.uid()));
revoke insert, update, delete on public.whatsapp_contatos from anon, authenticated;

create or replace function public.whatsapp_definir_nome(p_conversa uuid, p_nome text) returns void
language plpgsql security definer set search_path = public as $$
declare v_company uuid; v_jid text; v_tel text; v_nome text := nullif(trim(p_nome), '');
begin
  select c.company_id, c.jid, c.telefone into v_company, v_jid, v_tel from public.whatsapp_conversas c
   where c.id = p_conversa and (c.company_id = (select company_id from public.profiles where id = auth.uid())
     or (select role from public.profiles where id = auth.uid()) = 'superadmin');
  if v_company is null then return; end if;
  update public.whatsapp_conversas set apelido = v_nome where id = p_conversa;
  if v_jid not like '%@g.us' then
    insert into public.whatsapp_contatos(company_id, jid, apelido, telefone) values (v_company, v_jid, v_nome, v_tel)
    on conflict (company_id, jid) do update set apelido = excluded.apelido;
  end if;
end $$;
grant execute on function public.whatsapp_definir_nome(uuid, text) to authenticated;

create or replace function public.whatsapp_renomear_contato(p_contato uuid, p_nome text, p_telefone text) returns void
language sql security definer set search_path = public as $$
  update public.whatsapp_contatos t set apelido = nullif(trim(p_nome), ''), telefone = coalesce(nullif(regexp_replace(coalesce(p_telefone,''), '\D', '', 'g'), ''), t.telefone)
  where t.id = p_contato and (t.company_id = (select company_id from public.profiles where id = auth.uid())
     or (select role from public.profiles where id = auth.uid()) = 'superadmin');
$$;
grant execute on function public.whatsapp_renomear_contato(uuid, text, text) to authenticated;

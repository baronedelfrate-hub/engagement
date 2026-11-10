-- Várias linhas (números) de WhatsApp por empresa. A "Principal" é a que já existia (usuario_id nulo).
-- usuario_id: linha pessoal de um usuário (ele vê só ela). reservada: número de um colaborador que não usa o ERP; só administradores e superadmin veem.
alter table public.whatsapp_instancias add column if not exists rotulo text not null default 'Principal';
alter table public.whatsapp_instancias add column if not exists usuario_id uuid references public.profiles(id) on delete set null;
alter table public.whatsapp_instancias add column if not exists telefone text;
alter table public.whatsapp_instancias add column if not exists reservada boolean not null default false;
alter table public.whatsapp_conversas add column if not exists instancia_id uuid references public.whatsapp_instancias(id) on delete cascade;
alter table public.whatsapp_mensagens add column if not exists instancia_id uuid references public.whatsapp_instancias(id) on delete cascade;
update public.whatsapp_conversas c set instancia_id = (select i.id from public.whatsapp_instancias i where i.company_id = c.company_id and i.usuario_id is null order by i.created_at limit 1) where instancia_id is null;
update public.whatsapp_mensagens m set instancia_id = c.instancia_id from public.whatsapp_conversas c where c.id = m.conversa_id and m.instancia_id is null;
create or replace function public.whatsapp_preencher_linha() returns trigger language plpgsql as $$
begin
  if new.instancia_id is null then
    select i.id into new.instancia_id from public.whatsapp_instancias i where i.company_id = new.company_id and i.usuario_id is null and not i.reservada order by i.created_at limit 1;
  end if;
  return new;
end $$;
drop trigger if exists whatsapp_conversas_linha on public.whatsapp_conversas;
create trigger whatsapp_conversas_linha before insert on public.whatsapp_conversas for each row execute function public.whatsapp_preencher_linha();
drop trigger if exists whatsapp_mensagens_linha on public.whatsapp_mensagens;
create trigger whatsapp_mensagens_linha before insert on public.whatsapp_mensagens for each row execute function public.whatsapp_preencher_linha();
create index if not exists whatsapp_conversas_linha on public.whatsapp_conversas (instancia_id, ultima_data desc);
create index if not exists whatsapp_mensagens_linha on public.whatsapp_mensagens (instancia_id);
alter table public.whatsapp_conversas add constraint whatsapp_conversas_instancia_jid_key unique (instancia_id, jid);
alter table public.whatsapp_mensagens add constraint whatsapp_mensagens_instancia_msg_key unique (instancia_id, message_id);
alter table public.whatsapp_instancias add constraint whatsapp_instancias_company_rotulo_key unique (company_id, rotulo);
alter table public.whatsapp_instancias drop constraint if exists whatsapp_instancias_company_id_key;
alter table public.whatsapp_conversas drop constraint if exists whatsapp_conversas_company_id_jid_key;
alter table public.whatsapp_mensagens drop constraint if exists whatsapp_mensagens_company_id_message_id_key;
alter table public.whatsapp_conversas alter column instancia_id set not null;
alter table public.whatsapp_mensagens alter column instancia_id set not null;

create or replace function public.whatsapp_pode_ver_linha(p_instancia uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.whatsapp_instancias w
    join public.profiles p on p.id = auth.uid()
    where w.id = p_instancia and (
      p.role = 'superadmin'
      or (w.company_id = p.company_id and (
        w.usuario_id = auth.uid()
        or (w.reservada and w.usuario_id is null and p.role = 'admin')
        or (w.usuario_id is null and not w.reservada and not exists (select 1 from public.whatsapp_instancias o where o.company_id = w.company_id and o.usuario_id = auth.uid()))
      ))
    )
  );
$$;
grant execute on function public.whatsapp_pode_ver_linha(uuid) to authenticated;
drop policy if exists "Acesso por empresa" on public.whatsapp_instancias;
create policy "Acesso por linha" on public.whatsapp_instancias for select using (public.whatsapp_pode_ver_linha(id));
drop policy if exists "Acesso por empresa" on public.whatsapp_conversas;
create policy "Acesso por linha" on public.whatsapp_conversas for select using (public.whatsapp_pode_ver_linha(instancia_id));
drop policy if exists "Acesso por empresa" on public.whatsapp_mensagens;
create policy "Acesso por linha" on public.whatsapp_mensagens for select using (public.whatsapp_pode_ver_linha(instancia_id));
create or replace function public.whatsapp_marcar_lida(p_conversa uuid) returns void
language sql security definer set search_path = public as $$
  update public.whatsapp_conversas c set nao_lidas = 0 where c.id = p_conversa and public.whatsapp_pode_ver_linha(c.instancia_id);
$$;
create or replace function public.whatsapp_definir_nome(p_conversa uuid, p_nome text) returns void
language plpgsql security definer set search_path = public as $$
declare v_company uuid; v_jid text; v_tel text; v_nome text := nullif(trim(p_nome), '');
begin
  select c.company_id, c.jid, c.telefone into v_company, v_jid, v_tel from public.whatsapp_conversas c
   where c.id = p_conversa and public.whatsapp_pode_ver_linha(c.instancia_id);
  if v_company is null then return; end if;
  update public.whatsapp_conversas set apelido = v_nome where id = p_conversa;
  if v_jid not like '%@g.us' then
    insert into public.whatsapp_contatos(company_id, jid, apelido, telefone) values (v_company, v_jid, v_nome, v_tel)
    on conflict (company_id, jid) do update set apelido = excluded.apelido;
  end if;
end $$;

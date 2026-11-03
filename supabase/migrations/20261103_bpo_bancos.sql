-- Bancos do modulo BPO por cliente (a tabela nao era criada para nenhum cliente), com limite da conta.
-- Aplicado em tres partes: funcao, protecao + gatilho, e criacao para os clientes que ja existiam.
create function public.create_bpo_client_bancos(p_cliente_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_tabela text := 'clientes_bpo_' || replace(p_cliente_id::text, '-', '_') || '_bancos';
begin
  execute format('
    create table if not exists %I (
      id uuid primary key default gen_random_uuid(),
      cliente_bpo_id uuid not null references public.clientes_bpo(id) on delete cascade,
      codigo text,
      nome text not null,
      agencia text,
      conta text,
      tipo_conta text,
      saldo numeric(15,2) default 0,
      limite numeric(15,2) not null default 0 check (limite >= 0),
      data_saldo_inicial date,
      ativo boolean default true,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )', v_tabela);
  execute format('alter table %I enable row level security', v_tabela);
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = v_tabela and policyname = 'Acesso equipe e cliente') then
    -- equipe Engagement (superadmin ou empresa marcada como equipe) e os usuarios do proprio cliente BPO
    execute format($p$create policy "Acesso equipe e cliente" on %I for all to authenticated
      using (
        (select p.role from public.profiles p where p.id = auth.uid()) = 'superadmin'
        or exists (select 1 from public.profiles p join public.empresas e on e.id = p.company_id where p.id = auth.uid() and e.equipe_engagement)
        or cliente_bpo_id = (select p.cliente_bpo_id from public.profiles p where p.id = auth.uid()))
      with check (
        (select p.role from public.profiles p where p.id = auth.uid()) = 'superadmin'
        or exists (select 1 from public.profiles p join public.empresas e on e.id = p.company_id where p.id = auth.uid() and e.equipe_engagement)
        or cliente_bpo_id = (select p.cliente_bpo_id from public.profiles p where p.id = auth.uid()))$p$, v_tabela);
  end if;
end;
$$;
revoke all on function public.create_bpo_client_bancos(uuid) from public, anon, authenticated;

-- clientes BPO novos ja nascem com a tabela de bancos
create function public.trigger_create_bpo_client_bancos()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.create_bpo_client_bancos(NEW.id);
  return NEW;
end;
$$;
revoke all on function public.trigger_create_bpo_client_bancos() from public, anon, authenticated;
create trigger trg_create_bpo_client_bancos after insert on public.clientes_bpo
for each row execute function public.trigger_create_bpo_client_bancos();

-- clientes BPO que ja existem
select public.create_bpo_client_bancos(id) from public.clientes_bpo;

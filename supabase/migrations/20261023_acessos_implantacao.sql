-- 1) Iniciar o onboarding nao pode criar um segundo diagnostico em branco (escondia o diagnostico ja preenchido).
create or replace function public.bpo_iniciar_onboarding(p_cliente uuid, p_inicio date default current_date) returns uuid
language plpgsql security invoker set search_path = public as $$
declare pid uuid;
begin
  if not public.eng_e_equipe() then raise exception 'Sem permissão'; end if;
  if exists (select 1 from public.eng_projetos where cliente_id = p_cliente and tipo = 'b1') then
    raise exception 'Este cliente já tem o onboarding B1 iniciado';
  end if;
  insert into public.eng_projetos (cliente_id, tipo, nome, data_inicio, data_fim_prevista, horas_previstas, status)
  values (p_cliente, 'b1', 'B1 — Onboarding Financeiro Essencial', p_inicio, public.eng_dia_util(p_inicio, 7), 64, 'em_andamento')
  returning id into pid;

  insert into public.eng_tarefas (cliente_id, projeto_id, origem, fase, dia_plano, atividade, carga_horas, data_prevista, funcao_responsavel)
  select p_cliente, pid, 'b1', f, d, a, h, public.eng_dia_util(p_inicio, d - 1), 'consultor'
  from (values
    ('Bloco 01 — Diagnóstico & Processo', 1, 'Aplicar questionário de diagnóstico com o cliente', 4),
    ('Bloco 01 — Diagnóstico & Processo', 1, 'Levantar volume da operação (lançamentos, notas, contas)', 4),
    ('Bloco 01 — Diagnóstico & Processo', 2, 'Analisar a operação e classificar maturidade (índice 0–100)', 8),
    ('Bloco 01 — Diagnóstico & Processo', 3, 'Elaborar proposta de melhoria do processo', 4),
    ('Bloco 01 — Diagnóstico & Processo', 3, 'Apresentar e alinhar o processo proposto com o cliente', 4),
    ('Bloco 01 — Diagnóstico & Processo', 4, 'Aprovar o desenho e gerar o Procedimento de Finanças', 8),
    ('Bloco 02 — Implantação Técnica', 5, 'Receber e validar acessos (bancos, sistema, fiscal, contábil)', 4),
    ('Bloco 02 — Implantação Técnica', 5, 'Conferir contas bancárias e saldos iniciais', 4),
    ('Bloco 02 — Implantação Técnica', 6, 'Parametrizar sistema: plano de contas, centros de custo, categorias', 8),
    ('Bloco 02 — Implantação Técnica', 7, 'Padronizar tipos e meios de recebimento de documentos a pagar', 4),
    ('Bloco 02 — Implantação Técnica', 7, 'Padronizar recebimento de documentos a faturar', 4),
    ('Bloco 02 — Implantação Técnica', 8, 'Definir marco de go-live e primeiro fechamento sob o BPO', 8)
  ) t(f, d, a, h);

  insert into public.bpo_implantacao_itens (cliente_id, secao, ordem, item)
  select p_cliente, s, o, i
  from (values
    ('1. Bancos & Financeiro', 1, 'Internet Banking — perfil operador (movimentação)'),
    ('1. Bancos & Financeiro', 2, 'Internet Banking — perfil consulta'),
    ('1. Bancos & Financeiro', 3, 'Gateway de pagamento: PIX, link de pagamento, cartão'),
    ('1. Bancos & Financeiro', 4, 'Plataforma da maquininha / adquirente (extrato de vendas e taxas)'),
    ('1. Bancos & Financeiro', 5, 'Plataforma de cobrança / emissão de boletos'),
    ('1. Bancos & Financeiro', 6, 'Acesso às aplicações financeiras / investimentos'),
    ('2. Sistema / ERP', 1, 'Acesso ao ERP / sistema financeiro com perfil adequado'),
    ('2. Sistema / ERP', 2, 'Módulos: contas a pagar, contas a receber e relatórios'),
    ('2. Sistema / ERP', 3, 'Sistema de agenda / prontuário / gestão de projetos (origem do faturamento)'),
    ('2. Sistema / ERP', 4, 'Integração sistema ↔ banco (quando houver)'),
    ('3. Faturamento & Fiscal', 1, 'Emissor de NFS-e (nota fiscal de serviço)'),
    ('3. Faturamento & Fiscal', 2, 'Acesso ao portal da Prefeitura (NFS-e)'),
    ('3. Faturamento & Fiscal', 3, 'Certificado digital (A1 ou A3)'),
    ('3. Faturamento & Fiscal', 4, 'Portais de convênios / operadoras (quando houver)'),
    ('3. Faturamento & Fiscal', 5, 'Plataforma de repasse / glosa (quando houver)'),
    ('4. Contábil / Folha / Impostos', 1, 'Contato direto com o escritório contábil estabelecido'),
    ('4. Contábil / Folha / Impostos', 2, 'Acesso ao portal contábil (se houver)'),
    ('4. Contábil / Folha / Impostos', 3, 'Recebimento das guias de impostos definido'),
    ('4. Contábil / Folha / Impostos', 4, 'Recebimento da folha / pró-labore definido'),
    ('5. Infraestrutura & Documentos', 1, 'E-mail financeiro'),
    ('5. Infraestrutura & Documentos', 2, 'Caixas de entrada de contas a pagar e a receber'),
    ('5. Infraestrutura & Documentos', 3, 'Pastas compartilhadas (padrão de arquivamento Engagement)'),
    ('5. Infraestrutura & Documentos', 4, 'WhatsApp corporativo (se aplicável)'),
    ('6. Parametrização do Sistema', 1, 'Plano de contas definido e cadastrado'),
    ('6. Parametrização do Sistema', 2, 'Centros de custo definidos'),
    ('6. Parametrização do Sistema', 3, 'Categorias cadastradas'),
    ('6. Parametrização do Sistema', 4, 'Subcategorias cadastradas'),
    ('6. Parametrização do Sistema', 5, 'Separação PF × PJ configurada (quando a operação mistura)'),
    ('7. Padronização de Documentos a Pagar', 1, 'Notas de serviço (NFS-e) — meio de recebimento definido'),
    ('7. Padronização de Documentos a Pagar', 2, 'Contas fixas (aluguel, energia, água, internet) — e-mail / portal / débito automático'),
    ('7. Padronização de Documentos a Pagar', 3, 'Folha e pró-labore — escritório contábil / RH'),
    ('7. Padronização de Documentos a Pagar', 4, 'Impostos e guias — escritório contábil / fiscal'),
    ('7. Padronização de Documentos a Pagar', 5, 'Débitos automáticos mapeados (seguros, assinaturas, etc.)'),
    ('7. Padronização de Documentos a Pagar', 6, 'Contratos recorrentes cadastrados'),
    ('8. Marco de Início da Operação (Go-Live)', 1, 'Data do primeiro fechamento sob responsabilidade do BPO definida'),
    ('8. Marco de Início da Operação (Go-Live)', 2, 'Saldos iniciais de bancos conferidos e registrados'),
    ('8. Marco de Início da Operação (Go-Live)', 3, 'Pendências anteriores (contas em aberto) levantadas e combinadas'),
    ('8. Marco de Início da Operação (Go-Live)', 4, 'Cliente comunicado sobre o que passa a enviar, como e até quando'),
    ('8. Marco de Início da Operação (Go-Live)', 5, 'Prazo-limite de envio de documentos ao financeiro acordado (SLA de mão dupla)')
  ) t(s, o, i);

  insert into public.bpo_configuracao (cliente_id) values (p_cliente) on conflict do nothing;
  -- so cria o diagnostico se o cliente ainda nao tiver um (o diagnostico vem antes do onboarding)
  insert into public.bpo_diagnosticos (cliente_id)
  select p_cliente where not exists (select 1 from public.bpo_diagnosticos where cliente_id = p_cliente);
  update public.clientes_bpo set status_contrato = 'em_implantacao', data_inicio = coalesce(data_inicio, p_inicio) where id = p_cliente;
  return pid;
end $$;

-- limpa o diagnostico vazio que o onboarding antigo criou por cima de um diagnostico preenchido
delete from public.bpo_diagnosticos d
where d.status = 'rascunho' and d.respostas = '{}'::jsonb and d.maturidade = '[]'::jsonb
  and exists (
    select 1 from public.bpo_diagnosticos o
    where o.cliente_id = d.cliente_id and o.id <> d.id and (o.respostas <> '{}'::jsonb or o.maturidade <> '[]'::jsonb)
  );

-- 2) Acessos e informacoes da implantacao (login, link, contato, observacoes) com senha cifrada.
create table if not exists public.bpo_acessos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_bpo(id) on delete cascade,
  item_id uuid references public.bpo_implantacao_itens(id) on delete set null,
  nome text not null,
  url text,
  usuario text,
  contato text,
  observacao text,
  senha_cifrada bytea,
  tem_senha boolean not null default false,
  senha_alterada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bpo_acessos_cliente_idx on public.bpo_acessos (cliente_id, item_id);

create table if not exists public.bpo_acessos_log (
  id uuid primary key default gen_random_uuid(),
  acesso_id uuid references public.bpo_acessos(id) on delete cascade,
  usuario_id uuid,
  acao text not null check (acao in ('ver_senha', 'alterar_senha')),
  em timestamptz not null default now()
);

alter table public.bpo_acessos enable row level security;
alter table public.bpo_acessos_log enable row level security;
drop policy if exists "equipe tudo" on public.bpo_acessos;
create policy "equipe tudo" on public.bpo_acessos for all using (public.eng_e_equipe()) with check (public.eng_e_equipe());
drop policy if exists "equipe le log" on public.bpo_acessos_log;
create policy "equipe le log" on public.bpo_acessos_log for select using (public.eng_e_equipe());

-- a senha cifrada nunca precisa chegar ao navegador
revoke select on public.bpo_acessos from authenticated, anon;
grant select (id, cliente_id, item_id, nome, url, usuario, contato, observacao, tem_senha, senha_alterada_em, created_at, updated_at)
  on public.bpo_acessos to authenticated;

-- chave de cifragem guardada no cofre do Supabase (nao fica em nenhuma tabela do app)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'bpo_acessos_chave') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'bpo_acessos_chave', 'Chave de cifragem das senhas de acesso dos clientes BPO');
  end if;
end $$;

create or replace function public.bpo_definir_senha_acesso(p_id uuid, p_senha text) returns void
language plpgsql security definer set search_path = public, extensions, vault as $$
declare k text;
begin
  if not public.eng_e_equipe() then raise exception 'Sem permissão'; end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'bpo_acessos_chave';
  if k is null then raise exception 'Chave de cifragem não encontrada'; end if;
  update public.bpo_acessos
     set senha_cifrada = case when coalesce(p_senha, '') = '' then null else pgp_sym_encrypt(p_senha, k) end,
         tem_senha = coalesce(p_senha, '') <> '',
         senha_alterada_em = now(),
         updated_at = now()
   where id = p_id;
  if not found then raise exception 'Acesso não encontrado'; end if;
  insert into public.bpo_acessos_log (acesso_id, usuario_id, acao) values (p_id, auth.uid(), 'alterar_senha');
end $$;

create or replace function public.bpo_revelar_senha_acesso(p_id uuid) returns text
language plpgsql security definer set search_path = public, extensions, vault as $$
declare k text; c bytea;
begin
  if not public.eng_e_equipe() then raise exception 'Sem permissão'; end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'bpo_acessos_chave';
  select senha_cifrada into c from public.bpo_acessos where id = p_id;
  if c is null then return null; end if;
  insert into public.bpo_acessos_log (acesso_id, usuario_id, acao) values (p_id, auth.uid(), 'ver_senha');
  return pgp_sym_decrypt(c, k);
end $$;

revoke all on function public.bpo_definir_senha_acesso(uuid, text) from public, anon;
revoke all on function public.bpo_revelar_senha_acesso(uuid) from public, anon;
grant execute on function public.bpo_definir_senha_acesso(uuid, text) to authenticated;
grant execute on function public.bpo_revelar_senha_acesso(uuid) to authenticated;

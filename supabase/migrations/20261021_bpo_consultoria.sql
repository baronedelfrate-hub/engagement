-- BPO E5 e Consultoria F5 sobre o processo real da Engagement.
-- Clientes da Engagement (clientes_bpo) sao globais: a equipe Engagement ve tudo; o login do cliente enxerga so o proprio projeto.

-- ---------- acesso ----------
alter table public.empresas add column if not exists equipe_engagement boolean not null default false;
update public.empresas set equipe_engagement = true where id = 'f8a9b65b-8be1-448d-821b-324c3803be46';

alter table public.profiles add column if not exists cliente_bpo_id uuid;

create or replace function public.eng_e_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    left join public.empresas e on e.id = p.company_id
    where p.id = auth.uid() and (p.role = 'superadmin' or coalesce(e.equipe_engagement, false))
  );
$$;

create or replace function public.eng_cliente_id() returns uuid
language sql stable security definer set search_path = public as $$
  select cliente_bpo_id from public.profiles where id = auth.uid();
$$;

-- ---------- cliente da Engagement ----------
alter table public.clientes_bpo
  add column if not exists servicos text[] not null default '{bpo}',
  add column if not exists plano text,
  add column if not exists status_contrato text not null default 'em_implantacao',
  add column if not exists data_inicio date,
  add column if not exists consultor_id uuid,
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null,
  add column if not exists base_dre text not null default 'extrato',
  add column if not exists segmento text;
alter table public.clientes_bpo drop constraint if exists clientes_bpo_base_dre_chk;
alter table public.clientes_bpo add constraint clientes_bpo_base_dre_chk check (base_dre in ('extrato', 'competencia'));
alter table public.clientes_bpo drop constraint if exists clientes_bpo_status_contrato_chk;
alter table public.clientes_bpo add constraint clientes_bpo_status_contrato_chk check (status_contrato in ('proposta', 'em_implantacao', 'em_operacao', 'pausado', 'encerrado'));

alter table public.profiles drop constraint if exists profiles_cliente_bpo_fk;
alter table public.profiles add constraint profiles_cliente_bpo_fk foreign key (cliente_bpo_id) references public.clientes_bpo(id) on delete set null;

-- ---------- equipe ----------
create table if not exists public.eng_pessoas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  nome text not null,
  funcao text not null check (funcao in ('documental', 'financeiro', 'analista', 'consultor')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- projetos, tarefas, agenda, OS e entregaveis (BPO B1 e Consultoria F5) ----------
create table if not exists public.eng_projetos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_bpo(id) on delete cascade,
  tipo text not null check (tipo in ('b1', 'f5')),
  nome text not null,
  data_inicio date,
  data_fim_prevista date,
  horas_previstas numeric,
  status text not null default 'planejado' check (status in ('planejado', 'em_andamento', 'concluido', 'pausado', 'cancelado')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eng_tarefas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_bpo(id) on delete cascade,
  projeto_id uuid references public.eng_projetos(id) on delete cascade,
  origem text not null check (origem in ('b1', 'f5', 'b2', 'b3', 'b4', 'b5')),
  competencia date,
  fase text,
  dia_plano int,
  atividade text not null,
  carga_horas numeric,
  data_prevista date,
  data_realizada date,
  status text not null default 'pendente' check (status in ('pendente', 'aguardando', 'em_andamento', 'concluido', 'na')),
  funcao_responsavel text,
  responsavel_id uuid references public.eng_pessoas(id) on delete set null,
  it_codigo text,
  observacao text,
  visivel_cliente boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists eng_tarefas_cliente_idx on public.eng_tarefas (cliente_id, origem, competencia);

create table if not exists public.eng_os (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_bpo(id) on delete cascade,
  projeto_id uuid references public.eng_projetos(id) on delete set null,
  numero int not null,
  data date,
  inicio time,
  termino time,
  fase text,
  objetivo text,
  atividades text,
  pessoas text,
  documentos text,
  entregas text,
  pendencias text,
  riscos text,
  proximos_passos text,
  proxima_visita date,
  status text not null default 'agendada' check (status in ('agendada', 'realizada', 'parcial', 'remarcada', 'cancelada')),
  publicada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, numero)
);

create table if not exists public.eng_agenda (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_bpo(id) on delete cascade,
  projeto_id uuid references public.eng_projetos(id) on delete set null,
  tarefa_id uuid references public.eng_tarefas(id) on delete set null,
  os_id uuid references public.eng_os(id) on delete set null,
  data date not null,
  hora_inicio time,
  hora_fim time,
  tipo text not null default 'visita',
  titulo text not null,
  dia_plano int,
  status text not null default 'agendada' check (status in ('agendada', 'realizada', 'parcial', 'remarcada', 'cancelada')),
  observacoes text,
  visivel_cliente boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists eng_agenda_data_idx on public.eng_agenda (data);

create table if not exists public.eng_entregaveis (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_bpo(id) on delete cascade,
  projeto_id uuid references public.eng_projetos(id) on delete cascade,
  ordem int,
  titulo text not null,
  frente text,
  fase text,
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluido', 'na')),
  observacao text,
  arquivo_url text,
  visivel_cliente boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- BPO: diagnostico, proposta, implantacao, ficha, fechamento, registros, ITs ----------
create table if not exists public.bpo_diagnosticos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_bpo(id) on delete cascade,
  data date default current_date,
  consultor_id uuid references public.eng_pessoas(id) on delete set null,
  respostas jsonb not null default '{}'::jsonb,
  maturidade jsonb not null default '[]'::jsonb,
  volume jsonb not null default '{}'::jsonb,
  consolidacao jsonb not null default '{}'::jsonb,
  indice int,
  nivel text,
  faixa_volume text,
  plano_recomendado text,
  plano_final text,
  status text not null default 'rascunho' check (status in ('rascunho', 'concluido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.bpo_calcular_diagnostico() returns trigger
language plpgsql as $$
declare
  soma int := 0; v int; n int := 0; lanc numeric;
begin
  if jsonb_typeof(new.maturidade) = 'array' then
    for v in select (x)::int from jsonb_array_elements_text(new.maturidade) x where x ~ '^[0-3]$' loop
      soma := soma + v; n := n + 1;
    end loop;
  end if;
  if n > 0 then
    new.indice := round(soma * 100.0 / 48);
    new.nivel := case when new.indice <= 33 then 'Caótico' when new.indice <= 57 then 'Básico' when new.indice <= 79 then 'Organizado' else 'Estruturado' end;
  else
    new.indice := null; new.nivel := null;
  end if;
  lanc := nullif(new.volume->>'lancamentos', '')::numeric;
  new.faixa_volume := case when lanc is null then null when lanc <= 50 then 'Pequeno' when lanc <= 120 then 'Médio' when lanc <= 200 then 'Grande' else 'Muito grande' end;
  new.plano_recomendado := case
    when new.nivel is null or lanc is null then null
    when new.nivel = 'Caótico' and lanc <= 120 then 'Estruturação F5 (antes do BPO)'
    when new.nivel = 'Caótico' then 'F5 + Básico'
    when new.nivel = 'Básico' and lanc <= 120 then 'Básico'
    when new.nivel = 'Básico' then 'Essencial'
    when new.nivel = 'Organizado' then 'Profissional'
    else 'Estratégico' end;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists bpo_diagnosticos_calc on public.bpo_diagnosticos;
create trigger bpo_diagnosticos_calc before insert or update on public.bpo_diagnosticos for each row execute function public.bpo_calcular_diagnostico();

create table if not exists public.bpo_propostas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_bpo(id) on delete cascade,
  diagnostico_id uuid references public.bpo_diagnosticos(id) on delete set null,
  situacao_atual text,
  achados jsonb not null default '[]'::jsonb,
  plano text,
  status text not null default 'rascunho' check (status in ('rascunho', 'apresentada', 'aprovada', 'recusada')),
  apresentada_em date,
  aprovada_em date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bpo_implantacao_itens (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_bpo(id) on delete cascade,
  secao text not null,
  ordem int not null,
  item text not null,
  status text not null default 'pendente' check (status in ('pendente', 'ok', 'na')),
  responsavel text,
  prazo date,
  observacao text,
  updated_at timestamptz not null default now()
);
create index if not exists bpo_implantacao_cliente_idx on public.bpo_implantacao_itens (cliente_id, secao, ordem);

create table if not exists public.bpo_configuracao (
  cliente_id uuid primary key references public.clientes_bpo(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.bpo_fechamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_bpo(id) on delete cascade,
  competencia date not null,
  checklist jsonb not null default '{}'::jsonb,
  status text not null default 'aberto' check (status in ('aberto', 'em_conferencia', 'validado', 'enviado_contabilidade')),
  fechado_por uuid references public.eng_pessoas(id) on delete set null,
  fechado_em date,
  validado_por uuid references public.eng_pessoas(id) on delete set null,
  validado_em date,
  enviado_contabilidade_em date,
  canal_envio text,
  retorno_contabilidade_em date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, competencia)
);

create table if not exists public.bpo_registros (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes_bpo(id) on delete cascade,
  data date not null default current_date,
  tipo text not null check (tipo in ('documento_recebido', 'pendencia_cliente', 'divergencia', 'aprovacao_pagamento', 'cobranca', 'outro')),
  it_codigo text,
  descricao text not null,
  valor numeric,
  responsavel text,
  fora_do_prazo boolean not null default false,
  resolvido boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists bpo_registros_cliente_idx on public.bpo_registros (cliente_id, data desc);

create table if not exists public.bpo_its (
  codigo text primary key,
  fase text not null,
  nome text not null,
  funcao_responsavel text,
  frequencia text,
  objetivo text,
  passos jsonb not null default '[]'::jsonb,
  pontos_atencao jsonb not null default '[]'::jsonb,
  relacionados jsonb not null default '[]'::jsonb,
  revisao text not null default '00'
);

-- ---------- funcoes de geracao ----------
create or replace function public.eng_dia_util(p_data date, p_n int) returns date
language plpgsql immutable as $$
declare d date := p_data; k int := 0;
begin
  while extract(isodow from d) in (6, 7) loop d := d + 1; end loop;
  while k < p_n loop
    d := d + 1;
    if extract(isodow from d) not in (6, 7) then k := k + 1; end if;
  end loop;
  return d;
end $$;

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
  select p_cliente, s, row_number() over (partition by s order by o), i
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
  insert into public.bpo_diagnosticos (cliente_id) values (p_cliente);
  update public.clientes_bpo set status_contrato = 'em_implantacao', data_inicio = coalesce(data_inicio, p_inicio) where id = p_cliente;
  return pid;
end $$;

-- ---------- RLS ----------
do $$
declare t text;
begin
  foreach t in array array['eng_pessoas','eng_projetos','eng_tarefas','eng_os','eng_agenda','eng_entregaveis','bpo_diagnosticos','bpo_propostas','bpo_implantacao_itens','bpo_configuracao','bpo_fechamentos','bpo_registros','bpo_its'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "equipe tudo" on public.%I', t);
    execute format('create policy "equipe tudo" on public.%I for all using (public.eng_e_equipe()) with check (public.eng_e_equipe())', t);
  end loop;
end $$;

drop policy if exists "Acesso por empresa" on public.clientes_bpo;
drop policy if exists "equipe tudo" on public.clientes_bpo;
create policy "equipe tudo" on public.clientes_bpo for all using (public.eng_e_equipe()) with check (public.eng_e_equipe());
drop policy if exists "cliente ve o proprio" on public.clientes_bpo;
create policy "cliente ve o proprio" on public.clientes_bpo for select using (id = public.eng_cliente_id());

create policy "cliente ve projetos" on public.eng_projetos for select using (cliente_id = public.eng_cliente_id());
create policy "cliente ve tarefas" on public.eng_tarefas for select using (cliente_id = public.eng_cliente_id() and visivel_cliente);
create policy "cliente ve agenda" on public.eng_agenda for select using (cliente_id = public.eng_cliente_id() and visivel_cliente);
create policy "cliente ve os publicadas" on public.eng_os for select using (cliente_id = public.eng_cliente_id() and publicada);
create policy "cliente ve entregaveis" on public.eng_entregaveis for select using (cliente_id = public.eng_cliente_id() and visivel_cliente);

-- Seguranca: o usuario so pode editar o proprio nome. role, company_id e cliente_bpo_id so mudam pela funcao update-user (chave de servico).
revoke update on public.profiles from authenticated;
grant update (nome) on public.profiles to authenticated;

grant execute on function public.bpo_iniciar_onboarding(uuid, date) to authenticated;
grant execute on function public.eng_e_equipe() to authenticated;
grant execute on function public.eng_cliente_id() to authenticated;

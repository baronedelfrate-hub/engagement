-- CRM robusto (multiempresa): contas, contatos, oportunidades (funil), atividades, catalogo e propostas.
-- Cada empresa enxerga so o proprio CRM; superadmin enxerga todos. As tabelas antigas (propostas, propostas_itens) ficam intactas.

create table if not exists public.crm_contas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  cnpj_cpf text,
  segmento text,
  site text,
  cidade text,
  uf text,
  origem text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_contatos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  conta_id uuid not null references public.crm_contas(id) on delete cascade,
  nome text not null,
  cargo text,
  email text,
  telefone text,
  whatsapp text,
  decisor boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_oportunidades (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  conta_id uuid not null references public.crm_contas(id) on delete cascade,
  contato_id uuid references public.crm_contatos(id) on delete set null,
  titulo text not null,
  etapa text not null default 'lead' check (etapa in ('lead', 'contato', 'reuniao', 'proposta', 'negociacao', 'ganho', 'perdido')),
  valor numeric not null default 0,
  probabilidade int not null default 10 check (probabilidade between 0 and 100),
  previsao_fechamento date,
  origem text,
  servico text,
  motivo_perda text,
  ganho_em date,
  perdido_em date,
  cliente_bpo_id uuid references public.clientes_bpo(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_oportunidades_idx on public.crm_oportunidades (company_id, etapa);

create table if not exists public.crm_atividades (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  oportunidade_id uuid references public.crm_oportunidades(id) on delete cascade,
  conta_id uuid references public.crm_contas(id) on delete cascade,
  contato_id uuid references public.crm_contatos(id) on delete set null,
  tipo text not null default 'tarefa' check (tipo in ('ligacao', 'reuniao', 'email', 'whatsapp', 'tarefa', 'nota')),
  titulo text not null,
  descricao text,
  data_prevista date,
  concluida_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists crm_atividades_idx on public.crm_atividades (company_id, concluida_em, data_prevista);

create table if not exists public.crm_catalogo (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  tipo text not null default 'outro' check (tipo in ('bpo', 'consultoria', 'outro')),
  descricao text,
  preco numeric not null default 0,
  recorrente boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_propostas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  oportunidade_id uuid references public.crm_oportunidades(id) on delete set null,
  conta_id uuid references public.crm_contas(id) on delete set null,
  numero text not null,
  versao int not null default 1,
  titulo text not null,
  subtitulo text,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'aceita', 'recusada', 'expirada')),
  data_emissao date not null default current_date,
  validade_dias int not null default 30,
  desconto numeric not null default 0,
  valor_total numeric not null default 0,
  parcelas jsonb not null default '[]'::jsonb,
  paginas jsonb not null default '{}'::jsonb,
  conteudo jsonb not null default '{}'::jsonb,
  enviada_em timestamptz,
  aceita_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, numero, versao)
);
create index if not exists crm_propostas_idx on public.crm_propostas (company_id, status);

create table if not exists public.crm_propostas_itens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete cascade,
  proposta_id uuid not null references public.crm_propostas(id) on delete cascade,
  catalogo_id uuid references public.crm_catalogo(id) on delete set null,
  ordem int not null default 1,
  descricao text not null,
  quantidade numeric not null default 1,
  preco_unitario numeric not null default 0,
  desconto numeric not null default 0
);

-- textos institucionais (paginas fixas da proposta) e dados de assinatura, por empresa
create table if not exists public.crm_config (
  company_id uuid primary key references public.empresas(id) on delete cascade,
  institucional jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- isolamento por empresa (mesmo padrao das demais tabelas) + superadmin
do $$
declare t text;
begin
  foreach t in array array['crm_contas','crm_contatos','crm_oportunidades','crm_atividades','crm_catalogo','crm_propostas','crm_propostas_itens','crm_config'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Acesso por empresa" on public.%I', t);
    execute format($p$create policy "Acesso por empresa" on public.%I for all
      using (((select profiles.role from public.profiles where profiles.id = auth.uid()) = 'superadmin') or company_id = (select profiles.company_id from public.profiles where profiles.id = auth.uid()))
      with check (((select profiles.role from public.profiles where profiles.id = auth.uid()) = 'superadmin') or company_id = (select profiles.company_id from public.profiles where profiles.id = auth.uid()))$p$, t);
  end loop;
end $$;

-- dados iniciais da Engagement: textos institucionais da apresentacao e os 4 planos de BPO
insert into public.crm_config (company_id, institucional)
select e.id, jsonb_build_object(
  'marca', 'ENGAGEMENT',
  'metodologia', 'CONSULTORIA F5',
  'cidade', 'Indaiatuba',
  'quem_somos_titulo', 'Parceiros estratégicos da sua gestão financeira',
  'quem_somos', 'A Engagement nasceu para apoiar empresas em crescimento que precisam retomar o controle financeiro ou estruturar uma gestão mais eficiente. Mais do que uma consultoria, atuamos lado a lado com o negócio.',
  'camadas_titulo', 'A metodologia Consultoria F5 separa três camadas:',
  'camadas', jsonb_build_array('Execução', 'Controle', 'Estratégia'),
  'resultado', 'Resultado: clareza, previsibilidade e decisões mais seguras.',
  'missao', 'Apoiar empresas em crescimento na organização e no controle da gestão financeira, com metodologias que separam execução, controle e estratégia, garantindo clareza, previsibilidade e decisões seguras.',
  'visao', 'Ser referência em gestão financeira estratégica e o principal parceiro das empresas que buscam crescimento sustentável, controle financeiro e decisões baseadas em dados.',
  'valores', jsonb_build_array(
    jsonb_build_object('titulo', 'Clareza', 'texto', 'Transparência e organização para que o gestor entenda a realidade do negócio.'),
    jsonb_build_object('titulo', 'Responsabilidade', 'texto', 'Ética, confidencialidade e compromisso com cada cliente.'),
    jsonb_build_object('titulo', 'Estrutura e Método', 'texto', 'Processos definidos e metodologia própria que garantem consistência.'),
    jsonb_build_object('titulo', 'Parceria', 'texto', 'Lado a lado com o cliente, indo além da execução operacional.'),
    jsonb_build_object('titulo', 'Foco em Resultado', 'texto', 'Gestão financeira a serviço de decisões seguras e crescimento sustentável.')
  ),
  'assinatura', jsonb_build_object('nome', 'Estela Destro Del Frate', 'cargo', 'Diretora Geral', 'site', 'engagementsolucoes.com.br')
)
from public.empresas e
where e.id = 'f8a9b65b-8be1-448d-821b-324c3803be46'
on conflict (company_id) do nothing;

insert into public.crm_catalogo (company_id, nome, tipo, descricao, preco, recorrente)
select e.id, v.nome, v.tipo, v.descricao, v.preco, v.recorrente
from public.empresas e,
(values
  ('BPO E5 — Básico (Operação)', 'bpo', 'Operação financeira terceirizada: contas a pagar e receber, conciliação e fluxo de caixa diário.', 1900, true),
  ('BPO E5 — Essencial (Operação + Notas)', 'bpo', 'Operação financeira com emissão de notas e boletos.', 2800, true),
  ('BPO E5 — Profissional (+ Controle gerencial)', 'bpo', 'Inclui fechamento mensal, DRE gerencial e fluxo de caixa projetado.', 4000, true),
  ('BPO E5 — Estratégico (Governança + Educação)', 'bpo', 'Inclui reporte e governança com reunião mensal e educação financeira.', 7000, true),
  ('Consultoria F5 — Projeto de estruturação', 'consultoria', 'Projeto de estruturação financeira e comercial, com cronograma e entregas definidos na proposta.', 0, false)
) as v(nome, tipo, descricao, preco, recorrente)
where e.id = 'f8a9b65b-8be1-448d-821b-324c3803be46'
  and not exists (select 1 from public.crm_catalogo c where c.company_id = e.id);

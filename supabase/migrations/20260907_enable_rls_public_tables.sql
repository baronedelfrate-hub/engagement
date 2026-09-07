-- URGENTE: religa Row Level Security (RLS) nas 50 tabelas que estavam com
-- rowsecurity = false (diagnosticado em 2026-09-07). Como a chave anon do
-- Supabase já esteve pública num repositório GitHub público, essas tabelas
-- estavam legíveis/graváveis por QUALQUER pessoa na internet sem login,
-- incluindo dados sensíveis de RH (rh_funcionarios, rh_holerites,
-- rh_exames_ocupacionais) e as tabelas de controle de acesso
-- (permissions, role_permissions).
--
-- O que este script faz:
--   1. Religa RLS em todas as 50 tabelas.
--   2. Aplica uma política mínima "somente usuários autenticados" na
--      maioria delas — suficiente para bloquear acesso anônimo/público,
--      já que o app inteiro já exige login via Supabase Auth.
--   3. Trata `permissions` e `role_permissions` de forma mais restrita:
--      leitura liberada para qualquer autenticado, mas escrita
--      (insert/update/delete) só para quem passa em `is_superadmin()`
--      (função já existente no banco, usada pela política "Superadmin sees
--      all profiles" em `profiles`) — porque essas duas tabelas controlam
--      quem pode fazer o quê no sistema, e uma política solta aqui deixaria
--      qualquer usuário logado se auto-promover. Isso bate exatamente com o
--      controle de acesso que o frontend já tenta impor (rotas /admin/roles,
--      /admin/permissoes e /admin/times são protegidas por
--      <SuperAdminRoute> em App.jsx) — só que hoje esse controle só existe
--      no frontend, então qualquer um batendo direto na API REST do
--      Supabase pulava ele completamente.
--
-- IMPORTANTE — isso é uma correção de EMERGÊNCIA, não a solução definitiva:
-- a política "authenticated: true" libera qualquer usuário logado a ver/
-- editar dados de QUALQUER empresa (não há isolamento por tenant ainda).
-- O isolamento por company_id/empresa_id é trabalho da Fase 0.3 do projeto
-- e precisa ser feito tabela por tabela, olhando o schema real de cada uma.
--
-- Pré-requisito já confirmado em 2026-09-07: `profiles` tem RLS habilitada
-- e políticas corretas ("Users see own profile" com `id = auth.uid()`,
-- "Superadmin sees all profiles" usando `is_superadmin()`), então a função
-- `is_superadmin()` usada abaixo funciona normalmente.

-- 1) Religa RLS em todas as tabelas afetadas
do $$
declare
  t text;
  tabelas text[] := array[
    'audit_log', 'bpo_atividades', 'bpo_blocos', 'bpo_clientes', 'bpo_fases',
    'conciliacoes_contabeis', 'contas_contabeis', 'conversoes_historico',
    'f1_checklist', 'f1_diagnosis', 'f1_interview', 'f1_reports',
    'f2_actions', 'f2_indicators', 'f2_modules', 'f2_proposals', 'f2_routines',
    'f3_evolution_reports', 'f3_monitoring', 'f4_optimization', 'f5_sustainability',
    'lancamentos_contabeis', 'lancamentos_historico',
    'nfe_produtos', 'nfe_produtos_historico', 'nfe_produtos_itens',
    'notas_fiscais_servico',
    'parametros_integradores', 'parametros_nfe', 'parametros_nfse', 'parametros_tributos',
    'permissions', 'phases', 'projects',
    'rh_avaliacoes_desempenho', 'rh_beneficios', 'rh_beneficios_funcionarios',
    'rh_comprovantes_pagamento', 'rh_convencao_coletiva', 'rh_descricao_cargos',
    'rh_documentos', 'rh_exames_ocupacionais', 'rh_ferias', 'rh_funcionarios',
    'rh_holerites', 'rh_nr_controle', 'rh_organogramas', 'rh_politicas_manuais',
    'role_permissions', 'times'
  ];
begin
  foreach t in array tabelas loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- 2) Política mínima "autenticado" em todas as tabelas, EXCETO permissions/role_permissions
do $$
declare
  t text;
  tabelas text[] := array[
    'audit_log', 'bpo_atividades', 'bpo_blocos', 'bpo_clientes', 'bpo_fases',
    'conciliacoes_contabeis', 'contas_contabeis', 'conversoes_historico',
    'f1_checklist', 'f1_diagnosis', 'f1_interview', 'f1_reports',
    'f2_actions', 'f2_indicators', 'f2_modules', 'f2_proposals', 'f2_routines',
    'f3_evolution_reports', 'f3_monitoring', 'f4_optimization', 'f5_sustainability',
    'lancamentos_contabeis', 'lancamentos_historico',
    'nfe_produtos', 'nfe_produtos_historico', 'nfe_produtos_itens',
    'notas_fiscais_servico',
    'parametros_integradores', 'parametros_nfe', 'parametros_nfse', 'parametros_tributos',
    'phases', 'projects',
    'rh_avaliacoes_desempenho', 'rh_beneficios', 'rh_beneficios_funcionarios',
    'rh_comprovantes_pagamento', 'rh_convencao_coletiva', 'rh_descricao_cargos',
    'rh_documentos', 'rh_exames_ocupacionais', 'rh_ferias', 'rh_funcionarios',
    'rh_holerites', 'rh_nr_controle', 'rh_organogramas', 'rh_politicas_manuais',
    'times'
  ];
begin
  foreach t in array tabelas loop
    execute format(
      'drop policy if exists "authenticated_full_access" on public.%I;', t
    );
    execute format(
      'create policy "authenticated_full_access" on public.%I for all to authenticated using (true) with check (true);', t
    );
  end loop;
end $$;

-- 3) permissions / role_permissions: leitura para todo autenticado,
--    escrita só para quem is_superadmin() retorna true
drop policy if exists "permissions_select_authenticated" on public.permissions;
create policy "permissions_select_authenticated"
on public.permissions for select
to authenticated
using (true);

drop policy if exists "permissions_write_superadmin" on public.permissions;
create policy "permissions_write_superadmin"
on public.permissions for insert
to authenticated
with check (is_superadmin());

drop policy if exists "permissions_update_superadmin" on public.permissions;
create policy "permissions_update_superadmin"
on public.permissions for update
to authenticated
using (is_superadmin());

drop policy if exists "permissions_delete_superadmin" on public.permissions;
create policy "permissions_delete_superadmin"
on public.permissions for delete
to authenticated
using (is_superadmin());

drop policy if exists "role_permissions_select_authenticated" on public.role_permissions;
create policy "role_permissions_select_authenticated"
on public.role_permissions for select
to authenticated
using (true);

drop policy if exists "role_permissions_write_superadmin" on public.role_permissions;
create policy "role_permissions_write_superadmin"
on public.role_permissions for insert
to authenticated
with check (is_superadmin());

drop policy if exists "role_permissions_update_superadmin" on public.role_permissions;
create policy "role_permissions_update_superadmin"
on public.role_permissions for update
to authenticated
using (is_superadmin());

drop policy if exists "role_permissions_delete_superadmin" on public.role_permissions;
create policy "role_permissions_delete_superadmin"
on public.role_permissions for delete
to authenticated
using (is_superadmin());

-- Força o PostgREST a recarregar o cache de schema/policies imediatamente
notify pgrst, 'reload schema';

-- Fase 0.3 — pré-semeia as 6 permissões do módulo F5 na tabela `permissions`.
--
-- Por quê: `F5ConfigPermissions.jsx` (matriz de permissões por role) precisa
-- que as permissões `f5.*` existam na tabela `permissions` antes de poder
-- vinculá-las a uma role em `role_permissions`. A tela tenta criar a
-- permissão automaticamente na primeira vez que é usada, mas isso exige
-- INSERT em `permissions` — tabela protegida por RLS que exige
-- `is_superadmin()` (ver 20260907_enable_rls_public_tables.sql).
--
-- Achado nesta sessão: `is_superadmin()` está retornando `null` (não
-- `true`) mesmo para contas com `profiles.role = 'superadmin'` — ou seja,
-- NINGUÉM consegue inserir em `permissions` hoje, nem superadmins de
-- verdade. Isso é o mesmo tipo de bug já registrado na memória do projeto
-- (SuperAdminRoute checava a chave errada do AuthContext), só que agora
-- do lado do Postgres — a função em si, não o frontend. Não investigado/
-- corrigido agora (fora do escopo desta migração de dados); só contornado
-- aqui semeando os dados que o F5ConfigPermissions precisa pra funcionar
-- enquanto isso não é corrigido.
--
-- Execute este script no SQL Editor do Supabase (Dashboard > SQL Editor > New query).

INSERT INTO public.permissions (codigo, nome, modulo)
VALUES
  ('f5.view', 'Visualizar Metodologia F5', 'F5'),
  ('f5.edit', 'Editar Metodologia F5', 'F5'),
  ('f5.upload', 'Upload de Documentos F5', 'F5'),
  ('f5.kpi.manage', 'Gerenciar KPIs F5', 'F5'),
  ('f5.report.generate', 'Gerar Relatórios F5', 'F5'),
  ('f5.audit.view', 'Visualizar Auditoria F5', 'F5')
ON CONFLICT (codigo) DO NOTHING;

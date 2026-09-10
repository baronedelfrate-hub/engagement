-- Corrige lacuna deixada em 20260907_enable_rls_public_tables.sql: a
-- tabela role_permissions teve RLS HABILITADA (primeiro bloco da
-- migration), mas nunca recebeu nenhuma política — o segundo bloco
-- (política "authenticated_full_access") excluía explicitamente
-- permissions/role_permissions pra tratá-las à parte, e o terceiro bloco
-- só criou políticas bespoke pra `permissions`, esquecendo `role_permissions`.
--
-- Resultado: RLS habilitada + zero políticas = Postgres nega TUDO por
-- padrão, mesmo pra usuários autenticados. Isso quebrava silenciosamente
-- qualquer tela que tentasse ler/gravar em role_permissions (ex:
-- F5ConfigPermissions.jsx, Admin > Roles).
--
-- Diferente de `permissions` (que exige is_superadmin() pra escrita —
-- função hoje quebrada, ver nota em is_superadmin() na memória do
-- projeto), aqui aplicamos a mesma política mínima "authenticated_full_access"
-- já usada na maioria das outras tabelas da migration de emergência,
-- consistente com a postura documentada ali ("correção de emergência,
-- isolamento por company_id fica pra depois").
--
-- Execute este script no SQL Editor do Supabase (Dashboard > SQL Editor > New query).

DROP POLICY IF EXISTS "authenticated_full_access" ON public.role_permissions;
CREATE POLICY "authenticated_full_access"
ON public.role_permissions FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

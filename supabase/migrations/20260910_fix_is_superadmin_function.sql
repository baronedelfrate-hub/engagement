-- Corrige a causa raiz de dois bugs de RBAC descobertos nesta sessão
-- (ver [[project_fase02_color_fixes]] e [[project_fase03_storage_migration]]):
-- `is_superadmin()` sempre retornou `null`/falso para QUALQUER usuário,
-- inclusive superadmins reais, porque checava uma claim de JWT
-- (`auth.jwt() ->> 'user_role'`) que nunca existiu — não há nenhum
-- Custom Access Token Hook configurado neste projeto que preenchesse
-- essa claim de nível superior. O role de verdade sempre esteve em
-- `profiles.role` (já usado corretamente em todo o resto do app, ex:
-- `AuthContext.jsx`).
--
-- Efeito prático do bug: qualquer política RLS que dependesse de
-- `is_superadmin()` (ex: INSERT em `permissions`, `role_permissions`)
-- negava acesso pra todo mundo, sempre — inclusive contas com
-- `profiles.role = 'superadmin'` confirmado.
--
-- Aplicado ao vivo via MCP do Supabase em 2026-09-10 e confirmado
-- funcionando (RPC is_superadmin() retornando `true` pra sessão real
-- logada). Este arquivo só registra a migration no histórico do repo —
-- não precisa ser executado manualmente de novo.

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'
  );
END;
$function$;

-- Cria a tabela movimentacao_estoque, que nunca existiu no banco.
-- O frontend (apps/web/src/pages/estoque/MovimentacaoEstoqueList.jsx e
-- MovimentacaoEstoqueForm.jsx) já espera essa tabela desde sempre — hoje a
-- tela de "Movimentação de Estoque" falha ao carregar com o erro do
-- PostgREST "Could not find the table 'public.movimentacao_estoque' in the
-- schema cache" (código PGRST205), sugerindo por engano a tabela
-- 'movimentacao_baixas' (não relacionada).
--
-- Colunas definidas a partir do que o formulário efetivamente lê/grava:
-- produto_id, tipo (Entrada/Saída/Ajuste), quantidade, data, motivo, lote,
-- serial, status (Concluído/Pendente), mais company_id (multi-tenant, via
-- insertWithCompanyId) e os metadados padrão id/created_at/updated_at.
--
-- Execute este script no SQL Editor do Supabase (Dashboard > SQL Editor > New query).

CREATE TABLE IF NOT EXISTS public.movimentacao_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.empresas(id),
  produto_id uuid REFERENCES public.produtos(id),
  tipo text NOT NULL DEFAULT 'Entrada',
  quantidade numeric(15,3) NOT NULL,
  data date NOT NULL DEFAULT current_date,
  motivo text,
  lote text,
  serial text,
  status text NOT NULL DEFAULT 'Concluído',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movimentacao_estoque_produto_id ON public.movimentacao_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacao_estoque_company_id ON public.movimentacao_estoque(company_id);

-- RLS: mesma política mínima "somente autenticado" já aplicada nas outras
-- tabelas do app em 20260907_enable_rls_public_tables.sql (isolamento real
-- por company_id fica para a Fase 0.3).
ALTER TABLE public.movimentacao_estoque ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.movimentacao_estoque;
CREATE POLICY "authenticated_full_access"
ON public.movimentacao_estoque FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Força o PostgREST a recarregar o cache de schema para reconhecer a nova
-- tabela imediatamente (sem esperar o próximo redeploy/restart automático).
NOTIFY pgrst, 'reload schema';

-- Corrige o schema incompleto da tabela lancamentos_contabeis.
-- A tabela só tinha: id, empresa_id, data, status, created_at, updated_at.
-- O frontend (apps/web/src/pages/contabilidade/lancamentos/**) espera as colunas abaixo,
-- que nunca foram criadas — por isso nenhum lançamento contábil consegue ser
-- salvo ou consultado hoje (erros PGRST200 ao tentar embutir conta_debito/conta_credito).
--
-- Execute este script no SQL Editor do Supabase (Dashboard > SQL Editor > New query).

ALTER TABLE public.lancamentos_contabeis
  ADD COLUMN IF NOT EXISTS competencia text,
  ADD COLUMN IF NOT EXISTS historico text,
  ADD COLUMN IF NOT EXISTS valor numeric(15,2),
  ADD COLUMN IF NOT EXISTS origem text,
  ADD COLUMN IF NOT EXISTS documento_vinculado text,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id),
  ADD COLUMN IF NOT EXISTS conta_debito_id uuid REFERENCES public.contas_contabeis(id),
  ADD COLUMN IF NOT EXISTS conta_credito_id uuid REFERENCES public.contas_contabeis(id),
  ADD COLUMN IF NOT EXISTS data_criacao timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS usuario_criacao_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS data_submissao timestamptz,
  ADD COLUMN IF NOT EXISTS usuario_submissao_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS data_aprovacao timestamptz,
  ADD COLUMN IF NOT EXISTS usuario_aprovacao_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS data_exportacao timestamptz;

-- As FKs acima (ADD COLUMN ... REFERENCES inline) recebem automaticamente os nomes
-- lancamentos_contabeis_conta_debito_id_fkey e lancamentos_contabeis_conta_credito_id_fkey,
-- que já são exatamente os nomes usados no hint do PostgREST em
-- apps/web/src/pages/contabilidade/lancamentos/hooks/useLancamentosContabeis.js
-- (conta_debito:contas_contabeis!lancamentos_contabeis_conta_debito_id_fkey(...)).
-- Ou seja: depois de rodar esta migration, nenhuma mudança de código é necessária.

-- Força o PostgREST a recarregar o cache de schema para reconhecer as novas colunas/FKs
-- imediatamente (sem esperar o próximo redeploy/restart automático).
NOTIFY pgrst, 'reload schema';

-- Fase 0.3 — migração de storage.js (localStorage) para Supabase real:
-- primeiro lote (cadastros pequenos e isolados).
--
-- 1) Cria as tabelas 'tributos' e 'unidades_medida', que nunca existiram.
-- 2) Adiciona a coluna 'codigo' em 'origens' (tabela já existe e já é usada
--    em outros lugares — apps/web/src/hooks/useFinanceiroDropdowns.js —
--    mas sem essa coluna). A tela de cadastro de Origens sempre teve um
--    campo "Código" (ex: "0 - Nacional") como identificador principal;
--    nenhum outro lugar do app referencia o schema de 'origens' hoje
--    (ProdutosForm.jsx guarda a origem fiscal da mercadoria como texto
--    livre direto no produto, sem FK pra essa tabela), então adicionar a
--    coluna é seguro.
--
-- 'tipos_documento' e 'tipos_pagamento' NÃO precisam de migration — já
-- existem com o schema que as telas migradas vão usar (nome/sigla/ativo e
-- nome/ativo respectivamente).
--
-- Execute este script no SQL Editor do Supabase (Dashboard > SQL Editor > New query).

ALTER TABLE public.origens
  ADD COLUMN IF NOT EXISTS codigo text;

CREATE TABLE IF NOT EXISTS public.tributos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.empresas(id),
  nome text NOT NULL,
  codigo text,
  tipo text NOT NULL DEFAULT 'Federal',
  aliquota numeric(7,4) NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.unidades_medida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.empresas(id),
  nome text NOT NULL,
  simbolo text,
  fator_conversao numeric(15,6) NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tributos_company_id ON public.tributos(company_id);
CREATE INDEX IF NOT EXISTS idx_unidades_medida_company_id ON public.unidades_medida(company_id);

-- RLS: mesma política mínima "somente autenticado" já usada em
-- 20260907_enable_rls_public_tables.sql e 20260910_create_movimentacao_estoque.sql
-- (isolamento real por company_id fica pra depois, ver nota nessas migrations).
ALTER TABLE public.tributos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.tributos;
CREATE POLICY "authenticated_full_access"
ON public.tributos FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.unidades_medida ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.unidades_medida;
CREATE POLICY "authenticated_full_access"
ON public.unidades_medida FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Força o PostgREST a recarregar o cache de schema imediatamente.
NOTIFY pgrst, 'reload schema';

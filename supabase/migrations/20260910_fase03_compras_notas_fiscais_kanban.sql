-- Fase 0.3 — completa o fluxo Kanban de Notas Fiscais de Entrada (Compras).
--
-- Achado: o Kanban de notas-fiscais (KanbanNotasFiscais/MatchingModal/
-- RecebimentoNFeModal) estava órfão — nada no código criava um registro
-- em notas_fiscais_entrada. As duas entradas reais do sistema
-- (UploadXMLModal, FormularioEntradaManualModal) iam direto pra
-- NotaFiscalInsertionService, que criava contas_pagar + entradas_estoque
-- sem categoria/centro de custo/rateio/parcelamento, pulando o Kanban
-- inteiro. Decisão do usuário: completar o fluxo Kanban de verdade
-- (XML/Manual criam a nota em Pendente, passa por Matching/Recebimento,
-- só aí gera contas_pagar/entradas_estoque com classificação completa).
--
-- notas_fiscais_entrada existia mas faltavam colunas que o Kanban sempre
-- esperou (chave_nfe, serie, tipo_nota, origem, pedido_compra_id,
-- categoria_id). nf_rateio e nf_divergencia nunca existiram.
--
-- Aplicado ao vivo via MCP do Supabase em 2026-09-10 — este arquivo só
-- registra a migration no histórico do repo.

-- notas_fiscais_itens só tinha produto_id — mas nem todo item de XML bate
-- com um produto já cadastrado, então precisa guardar o texto original
-- (código/descrição do XML) independente do match.
ALTER TABLE public.notas_fiscais_itens
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS descricao text;

ALTER TABLE public.notas_fiscais_entrada
  ADD COLUMN IF NOT EXISTS chave_nfe text,
  ADD COLUMN IF NOT EXISTS serie text,
  ADD COLUMN IF NOT EXISTS tipo_nota text DEFAULT 'DANFE',
  ADD COLUMN IF NOT EXISTS origem text,
  ADD COLUMN IF NOT EXISTS pedido_compra_id uuid REFERENCES public.pedidos_compra(id),
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES public.categorias(id);

CREATE TABLE IF NOT EXISTS public.nf_rateio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.empresas(id),
  nota_id uuid REFERENCES public.notas_fiscais_entrada(id) ON DELETE CASCADE,
  percentual numeric(6,3) NOT NULL,
  subcategoria_id uuid REFERENCES public.subcategorias(id),
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  projeto_id uuid REFERENCES public.projetos(id),
  valor_rateado numeric(15,2),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nf_divergencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.empresas(id),
  nota_id uuid REFERENCES public.notas_fiscais_entrada(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text,
  justificativa text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nf_rateio_nota_id ON public.nf_rateio(nota_id);
CREATE INDEX IF NOT EXISTS idx_nf_divergencia_nota_id ON public.nf_divergencia(nota_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_entrada_status ON public.notas_fiscais_entrada(status);

ALTER TABLE public.nf_rateio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.nf_rateio;
CREATE POLICY "authenticated_full_access" ON public.nf_rateio FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.nf_divergencia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.nf_divergencia;
CREATE POLICY "authenticated_full_access" ON public.nf_divergencia FOR ALL TO authenticated USING (true) WITH CHECK (true);

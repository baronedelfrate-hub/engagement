-- Fase 0.3 lote 3 — migração de storage.js para Supabase real: módulo estoque.
--
-- entradas_estoque já existia mas sem produto_id (a tabela real parece ter sido
-- desenhada para agrupar por NFe/nota, não por produto individual — mas as
-- telas EntradaEstoqueForm/List sempre trabalharam por produto). Adiciona a
-- coluna, tabela está vazia (0 linhas), sem risco.
--
-- inventario, reservas e transferencias nunca existiram; criadas do zero com
-- o schema que as telas já esperam.
--
-- Aplicado ao vivo via MCP do Supabase em 2026-09-10 — este arquivo só
-- registra a migration no histórico do repo.

ALTER TABLE public.entradas_estoque
  ADD COLUMN IF NOT EXISTS produto_id uuid REFERENCES public.produtos(id);

CREATE TABLE IF NOT EXISTS public.inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.empresas(id),
  produto_id uuid REFERENCES public.produtos(id),
  quantidade_contada numeric(15,3) NOT NULL,
  quantidade_sistema numeric(15,3) NOT NULL,
  diferenca numeric(15,3) NOT NULL DEFAULT 0,
  data_contagem date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.empresas(id),
  produto_id uuid REFERENCES public.produtos(id),
  pedido_id uuid REFERENCES public.pedidos_venda(id),
  quantidade numeric(15,3) NOT NULL,
  data_reserva date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'Ativa',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.empresas(id),
  produto_id uuid REFERENCES public.produtos(id),
  quantidade numeric(15,3) NOT NULL,
  origem text,
  destino text,
  data date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'Concluído',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entradas_estoque_produto_id ON public.entradas_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_inventario_produto_id ON public.inventario(produto_id);
CREATE INDEX IF NOT EXISTS idx_reservas_produto_id ON public.reservas(produto_id);
CREATE INDEX IF NOT EXISTS idx_reservas_pedido_id ON public.reservas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_produto_id ON public.transferencias(produto_id);

ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.inventario;
CREATE POLICY "authenticated_full_access" ON public.inventario FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.reservas;
CREATE POLICY "authenticated_full_access" ON public.reservas FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.transferencias;
CREATE POLICY "authenticated_full_access" ON public.transferencias FOR ALL TO authenticated USING (true) WITH CHECK (true);

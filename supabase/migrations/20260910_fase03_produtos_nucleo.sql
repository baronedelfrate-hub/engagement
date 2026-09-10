-- Fase 0.3 — cadastro de Produtos, núcleo funcional.
--
-- ProdutosForm.jsx (services/produtoService.js sobre storage.js) tinha
-- ~50 campos espalhados em 8 abas, mas a tabela real `produtos` só tinha
-- schema pra uma fração deles (nome, descricao, sku, categoria_id,
-- subcategoria_id, preco_custo, preco_venda, estoque_minimo,
-- estoque_atual, unidade_medida, ativo, fornecedor_id) — o resto
-- (alíquotas fiscais por produto, comissão, e-commerce, controle de
-- lote/validade, contas contábeis vinculadas, upload de arquivos, custo
-- médio/padrão rastreado) nunca teve coluna real, mesmo no localStorage
-- antigo — parece ter sido construído na UI antes do schema existir.
--
-- Decisão do usuário: migrar o núcleo funcional agora (campos com coluna
-- real ou usados por outro módulo) e deixar o resto pra uma sessão
-- dedicada de design, em vez de expandir o schema pra tudo de uma vez.
--
-- codigo_barras, marca, estoque_maximo: campos simples de identidade/
-- estoque, parte do núcleo básico do cadastro.
-- tipo_produto_id: a tabela `tipo_produto` já existe e já é usada tanto
-- em ProdutosList.jsx quanto ProdutosForm.jsx (dropdown), só faltava a
-- FK em produtos.
-- ncm: achado que NfeEmissionForm.jsx (fiscal/nfe-produtos) já faz
-- `select('id, nome, preco_venda, ncm')` contra produtos — ou seja, esse
-- campo já era uma dependência real de outro módulo, só nunca existiu
-- de fato (bug pré-existente, corrigido junto com esta migration).
--
-- Aplicado ao vivo via MCP do Supabase em 2026-09-10 — este arquivo só
-- registra a migration no histórico do repo.

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS codigo_barras text,
  ADD COLUMN IF NOT EXISTS tipo_produto_id uuid REFERENCES public.tipo_produto(id),
  ADD COLUMN IF NOT EXISTS marca text,
  ADD COLUMN IF NOT EXISTS estoque_maximo numeric(15,3),
  ADD COLUMN IF NOT EXISTS ncm text,
  ADD COLUMN IF NOT EXISTS controla_estoque boolean NOT NULL DEFAULT true;

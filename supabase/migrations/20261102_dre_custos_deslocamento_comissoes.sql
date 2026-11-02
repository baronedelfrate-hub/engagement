-- DRE gerencial: duas novas linhas de custo direto (3.4 Deslocamento e 3.5 Comissões).
-- Libera os novos valores de categorias.grupo_dre.
alter table public.categorias drop constraint if exists categorias_grupo_dre_check;
alter table public.categorias add constraint categorias_grupo_dre_check check (
  grupo_dre is null or grupo_dre = any (array[
    'custo_servico', 'despesa_operacional', 'nao_operacional',
    'receita_bruta', 'deducoes',
    'custo_mao_obra', 'custo_ferramentas', 'custo_midia', 'custo_deslocamento', 'custo_comissoes',
    'desp_administrativas', 'desp_comerciais', 'desp_estrutura', 'desp_gerais',
    'receita_financeira', 'desp_financeira',
    'socios', 'investimentos', 'emprestimos'
  ]::text[])
);

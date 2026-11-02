-- DRE gerencial: grupos 12 (repasse de clientes) e 13 (transferencias), fora do resultado e do caixa.
alter table public.categorias drop constraint if exists categorias_grupo_dre_check;
alter table public.categorias add constraint categorias_grupo_dre_check check (
  grupo_dre is null or grupo_dre = any (array[
    'custo_servico', 'despesa_operacional', 'nao_operacional',
    'receita_bruta', 'deducoes',
    'custo_mao_obra', 'custo_ferramentas', 'custo_midia', 'custo_deslocamento', 'custo_comissoes',
    'desp_administrativas', 'desp_comerciais', 'desp_estrutura', 'desp_gerais',
    'receita_financeira', 'desp_financeira',
    'socios', 'investimentos', 'emprestimos',
    'repasse_clientes', 'transferencias'
  ]::text[])
);

// Monta o registro de uma conta a pagar na Movimentação Financeira (a base única do financeiro).
// Compras, Entrada de NF e Manifestação passam por aqui em vez de gravar na tabela antiga contas_pagar.
export const montarTituloPagar = ({
  companyId, fornecedorId, numero, valor, emissao, vencimento,
  categoriaId, subcategoriaId, centroCustoId, projetoId, observacoes,
  parcela = 1, totalParcelas = 1, createdBy
}) => ({
  ...(companyId ? { company_id: companyId } : {}),
  tipo: 'pagar',
  numero_titulo: String(numero),
  fornecedor_id: fornecedorId || null,
  valor_total: Number(valor),
  data_emissao: emissao || null,
  data_vencimento: vencimento || emissao || new Date().toISOString().split('T')[0],
  categoria_id: categoriaId || null,
  subcategoria_id: subcategoriaId || null,
  centro_custo_id: centroCustoId || null,
  projeto_id: projetoId || null,
  status: 'pendente',
  parcela_atual: parcela,
  total_parcelas: totalParcelas,
  observacoes: observacoes || null,
  ...(createdBy ? { created_by: createdBy } : {})
});

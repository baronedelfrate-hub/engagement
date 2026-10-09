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

// Conta a receber na Movimentação Financeira (NF-e e NFS-e passam por aqui em vez de gravar em contas_receber).
export const montarTituloReceber = ({
  companyId, clienteId, numero, valor, emissao, vencimento,
  categoriaId, subcategoriaId, centroCustoId, projetoId, observacoes, createdBy
}) => ({
  ...(companyId ? { company_id: companyId } : {}),
  tipo: 'receber',
  numero_titulo: String(numero),
  cliente_id: clienteId || null,
  valor_total: Number(valor),
  data_emissao: emissao ? String(emissao).split('T')[0] : null,
  data_vencimento: vencimento ? String(vencimento).split('T')[0] : (emissao ? String(emissao).split('T')[0] : new Date().toISOString().split('T')[0]),
  categoria_id: categoriaId || null,
  subcategoria_id: subcategoriaId || null,
  centro_custo_id: centroCustoId || null,
  projeto_id: projetoId || null,
  status: 'pendente',
  parcela_atual: 1,
  total_parcelas: 1,
  observacoes: observacoes || null,
  ...(createdBy ? { created_by: createdBy } : {})
});
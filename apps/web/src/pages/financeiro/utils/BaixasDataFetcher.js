import { supabase } from '@/lib/customSupabaseClient';

export const fetchBaixasData = async (filters) => {
  try {
    const { status, tipoConta, dataInicio, dataFim, categoriaId, subcategoriaId, centroCustoId, entidadeId, tipoPagamentoId, condicaoPagamentoId } = filters;

    let pagarPromise = null;
    let receberPromise = null;

    // Base selects with joins. Added banco_id to ensure it's available for pre-filling.
    const selectPagar = `
      id, numero, fornecedor_id, data_emissao, data_vencimento, valor_original, valor_pago, status, observacoes, company_id, parcelado, 
      categoria_id, subcategoria_id, centro_custo_id, tipo_pagamento_id, condicao_pagamento_id, banco_id,
      fornecedor:fornecedores(nome),
      categoria:categorias(nome),
      subcategoria:subcategorias(nome),
      centro_custo:centros_custo(nome),
      tipo_pagamento:tipos_pagamento(nome),
      condicao_pagamento:condicoes_pagamento(nome),
      banco:bancos(nome)
    `;

    const selectReceber = `
      id, numero, cliente_id, data_emissao, data_vencimento, valor_original, valor_recebido, status, observacoes, company_id,
      categoria_id, subcategoria_id, centro_custo_id, tipo_pagamento_id, condicao_pagamento_id, banco_id,
      cliente:clientes(nome),
      categoria:categorias(nome),
      subcategoria:subcategorias(nome),
      centro_custo:centros_custo(nome),
      tipo_pagamento:tipos_pagamento(nome),
      condicao_pagamento:condicoes_pagamento(nome),
      banco:bancos(nome)
    `;

    // Fetch Pagar
    if (tipoConta === 'AMBOS' || tipoConta === 'PAGAR') {
      let query = supabase.from('contas_pagar').select(selectPagar);
      if (status !== 'TODOS') query = status === 'PENDENTE' ? query.not('status', 'eq', 'Pago') : query.eq('status', 'Pago');
      if (dataInicio) query = query.gte('data_vencimento', dataInicio);
      if (dataFim) query = query.lte('data_vencimento', dataFim);
      if (categoriaId && categoriaId !== 'TODOS') query = query.eq('categoria_id', categoriaId);
      if (subcategoriaId && subcategoriaId !== 'TODOS') query = query.eq('subcategoria_id', subcategoriaId);
      if (centroCustoId && centroCustoId !== 'TODOS') query = query.eq('centro_custo_id', centroCustoId);
      if (entidadeId && entidadeId !== 'TODOS') query = query.eq('fornecedor_id', entidadeId);
      if (tipoPagamentoId && tipoPagamentoId !== 'TODOS') query = query.eq('tipo_pagamento_id', tipoPagamentoId);
      if (condicaoPagamentoId && condicaoPagamentoId !== 'TODOS') query = query.eq('condicao_pagamento_id', condicaoPagamentoId);
      
      pagarPromise = query;
    }

    // Fetch Receber
    if (tipoConta === 'AMBOS' || tipoConta === 'RECEBER') {
      let query = supabase.from('contas_receber').select(selectReceber);
      if (status !== 'TODOS') query = status === 'PENDENTE' ? query.not('status', 'eq', 'Recebido').not('status', 'eq', 'Pago') : query.in('status', ['Recebido', 'Pago']);
      if (dataInicio) query = query.gte('data_vencimento', dataInicio);
      if (dataFim) query = query.lte('data_vencimento', dataFim);
      if (categoriaId && categoriaId !== 'TODOS') query = query.eq('categoria_id', categoriaId);
      if (subcategoriaId && subcategoriaId !== 'TODOS') query = query.eq('subcategoria_id', subcategoriaId);
      if (centroCustoId && centroCustoId !== 'TODOS') query = query.eq('centro_custo_id', centroCustoId);
      if (entidadeId && entidadeId !== 'TODOS') query = query.eq('cliente_id', entidadeId);
      if (tipoPagamentoId && tipoPagamentoId !== 'TODOS') query = query.eq('tipo_pagamento_id', tipoPagamentoId);
      if (condicaoPagamentoId && condicaoPagamentoId !== 'TODOS') query = query.eq('condicao_pagamento_id', condicaoPagamentoId);
      
      receberPromise = query;
    }

    const [pagarRes, receberRes] = await Promise.all([
      pagarPromise ? pagarPromise : Promise.resolve({ data: [] }),
      receberPromise ? receberPromise : Promise.resolve({ data: [] })
    ]);

    if (pagarRes.error) throw pagarRes.error;
    if (receberRes.error) throw receberRes.error;

    // Normalize Data
    const normalizedPagar = (pagarRes.data || []).map(item => ({
      ...item,
      tipo_geral: 'PAGAR',
      entidadeNome: item.fornecedor?.nome || 'Não informado',
      valor: parseFloat(item.valor_original || 0),
      valor_pago_recebido: parseFloat(item.valor_pago || 0),
      numeroDisplay: item.numero || 'S/N'
    }));

    const normalizedReceber = (receberRes.data || []).map(item => ({
      ...item,
      tipo_geral: 'RECEBER',
      entidadeNome: item.cliente?.nome || 'Não informado',
      valor: parseFloat(item.valor_original || 0),
      valor_pago_recebido: parseFloat(item.valor_recebido || 0),
      numeroDisplay: item.numero || 'S/N'
    }));

    const combined = [...normalizedPagar, ...normalizedReceber].sort((a, b) => 
      new Date(a.data_vencimento) - new Date(b.data_vencimento)
    );

    return combined;

  } catch (error) {
    console.error("Erro ao buscar dados de baixas:", error);
    throw error;
  }
};

/**
 * Estorna (reverte) todas as baixas de um título específico
 * @param {string} tituloId - ID do título (contas_pagar ou contas_receber)
 * @param {string} tipoGeral - 'PAGAR' ou 'RECEBER'
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const estornarBaixa = async (tituloId, tipoGeral) => {
  try {
    console.log(`🔄 [EstornarBaixa] Iniciando estorno. Título ID: ${tituloId}, Tipo: ${tipoGeral}`);

    // Validate input
    if (!tituloId || !tipoGeral) {
      throw new Error('ID do título e tipo são obrigatórios');
    }

    if (tipoGeral !== 'PAGAR' && tipoGeral !== 'RECEBER') {
      throw new Error('Tipo deve ser PAGAR ou RECEBER');
    }

    const isPagar = tipoGeral === 'PAGAR';
    const baixasTable = isPagar ? 'contas_pagar_baixas' : 'contas_receber_baixas';
    const titulosTable = isPagar ? 'contas_pagar' : 'contas_receber';
    const valorField = isPagar ? 'valor_pago' : 'valor_recebido';

    // Step 1: Verify título exists and is in "Pago"/"Recebido" status
    console.log(`📋 [EstornarBaixa] Verificando título na tabela ${titulosTable}...`);
    const { data: titulo, error: tituloError } = await supabase
      .from(titulosTable)
      .select('id, status, numero')
      .eq('id', tituloId)
      .single();

    if (tituloError) {
      console.error('❌ [EstornarBaixa] Erro ao buscar título:', tituloError);
      throw new Error('Título não encontrado');
    }

    const validStatuses = isPagar ? ['Pago'] : ['Recebido', 'Pago'];
    if (!validStatuses.includes(titulo.status)) {
      throw new Error(`Título não está em status válido para estorno. Status atual: ${titulo.status}`);
    }

    // Step 2: Delete all baixas for this título
    console.log(`🗑️ [EstornarBaixa] Deletando baixas da tabela ${baixasTable}...`);
    const { error: deleteBaixasError } = await supabase
      .from(baixasTable)
      .delete()
      .eq('conta_id', tituloId);

    if (deleteBaixasError) {
      console.error('❌ [EstornarBaixa] Erro ao deletar baixas:', deleteBaixasError);
      throw new Error('Erro ao deletar registros de baixa');
    }

    // Step 3: Update título to reset status and values
    console.log(`📝 [EstornarBaixa] Atualizando título para status Aberto...`);
    const updatePayload = {
      status: 'Aberto',
      [valorField]: 0,
      updated_at: new Date().toISOString()
    };

    const { error: updateTituloError } = await supabase
      .from(titulosTable)
      .update(updatePayload)
      .eq('id', tituloId);

    if (updateTituloError) {
      console.error('❌ [EstornarBaixa] Erro ao atualizar título:', updateTituloError);
      throw new Error('Erro ao atualizar status do título');
    }

    console.log(`✅ [EstornarBaixa] Estorno concluído com sucesso! Título ${titulo.numero} voltou para status Aberto`);
    
    return { success: true };

  } catch (error) {
    console.error('❌ [EstornarBaixa] Erro fatal:', error);
    return { 
      success: false, 
      error: error.message || 'Erro desconhecido ao estornar baixa' 
    };
  }
};
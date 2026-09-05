import { supabase } from '@/lib/customSupabaseClient';

export const fetchConciliacaoData = async (filters) => {
  try {
    const { dataInicio, dataFim, bancoId, statusConciliacao } = filters;

    // First, fetch bank info to get data_saldo_inicial
    let bankInfo = { saldo: 0, data_saldo_inicial: null };
    if (bancoId && bancoId !== 'TODOS') {
      const { data: bankData, error: bankError } = await supabase
        .from('bancos')
        .select('saldo, data_saldo_inicial')
        .eq('id', bancoId)
        .single();
      
      if (!bankError && bankData) {
        bankInfo = bankData;
      }
    }

    // Use data_vencimento for contas_pagar since data_baixa might not exist directly on the table
    // or use it as fallback. 
    let queryPagar = supabase.from('contas_pagar').select(`
      id, numero, fornecedor_id, valor_pago, data_vencimento, banco_id, tipo_pagamento_id, observacoes, status_conciliacao, data_conciliacao, extrato_bancario_id,
      fornecedor:fornecedores(nome),
      banco:bancos(nome),
      tipo_pagamento:tipos_pagamento(nome)
    `).in('status', ['Pago', 'PAGO', 'pago']);

    let queryReceber = supabase.from('contas_receber').select(`
      id, numero, cliente_id, valor_recebido, data_vencimento, data_baixa, banco_id, tipo_pagamento_id, observacoes, status_conciliacao, data_conciliacao, extrato_bancario_id,
      cliente:clientes(nome),
      banco:bancos(nome),
      tipo_pagamento:tipos_pagamento(nome)
    `).in('status', ['Recebido', 'RECEBIDO', 'recebido', 'Pago', 'PAGO', 'pago']);

    let queryExtrato = supabase.from('extrato_bancario').select('*');

    if (bancoId && bancoId !== 'TODOS') {
      queryPagar = queryPagar.eq('banco_id', bancoId);
      queryReceber = queryReceber.eq('banco_id', bancoId);
      queryExtrato = queryExtrato.eq('banco_id', bancoId);
    }
    
    // Filter by data_saldo_inicial if available
    if (bankInfo.data_saldo_inicial) {
      queryExtrato = queryExtrato.gte('data_transacao', bankInfo.data_saldo_inicial);
    } else if (dataInicio) {
      queryExtrato = queryExtrato.gte('data_transacao', dataInicio);
    }
    
    if (dataFim) {
      queryExtrato = queryExtrato.lte('data_transacao', dataFim);
    }

    const [pagarRes, receberRes, extratoRes] = await Promise.all([queryPagar, queryReceber, queryExtrato]);

    if (pagarRes.error) {
      console.error("Error fetching contas_pagar:", pagarRes.error);
      throw pagarRes.error;
    }
    if (receberRes.error) {
      console.error("Error fetching contas_receber:", receberRes.error);
      throw receberRes.error;
    }
    if (extratoRes.error) {
      console.error("Error fetching extrato_bancario:", extratoRes.error);
      throw extratoRes.error;
    }

    let normalizedPagar = (pagarRes.data || []).map(item => ({
      ...item,
      tipo_geral: 'PAGAR',
      entidadeNome: item.fornecedor?.nome || 'Não informado',
      valor: parseFloat(item.valor_pago || 0) * -1, 
      data_baixa: item.data_vencimento || item.data_pagamento || new Date().toISOString(), // Fallback
      bancoNome: item.banco?.nome || 'N/A',
      tipoPagamentoNome: item.tipo_pagamento?.nome || 'N/A',
      status_conciliacao: item.status_conciliacao || 'Não Conciliado'
    }));

    let normalizedReceber = (receberRes.data || []).map(item => ({
      ...item,
      tipo_geral: 'RECEBER',
      entidadeNome: item.cliente?.nome || 'Não informado',
      valor: parseFloat(item.valor_recebido || 0),
      data_baixa: item.data_baixa || item.data_vencimento || new Date().toISOString(),
      bancoNome: item.banco?.nome || 'N/A',
      tipoPagamentoNome: item.tipo_pagamento?.nome || 'N/A',
      status_conciliacao: item.status_conciliacao || 'Não Conciliado'
    }));

    let sistemaBaixas = [...normalizedPagar, ...normalizedReceber];
    let ofxTransacoes = extratoRes.data || [];

    // Apply date filtering to sistema baixas
    if (bankInfo.data_saldo_inicial) {
      sistemaBaixas = sistemaBaixas.filter(item => item.data_baixa >= bankInfo.data_saldo_inicial);
    } else if (dataInicio) {
      sistemaBaixas = sistemaBaixas.filter(item => item.data_baixa >= dataInicio);
    }
    
    if (dataFim) {
      sistemaBaixas = sistemaBaixas.filter(item => item.data_baixa <= dataFim);
    }

    if (statusConciliacao && statusConciliacao !== 'TODOS') {
      const isConciliado = statusConciliacao === 'CONCILIADO';
      sistemaBaixas = sistemaBaixas.filter(item => isConciliado ? item.status_conciliacao === 'Conciliado' : item.status_conciliacao !== 'Conciliado');
      ofxTransacoes = ofxTransacoes.filter(item => isConciliado ? item.status_conciliacao === 'Conciliado' : item.status_conciliacao !== 'Conciliado');
    }

    sistemaBaixas.sort((a, b) => new Date(b.data_baixa || 0) - new Date(a.data_baixa || 0));
    ofxTransacoes.sort((a, b) => new Date(b.data_transacao || 0) - new Date(a.data_transacao || 0));

    return {
      sistemaBaixas,
      ofxTransacoes,
      saldoInicial: bankInfo.saldo || 0,
      dataSaldoInicial: bankInfo.data_saldo_inicial || null
    };

  } catch (error) {
    console.error("Erro ao buscar dados de conciliação:", error);
    throw error;
  }
};
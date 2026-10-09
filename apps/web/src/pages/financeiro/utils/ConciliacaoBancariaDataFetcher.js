import { supabase } from '@/lib/customSupabaseClient';
import { buscarTudo } from '@/services/extratoAsaasService';

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
    } else {
      // "Todos os bancos": se a empresa só tem um banco ativo, usa o saldo inicial dele
      const { data: ativos } = await supabase.from('bancos').select('id, saldo, data_saldo_inicial').eq('ativo', true);
      if (ativos?.length === 1) {
        bankInfo = ativos[0];
        bancoId = ativos[0].id;
      }
    }

    // Extrato e baixas da Movimentação podem passar de mil linhas: lê em páginas, com ordem fixa, e filtra o período no servidor.
    const inicioPeriodo = bankInfo.data_saldo_inicial || dataInicio;
    const montarMov = () => {
      let q = supabase.from('movimentacao_baixas').select(`
        id, valor_baixa, data_baixa, banco_id, observacoes, status_conciliacao, data_conciliacao, extrato_bancario_id,
        banco:bancos(nome),
        movimentacao:movimentacao_financeira(tipo, numero_titulo, cliente:clientes(nome), fornecedor:fornecedores(nome))
      `).order('data_baixa').order('id');
      if (bancoId && bancoId !== 'TODOS') q = q.eq('banco_id', bancoId);
      if (inicioPeriodo) q = q.gte('data_baixa', inicioPeriodo);
      if (dataFim) q = q.lte('data_baixa', dataFim);
      return q;
    };
    const montarExtrato = () => {
      let q = supabase.from('extrato_bancario').select('*').order('data_transacao').order('id');
      if (bancoId && bancoId !== 'TODOS') q = q.eq('banco_id', bancoId);
      if (inicioPeriodo) q = q.gte('data_transacao', inicioPeriodo);
      if (dataFim) q = q.lte('data_transacao', dataFim);
      return q;
    };

    const settle = (p) => p.then((data) => ({ data, error: null })).catch((error) => ({ data: null, error }));
    const [extratoRes, movRes] = await Promise.all([settle(buscarTudo(montarExtrato)), settle(buscarTudo(montarMov))]);
    if (movRes.error) {
      console.error("Error fetching movimentacao_baixas:", movRes.error);
      throw movRes.error;
    }

    if (extratoRes.error) {
      console.error("Error fetching extrato_bancario:", extratoRes.error);
      throw extratoRes.error;
    }

    const normalizedMov = (movRes.data || []).map(item => {
      const isPagar = item.movimentacao?.tipo?.toLowerCase() === 'pagar';
      const valor = parseFloat(item.valor_baixa || 0);
      return {
        ...item,
        origem: 'MOV',
        tipo_geral: isPagar ? 'PAGAR' : 'RECEBER',
        numero: item.movimentacao?.numero_titulo,
        entidadeNome: (isPagar ? item.movimentacao?.fornecedor?.nome : item.movimentacao?.cliente?.nome) || 'Não informado',
        valor: isPagar ? -valor : valor,
        data_baixa: item.data_baixa || new Date().toISOString().split('T')[0],
        bancoNome: item.banco?.nome || 'N/A',
        tipoPagamentoNome: 'N/A',
        status_conciliacao: item.status_conciliacao || 'Não Conciliado'
      };
    });

    let sistemaBaixas = [...normalizedMov];
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
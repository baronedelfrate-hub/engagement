import { supabase } from './customSupabaseClient';

export const apuracaoImpostosService = {
  fetchApuracoes: async (filters = {}) => {
    let query = supabase
      .from('apuracao_impostos')
      .select(`
        *,
        users!apuracao_impostos_responsavel_conferencia_id_fkey(nome),
        apuracao_impostos_origem(*)
      `)
      .order('created_at', { ascending: false });

    if (filters.periodo) query = query.eq('periodo_referencia', filters.periodo);
    if (filters.tipo_imposto && filters.tipo_imposto !== 'Todos') query = query.eq('tipo_imposto', filters.tipo_imposto);
    if (filters.status && filters.status !== 'Todos') query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  fetchApuracaoById: async (id) => {
    const { data, error } = await supabase
      .from('apuracao_impostos')
      .select(`
        *,
        users!apuracao_impostos_responsavel_conferencia_id_fkey(nome),
        apuracao_impostos_origem(*),
        apuracao_impostos_historico(*, users(nome))
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Sort historico by date descending
    if (data.apuracao_impostos_historico) {
      data.apuracao_impostos_historico.sort((a, b) => new Date(b.data_mudanca) - new Date(a.data_mudanca));
    }
    
    return data;
  },

  createApuracao: async (data, user) => {
    // Check duplicates
    const { data: existing } = await supabase
      .from('apuracao_impostos')
      .select('id')
      .eq('periodo_referencia', data.periodo_referencia)
      .eq('tipo_imposto', data.tipo_imposto)
      .eq('empresa_id', data.empresa_id);

    if (existing && existing.length > 0) {
      throw new Error(`Já existe uma apuração de ${data.tipo_imposto} para o período ${data.periodo_referencia}.`);
    }

    const { data: apuracao, error } = await supabase
      .from('apuracao_impostos')
      .insert({ ...data, created_by: user?.id })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('apuracao_impostos_historico').insert({
      apuracao_impostos_id: apuracao.id,
      status_anterior: null,
      status_novo: apuracao.status,
      usuario_id: user?.id
    });

    return apuracao;
  },

  updateApuracao: async (id, data, user) => {
    const { data: oldApuracao } = await supabase.from('apuracao_impostos').select('status').eq('id', id).single();

    const { error } = await supabase
      .from('apuracao_impostos')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    if (oldApuracao && oldApuracao.status !== data.status) {
      await supabase.from('apuracao_impostos_historico').insert({
        apuracao_impostos_id: id,
        status_anterior: oldApuracao.status,
        status_novo: data.status,
        usuario_id: user?.id
      });
    }

    return id;
  },

  deleteApuracao: async (id) => {
    const { error } = await supabase.from('apuracao_impostos').delete().eq('id', id);
    if (error) throw error;
  },

  closeApuracao: async (id, user) => {
    return await apuracaoImpostosService.updateApuracao(id, { status: 'Fechado' }, user);
  },

  sendToAccounting: async (id, user) => {
    // Integration logic placeholder
    return await apuracaoImpostosService.updateApuracao(id, { status: 'Enviado à contabilidade' }, user);
  },

  generateFinancialObligation: async (apuracaoData, user) => {
    if (apuracaoData.status === 'Pago') throw new Error('Esta apuração já consta como paga.');
    
    // Check if already generated (simple check by description or origin)
    const descricao = `Imposto ${apuracaoData.tipo_imposto} ref. ${apuracaoData.periodo_referencia}`;
    const { data: existing } = await supabase
      .from('contas_pagar')
      .select('id')
      .eq('observacoes', descricao)
      .eq('company_id', apuracaoData.empresa_id);

    if (existing && existing.length > 0) {
      throw new Error('Obrigação financeira já gerada anteriormente.');
    }

    const { error } = await supabase.from('contas_pagar').insert({
      company_id: apuracaoData.empresa_id,
      numero: `IMP-${apuracaoData.tipo_imposto}-${apuracaoData.periodo_referencia.replace('/','')}`,
      data_emissao: new Date().toISOString().split('T')[0],
      data_vencimento: apuracaoData.vencimento,
      valor_original: apuracaoData.valor_apurado,
      status: 'Pendente',
      observacoes: descricao,
      created_by: user?.id
    });

    if (error) throw error;
    
    // Update status mapping if desired, but we keep it independent or mark a flag
    return true;
  },

  exportReport: async (id, format = 'pdf') => {
    // Mock export logic
    console.log(`Exporting report ${id} as ${format}`);
    return true;
  }
};
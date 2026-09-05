import { supabase } from '@/lib/customSupabaseClient';

export const manifestacaoNFService = {
  // Fetch List
  getManifestacoes: async (filters = {}) => {
    try {
      console.log('[manifestacaoNFService] Fetching manifestacoes...');
      let query = supabase
        .from('notas_manifestacao')
        .select(`
          *,
          empresas (razao_social),
          fornecedores (nome, cnpj)
        `)
        .order('created_at', { ascending: false });

      if (filters.data_inicio) query = query.gte('data_emissao', filters.data_inicio);
      if (filters.data_fim) query = query.lte('data_emissao', filters.data_fim);
      if (filters.fornecedor_id && filters.fornecedor_id !== 'all') query = query.eq('fornecedor_id', filters.fornecedor_id);
      if (filters.chave_acesso) query = query.ilike('chave_acesso', `%${filters.chave_acesso}%`);
      if (filters.status_manifestacao && filters.status_manifestacao !== 'all') query = query.eq('status_manifestacao', filters.status_manifestacao);
      if (filters.situacao_consulta && filters.situacao_consulta !== 'all') query = query.eq('situacao_consulta', filters.situacao_consulta);
      if (filters.importado_entrada !== undefined && filters.importado_entrada !== 'all') {
        query = query.eq('importado_entrada', filters.importado_entrada === 'true');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
       console.error('[manifestacaoNFService] Error fetching list:', error);
       throw error;
    }
  },

  // Get single record
  getById: async (id) => {
    const { data, error } = await supabase
      .from('notas_manifestacao')
      .select(`
        *,
        empresas (razao_social),
        fornecedores (nome, cnpj, endereco, inscricao_estadual)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Get History
  getHistorico: async (id) => {
    const { data, error } = await supabase
      .from('notas_manifestacao_historico')
      .select(`
        *,
        users (nome)
      `)
      .eq('manifestacao_id', id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Actions
  consultarSefaz: async (ids) => {
    // Mocking SEFAZ query
    const { data: { user } } = await supabase.auth.getUser();
    for (const id of ids) {
      const novoSit = Math.random() > 0.3 ? 'XML Disponível' : 'Consultada';
      
      const { error } = await supabase
        .from('notas_manifestacao')
        .update({ situacao_consulta: novoSit, updated_at: new Date().toISOString() })
        .eq('id', id);
        
      if (!error) {
        await supabase.from('notas_manifestacao_historico').insert({
          manifestacao_id: id,
          acao: 'Consulta SEFAZ',
          detalhes: `Situação atualizada para ${novoSit}`,
          usuario_id: user?.id
        });
      }
    }
  },

  manifestar: async (id, status, justificativa = '') => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Auto-update to XML Disponível if Confirmação (mock behavior)
    let extraUpdates = {};
    if (status === 'Confirmação' || status === 'Ciência') extraUpdates.situacao_consulta = 'XML Disponível';

    const { error } = await supabase
      .from('notas_manifestacao')
      .update({ 
        status_manifestacao: status, 
        ...extraUpdates,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) throw error;

    await supabase.from('notas_manifestacao_historico').insert({
      manifestacao_id: id,
      acao: 'Manifestação do Destinatário',
      detalhes: `Manifestação registrada: ${status}${justificativa ? ` - Justificativa: ${justificativa}` : ''}`,
      usuario_id: user?.id
    });
  },

  importarParaEntrada: async (nota) => {
    if (nota.importado_entrada) throw new Error('Esta nota já foi importada para Entrada de NF.');
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Create in notas_entrada
    const { data: nf, error: nfError } = await supabase
      .from('notas_entrada')
      .insert({
        empresa_id: nota.empresa_id,
        fornecedor_id: nota.fornecedor_id,
        cnpj_fornecedor: nota.fornecedor_cnpj || nota.fornecedores?.cnpj,
        numero: nota.numero,
        serie: nota.serie,
        chave_acesso: nota.chave_acesso,
        data_emissao: nota.data_emissao,
        data_entrada: new Date().toISOString().split('T')[0],
        valor_total: nota.valor_total,
        status: 'Conferência',
        created_by: user?.id
      })
      .select()
      .single();

    if (nfError) throw nfError;

    // 2. Update manifestacao record
    const { error: updError } = await supabase
      .from('notas_manifestacao')
      .update({ 
        importado_entrada: true, 
        nota_entrada_id: nf.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', nota.id);

    if (updError) throw updError;

    // 3. Log History
    await supabase.from('notas_manifestacao_historico').insert({
      manifestacao_id: nota.id,
      acao: 'Importação',
      detalhes: `Nota importada para o módulo de Entrada de NF (ID: ${nf.id})`,
      usuario_id: user?.id
    });

    return nf;
  },

  gerarContasPagar: async (nota) => {
    if (nota.integrado_financeiro) throw new Error('Financeiro já integrado.');
    const { data: { user } } = await supabase.auth.getUser();

    const { error: cpError } = await supabase
      .from('contas_pagar')
      .insert({
        company_id: nota.empresa_id,
        fornecedor_id: nota.fornecedor_id,
        numero: `NFM-${nota.numero}`,
        data_emissao: nota.data_emissao,
        data_vencimento: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0], // Mock 30 days
        valor_original: nota.valor_total,
        status: 'Pendente',
        observacoes: `Gerado via Módulo de Manifestação - Chave: ${nota.chave_acesso}`,
        created_by: user?.id
      });

    if (cpError) throw cpError;

    await supabase.from('notas_manifestacao').update({ integrado_financeiro: true }).eq('id', nota.id);
    await supabase.from('notas_manifestacao_historico').insert({
      manifestacao_id: nota.id,
      acao: 'Integração Financeira',
      detalhes: `Conta a Pagar gerada no valor de ${nota.valor_total}`,
      usuario_id: user?.id
    });
  },

  enviarContabilidade: async (nota) => {
    if (nota.integrado_contabil) throw new Error('Contabilidade já enviada.');
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('notas_manifestacao').update({ integrado_contabil: true }).eq('id', nota.id);
    await supabase.from('notas_manifestacao_historico').insert({
      manifestacao_id: nota.id,
      acao: 'Integração Contábil',
      detalhes: 'Documento enviado para o painel da contabilidade.',
      usuario_id: user?.id
    });
  }
};
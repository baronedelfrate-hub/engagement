import { supabase } from '@/lib/customSupabaseClient';

export const nfseServicosService = {
  fetchNfseServicos: async (filters = {}) => {
    let query = supabase
      .from('nfse_servicos')
      .select(`
        *,
        empresas (razao_social, cnpj),
        clientes (nome, cnpj_cpf),
        servicos (nome)
      `)
      .order('created_at', { ascending: false });

    if (filters.data_inicio) query = query.gte('data_emissao', filters.data_inicio);
    if (filters.data_fim) query = query.lte('data_emissao', filters.data_fim);
    if (filters.cliente_id && filters.cliente_id !== 'all') query = query.eq('cliente_id', filters.cliente_id);
    if (filters.servico_id && filters.servico_id !== 'all') query = query.eq('servico_id', filters.servico_id);
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters.integrado_contabil !== undefined && filters.integrado_contabil !== 'all') {
      query = query.eq('integrado_contabil', filters.integrado_contabil === 'true');
    }

    const { data, error } = await query;
    if (error) throw error;
    
    let filteredData = data;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filteredData = data.filter(item => 
        (item.numero && item.numero.toLowerCase().includes(search)) ||
        (item.rps && item.rps.toLowerCase().includes(search)) ||
        (item.clientes?.nome && item.clientes.nome.toLowerCase().includes(search)) ||
        (item.servicos?.nome && item.servicos.nome.toLowerCase().includes(search))
      );
    }
    
    return filteredData;
  },

  fetchNfseServico: async (id) => {
    const { data, error } = await supabase
      .from('nfse_servicos')
      .select(`
        *,
        empresas (razao_social, cnpj, bairro, cidade, estado),
        clientes (nome, cnpj_cpf, bairro, cidade, estado, cep),
        servicos (nome, codigo_servico_lc116),
        condicoes_pagamento (nome)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Use maybeSingle to prevent "Cannot coerce" error when 0 rows exist
    const { data: vinculacoes, error: vincError } = await supabase
      .from('nfse_servicos_vinculacoes')
      .select(`
        *,
        propostas (numero),
        pedidos_venda (numero)
      `)
      .eq('nfse_servico_id', id)
      .maybeSingle();

    if (vincError) {
      console.warn('Notice fetching vinculacoes:', vincError);
    }

    const { data: historico } = await supabase
      .from('nfse_servicos_historico')
      .select('*, users(nome)')
      .eq('nfse_servico_id', id)
      .order('data_mudanca', { ascending: false });

    return { ...data, vinculacoes: vinculacoes || null, historico: historico || [] };
  },

  createNfseServico: async (data, vinculacoes, user) => {
    if (!data.municipio_id) {
       throw new Error('Município de incidência é obrigatório para emissão de NFS-e. O campo está vazio.');
    }
    
    const { data: munExists, error: munError } = await supabase
        .from('fiscal_municipios_ibge')
        .select('id')
        .eq('id', data.municipio_id)
        .maybeSingle();
        
    if (munError || !munExists) {
        throw new Error('Município inválido! Selecione um município válido da lista nacional.');
    }

    const { data: nfse, error } = await supabase
      .from('nfse_servicos')
      .insert({ ...data, created_by: user?.id })
      .select()
      .single();

    if (error) throw error;

    if (vinculacoes && (vinculacoes.contrato_id || vinculacoes.proposta_id || vinculacoes.pedido_venda_id)) {
      await supabase.from('nfse_servicos_vinculacoes').insert({
        nfse_servico_id: nfse.id,
        ...vinculacoes
      });
    }

    await supabase.from('nfse_servicos_historico').insert({
      nfse_servico_id: nfse.id,
      status_anterior: null,
      status_novo: nfse.status,
      usuario_id: user?.id
    });

    return nfse;
  },

  updateNfseServico: async (id, data, vinculacoes, user) => {
    // Only validate municipality if it is being actively updated in the payload
    if ('municipio_id' in data) {
      if (!data.municipio_id) {
         throw new Error('Município de incidência é obrigatório para emissão de NFS-e. O campo está vazio.');
      }
      
      const { data: munExists, error: munError } = await supabase
          .from('fiscal_municipios_ibge')
          .select('id')
          .eq('id', data.municipio_id)
          .maybeSingle();
          
      if (munError || !munExists) {
          throw new Error('Município inválido! Selecione um município válido da lista nacional.');
      }
    }

    const { data: oldNfse } = await supabase.from('nfse_servicos').select('status').eq('id', id).maybeSingle();

    const { error } = await supabase
      .from('nfse_servicos')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    if (vinculacoes) {
      // Use maybeSingle instead of single
      const { data: extVinc } = await supabase.from('nfse_servicos_vinculacoes').select('id').eq('nfse_servico_id', id).maybeSingle();
      
      if (extVinc) {
        await supabase.from('nfse_servicos_vinculacoes').update(vinculacoes).eq('id', extVinc.id);
      } else if (vinculacoes.contrato_id || vinculacoes.proposta_id || vinculacoes.pedido_venda_id) {
        await supabase.from('nfse_servicos_vinculacoes').insert({ nfse_servico_id: id, ...vinculacoes });
      }
    }

    if (oldNfse && oldNfse.status !== data.status && data.status) {
      await supabase.from('nfse_servicos_historico').insert({
        nfse_servico_id: id,
        status_anterior: oldNfse.status,
        status_novo: data.status,
        usuario_id: user?.id
      });
    }

    return id;
  },

  cancelNfseServico: async (id, user) => {
    const { data: oldNfse } = await supabase.from('nfse_servicos').select('status').eq('id', id).maybeSingle();

    const { error } = await supabase
      .from('nfse_servicos')
      .update({ 
        status: 'Cancelada', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) throw error;

    await supabase.from('nfse_servicos_historico').insert({
      nfse_servico_id: id,
      status_anterior: oldNfse?.status || null,
      status_novo: 'Cancelada',
      usuario_id: user?.id
    });
  },

  duplicateNfseServico: async (id, user) => {
    const nfse = await nfseServicosService.fetchNfseServico(id);
    const { id: _, created_at, updated_at, numero, rps, protocolo_emissao, integrado_financeiro, integrado_contabil, historico, vinculacoes, ...rest } = nfse;
    
    const newNfseData = {
      ...rest,
      status: 'Em digitação',
      data_emissao: new Date().toISOString().split('T')[0]
    };
    
    let newVinc = null;
    if (vinculacoes) {
        const { id: __, nfse_servico_id, propostas, pedidos_venda, ...vRest } = vinculacoes;
        newVinc = vRest;
    }

    return await nfseServicosService.createNfseServico(newNfseData, newVinc, user);
  },

  generateContasReceber: async (nfseData, user) => {
    if (nfseData.integrado_financeiro) throw new Error('Financeiro já integrado para esta NFS-e.');

    const dtEmissao = new Date(nfseData.data_emissao);
    const dtVencimento = new Date(dtEmissao.setDate(dtEmissao.getDate() + 30)).toISOString().split('T')[0];

    const { error: crError } = await supabase
      .from('contas_receber')
      .insert({
        company_id: nfseData.empresa_id,
        cliente_id: nfseData.cliente_id,
        numero: `NFSE-${nfseData.numero || nfseData.id.substring(0, 6)}`,
        data_emissao: nfseData.data_emissao,
        data_vencimento: dtVencimento,
        valor_original: nfseData.valor_liquido || nfseData.valor_servico,
        status: 'Pendente',
        observacoes: `Gerado automaticamente da NFS-e ${nfseData.numero || 'S/N'}`,
        created_by: user?.id,
        condicao_pagamento_id: nfseData.condicao_pagamento_id
      });

    if (crError) throw crError;

    await supabase.from('nfse_servicos').update({ integrado_financeiro: true }).eq('id', nfseData.id);
  },

  sendToAccounting: async (nfseData, user) => {
    if (nfseData.integrado_contabil) throw new Error('Esta NFS-e já foi enviada à contabilidade.');
    await supabase.from('nfse_servicos').update({ integrado_contabil: true }).eq('id', nfseData.id);
    await supabase.from('nfse_servicos_historico').insert({
      nfse_servico_id: nfseData.id,
      status_anterior: nfseData.status,
      status_novo: nfseData.status,
      data_mudanca: new Date().toISOString(),
      usuario_id: user?.id
    });
  },

  getNextNfseNumber: async (empresaId) => {
    const { data } = await supabase
      .from('nfse_servicos')
      .select('numero')
      .eq('empresa_id', empresaId)
      .order('numero', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0 && !isNaN(parseInt(data[0].numero))) {
      return (parseInt(data[0].numero) + 1).toString();
    }
    return '1';
  },

  validateNfseData: (data) => {
    const errors = [];
    if (!data.empresa_id) errors.push('Empresa é obrigatória.');
    if (!data.cliente_id) errors.push('Cliente é obrigatório.');
    if (!data.servico_id) errors.push('Serviço é obrigatório.');
    if (!data.municipio_id) errors.push('Município de incidência é obrigatório.');
    if (!data.data_emissao) errors.push('Data de emissão é obrigatória.');
    if (!data.quantidade || data.quantidade <= 0) errors.push('Quantidade inválida.');
    if (!data.valor_servico || data.valor_servico <= 0) errors.push('Valor do serviço inválido.');
    return errors;
  }
};
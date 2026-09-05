import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';

export const nfeService = {
  fetchNfeList: async (filters = {}) => {
    let query = supabase
      .from('nfe_produtos')
      .select(`
        *,
        clientes (nome, cnpj_cpf),
        pedidos_venda (numero)
      `)
      .order('created_at', { ascending: false });

    if (filters.data_inicio) query = query.gte('data_emissao', filters.data_inicio);
    if (filters.data_fim) query = query.lte('data_emissao', filters.data_fim);
    if (filters.cliente_id && filters.cliente_id !== 'all') query = query.eq('cliente_id', filters.cliente_id);
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters.integrado_financeiro !== undefined && filters.integrado_financeiro !== 'all') {
      query = query.eq('integrado_financeiro', filters.integrado_financeiro === 'true');
    }
    if (filters.integrado_contabil !== undefined && filters.integrado_contabil !== 'all') {
      query = query.eq('integrado_contabil', filters.integrado_contabil === 'true');
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  fetchNfeDetail: async (id) => {
    const { data, error } = await supabase
      .from('nfe_produtos')
      .select(`
        *,
        empresas (razao_social, cnpj, endereco, bairro, cidade, estado),
        clientes (nome, cnpj_cpf, endereco, bairro, cidade, estado, cep),
        pedidos_venda (numero),
        condicoes_pagamento (nome),
        tipos_pagamento (nome),
        fornecedores (nome, cnpj)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const { data: itens } = await supabase
      .from('nfe_produtos_itens')
      .select('*, produtos(nome, ncm)')
      .eq('nfe_produto_id', id);

    const { data: historico } = await supabase
      .from('nfe_produtos_historico')
      .select('*, users(nome)')
      .eq('nfe_produto_id', id)
      .order('data_mudanca', { ascending: false });

    return { ...data, itens: itens || [], historico: historico || [] };
  },

  createNfe: async (data, items, user) => {
    // Insert NFE
    const { data: nfe, error: nfeError } = await insertWithCompanyId(
      'nfe_produtos',
      { ...data, created_by: user?.id },
      { user, chain: (query) => query.select().single() }
    );

    if (nfeError) throw nfeError;

    // Insert Items
    if (items && items.length > 0) {
      const itemsPayload = items.map(item => ({
        nfe_produto_id: nfe.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        desconto: item.desconto,
        impostos: item.impostos,
        valor_total: item.valor_total,
        cfop: item.cfop,
        ncm: item.ncm
      }));

      const { error: itemsError } = await insertWithCompanyId('nfe_produtos_itens', itemsPayload, { user });
      if (itemsError) throw itemsError;
    }

    // Insert History
    await insertWithCompanyId('nfe_produtos_historico', {
      nfe_produto_id: nfe.id,
      status_anterior: null,
      status_novo: nfe.status,
      usuario_id: user?.id
    }, { user });

    return nfe;
  },

  updateNfe: async (id, data, items, user) => {
    // Fetch old to check status change
    const { data: oldNfe } = await supabase.from('nfe_produtos').select('status').eq('id', id).single();

    const { error: updError } = await supabase
      .from('nfe_produtos')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updError) throw updError;

    // Replace items
    await supabase.from('nfe_produtos_itens').delete().eq('nfe_produto_id', id);
    if (items && items.length > 0) {
      const itemsPayload = items.map(item => ({
        nfe_produto_id: id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        desconto: item.desconto,
        impostos: item.impostos,
        valor_total: item.valor_total,
        cfop: item.cfop,
        ncm: item.ncm
      }));
      await supabase.from('nfe_produtos_itens').insert(itemsPayload);
    }

    if (oldNfe && oldNfe.status !== data.status) {
      await supabase.from('nfe_produtos_historico').insert({
        nfe_produto_id: id,
        status_anterior: oldNfe.status,
        status_novo: data.status,
        usuario_id: user?.id
      });
    }

    return id;
  },

  cancelNfe: async (id, motivo, user) => {
    const { data: oldNfe } = await supabase.from('nfe_produtos').select('status').eq('id', id).single();

    const { error } = await supabase
      .from('nfe_produtos')
      .update({ 
        status: 'Cancelada', 
        observacoes: `Cancelada. Motivo: ${motivo}`,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) throw error;

    await supabase.from('nfe_produtos_historico').insert({
      nfe_produto_id: id,
      status_anterior: oldNfe.status,
      status_novo: 'Cancelada',
      usuario_id: user?.id
    });
  },
  
  emitirSefaz: async (id, user) => {
    const { data: oldNfe } = await supabase.from('nfe_produtos').select('status').eq('id', id).single();

    // Mock SEFAZ emission
    const { error } = await supabase
      .from('nfe_produtos')
      .update({ 
        status: 'Emitida',
        protocolo: `PROT${Date.now()}`,
        autorizacao: `AUT${Date.now()}`,
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) throw error;

    await supabase.from('nfe_produtos_historico').insert({
      nfe_produto_id: id,
      status_anterior: oldNfe.status,
      status_novo: 'Emitida',
      usuario_id: user?.id
    });
  }
};
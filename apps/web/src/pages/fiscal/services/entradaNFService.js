import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId, upsertWithCompanyId } from '@/lib/companyUtils';
import { montarTituloPagar } from '@/lib/titulosPagar';

export const entradaNFService = {
  // Fetch lists
  getNotasEntrada: async (filters = {}) => {
    try {
      console.log('[entradaNFService] Fetching notas entrada...', filters);
      let query = supabase
        .from('notas_entrada')
        .select(`
          *,
          fornecedores (nome),
          empresas (razao_social)
        `)
        .order('created_at', { ascending: false });

      if (filters.empresa_id) query = query.eq('empresa_id', filters.empresa_id);
      if (filters.fornecedor_id) query = query.eq('fornecedor_id', filters.fornecedor_id);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.integrado_financeiro !== undefined) query = query.eq('integrado_financeiro', filters.integrado_financeiro);
      if (filters.integrado_contabil !== undefined) query = query.eq('integrado_contabil', filters.integrado_contabil);
      
      if (filters.data_inicio) query = query.gte('data_emissao', filters.data_inicio);
      if (filters.data_fim) query = query.lte('data_emissao', filters.data_fim);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[entradaNFService] Error fetching notas:', error);
      throw error;
    }
  },

  getNotaById: async (id) => {
    const { data, error } = await supabase
      .from('notas_entrada')
      .select(`
        *,
        fornecedores (nome, cnpj, endereco),
        empresas (razao_social),
        categorias (nome),
        subcategorias (nome),
        centros_custo (nome),
        condicoes_pagamento (nome),
        tipos_pagamento (nome)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  getHistorico: async (notaId) => {
    const { data, error } = await supabase
      .from('notas_entrada_historico')
      .select(`
        *,
        users:usuario_id (nome)
      `)
      .eq('nota_entrada_id', notaId)
      .order('data_mudanca', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  getArquivos: async (notaId) => {
    const { data, error } = await supabase
      .from('notas_entrada_arquivos')
      .select('*')
      .eq('nota_entrada_id', notaId);
    
    if (error) throw error;
    return data;
  },

  // Save / Update
  saveNota: async (notaData, isUpdate = false) => {
    // Check duplicates if new
    if (!isUpdate) {
      const { data: existing } = await supabase
        .from('notas_entrada')
        .select('id')
        .eq('empresa_id', notaData.empresa_id)
        .eq('numero', notaData.numero)
        .eq('serie', notaData.serie)
        .single();
        
      if (existing) throw new Error('Já existe uma nota com este número e série para esta empresa.');
    }

    // notas_entrada isola por empresa_id (não tem coluna company_id)
    const payload = {
      ...notaData,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await upsertWithCompanyId('notas_entrada', payload, {
      chain: (query) => query.select().single()
    });

    if (error) throw error;

    if (!isUpdate && data?.id) {
      const { error: histError } = await insertWithCompanyId('notas_entrada_historico', {
        nota_entrada_id: data.id,
        status_anterior: null,
        status_novo: data.status || 'Pendente'
      });
      if (histError) console.error('[entradaNFService] Falha ao registrar histórico:', histError);
    }

    return data;
  },

  // Status & History
  updateStatus: async (notaId, novoStatus, usuarioId) => {
    // Get current status
    const { data: nota } = await supabase
      .from('notas_entrada')
      .select('status')
      .eq('id', notaId)
      .single();

    if (!nota) throw new Error('Nota não encontrada');
    const statusAnterior = nota.status;

    if (statusAnterior !== novoStatus) {
      // Update status
      const { error: updateError } = await supabase
        .from('notas_entrada')
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', notaId);
        
      if (updateError) throw updateError;

      // Create history record
      await insertWithCompanyId('notas_entrada_historico', {
        nota_entrada_id: notaId,
        status_anterior: statusAnterior,
        status_novo: novoStatus,
        usuario_id: usuarioId
      });
    }
  },

  // File Upload
  uploadFile: async (notaId, empresaId, file, tipoArquivo) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${empresaId}/${notaId}/${tipoArquivo}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('entrada-nf')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Record in DB
    const { error: dbError } = await insertWithCompanyId('notas_entrada_arquivos', {
      nota_entrada_id: notaId,
      tipo_arquivo: tipoArquivo,
      caminho_arquivo: filePath,
      nome_original: file.name,
      company_id: empresaId
    });

    if (dbError) throw dbError;
    return filePath;
  },

  deleteFile: async (arquivoId, filePath) => {
    await supabase.storage.from('entrada-nf').remove([filePath]);
    await supabase.from('notas_entrada_arquivos').delete().eq('id', arquivoId);
  },

  getFileUrl: async (filePath) => {
    const { data } = supabase.storage.from('entrada-nf').getPublicUrl(filePath);
    return data.publicUrl;
  },

  // Integrations
  createContasPagarFromNota: async (nota) => {
    if (nota.integrado_financeiro) throw new Error('Esta nota já está integrada ao financeiro.');

    // Cria a conta a pagar na Movimentação Financeira (base única do financeiro)
    const { data: cpData, error: cpError } = await supabase
      .from('movimentacao_financeira')
      .insert(montarTituloPagar({
        companyId: nota.empresa_id,
        fornecedorId: nota.fornecedor_id,
        numero: `NF-${nota.numero}`,
        valor: nota.valor_total,
        emissao: nota.data_emissao,
        vencimento: nota.data_vencimento || nota.data_entrada,
        categoriaId: nota.categoria_id,
        subcategoriaId: nota.subcategoria_id,
        centroCustoId: nota.centro_custo_id,
        observacoes: `Gerado automaticamente da NF de Entrada #${nota.numero}`
      }))
      .select()
      .single();
    if (cpError) throw cpError;

    // Update nota status
    await supabase
      .from('notas_entrada')
      .update({ 
        integrado_financeiro: true, 
        status: 'Integrada',
        updated_at: new Date().toISOString()
      })
      .eq('id', nota.id);

    // Record history
    await insertWithCompanyId('notas_entrada_historico', {
      nota_entrada_id: nota.id,
      status_anterior: nota.status,
      status_novo: 'Integrada'
    });

    return cpData;
  },

  findMatchingProvisoes: async (fornecedorId, valor, dataEmissao) => {
    const v = parseFloat(valor);
    const minVal = v * 0.9;
    const maxVal = v * 1.1;

    // provisões = títulos a pagar pendentes que ainda não vieram de uma NF (numero_titulo "NF-...")
    const { data, error } = await supabase
      .from('movimentacao_financeira')
      .select('*')
      .eq('tipo', 'pagar')
      .eq('fornecedor_id', fornecedorId)
      .eq('status', 'pendente')
      .gte('valor_total', minVal)
      .lte('valor_total', maxVal)
      .not('numero_titulo', 'like', 'NF-%');

    if (error) throw error;
    return (data || []).map((p) => ({ ...p, valor_original: p.valor_total, numero: p.numero_titulo }));
  },

  replaceProvisao: async (provisaoId, nota) => {
    if (nota.integrado_financeiro) throw new Error('Esta nota já está integrada ao financeiro.');

    const { error: cpError } = await supabase
      .from('movimentacao_financeira')
      .update({
        valor_total: nota.valor_total,
        numero_titulo: `NF-${nota.numero}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', provisaoId);

    if (cpError) throw cpError;

    await supabase
      .from('notas_entrada')
      .update({ 
        integrado_financeiro: true, 
        status: 'Integrada',
        updated_at: new Date().toISOString()
      })
      .eq('id', nota.id);

    await insertWithCompanyId('notas_entrada_historico', {
      nota_entrada_id: nota.id,
      status_anterior: nota.status,
      status_novo: 'Integrada'
    });
  },

  sendToContabilidade: async (nota) => {
    if (nota.integrado_contabil) throw new Error('Esta nota já foi enviada à contabilidade.');

    await supabase
      .from('notas_entrada')
      .update({ 
        integrado_contabil: true, 
        status: 'Enviada à contabilidade',
        updated_at: new Date().toISOString()
      })
      .eq('id', nota.id);

    await insertWithCompanyId('notas_entrada_historico', {
      nota_entrada_id: nota.id,
      status_anterior: nota.status,
      status_novo: 'Enviada à contabilidade'
    });
  }
};
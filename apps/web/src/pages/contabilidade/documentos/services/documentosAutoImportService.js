import { supabase } from '@/lib/customSupabaseClient';

export const documentosAutoImportService = {
  
  async createHistorico(documentoId, acao, observacoes = '') {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('documentos_historico').insert([{
      documento_id: documentoId,
      acao,
      status_novo: 'Pendente',
      usuario_id: user?.id,
      observacoes
    }]);
  },

  async importNFEntrada(empresaId, competencia) {
    try {
      const [year, month] = competencia.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const { data: notas, error } = await supabase
        .from('notas_entrada')
        .select('*')
        .eq('empresa_id', empresaId)
        .gte('data_entrada', startDate)
        .lte('data_entrada', endDate)
        .eq('integrado_contabil', false);

      if (error) throw error;
      if (!notas || notas.length === 0) return 0;

      let imported = 0;
      for (const nf of notas) {
        // Check if already exists by numero and origem
        const { data: exists } = await supabase.from('documentos_contabilidade')
          .select('id').eq('numero', nf.numero).eq('origem', 'notas_entrada').single();
        
        if (!exists) {
          const { data: doc } = await supabase.from('documentos_contabilidade').insert([{
            empresa_id: empresaId,
            tipo: 'NF entrada',
            origem: 'notas_entrada',
            numero: nf.numero,
            descricao: `NF Entrada ${nf.numero} - ${nf.fornecedor_id ? 'Fornecedor' : ''}`,
            competencia,
            arquivo_url: nf.xml_file_path || nf.pdf_file_path,
            data_inclusao: new Date().toISOString().split('T')[0],
            status: 'Pendente',
            observacoes: 'Importado automaticamente do Fiscal'
          }]).select().single();

          if (doc) {
            await this.createHistorico(doc.id, 'Adicionado', 'Importação automática NF Entrada');
            await supabase.from('notas_entrada').update({ integrado_contabil: true }).eq('id', nf.id);
            imported++;
          }
        }
      }
      return imported;
    } catch (err) {
      console.error('Error importing NF Entrada:', err);
      return 0;
    }
  },

  async importNFSaida(empresaId, competencia) {
    try {
      const [year, month] = competencia.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const { data: notas, error } = await supabase
        .from('nfe_produtos')
        .select('*')
        .eq('empresa_id', empresaId)
        .gte('data_emissao', startDate)
        .lte('data_emissao', endDate)
        .eq('integrado_contabil', false)
        .neq('status', 'Cancelada');

      if (error) throw error;
      if (!notas || notas.length === 0) return 0;

      let imported = 0;
      for (const nf of notas) {
        const { data: exists } = await supabase.from('documentos_contabilidade')
          .select('id').eq('numero', nf.numero).eq('origem', 'nfe_produtos').single();
        
        if (!exists) {
          const { data: doc } = await supabase.from('documentos_contabilidade').insert([{
            empresa_id: empresaId,
            tipo: 'NF saída',
            origem: 'nfe_produtos',
            numero: nf.numero,
            descricao: `NF Saída ${nf.numero} - Venda de Produtos`,
            competencia,
            arquivo_url: nf.xml_file_path || nf.danfe_file_path,
            data_inclusao: new Date().toISOString().split('T')[0],
            status: 'Pendente',
            observacoes: 'Importado automaticamente do Fiscal'
          }]).select().single();

          if (doc) {
            await this.createHistorico(doc.id, 'Adicionado', 'Importação automática NF Saída');
            await supabase.from('nfe_produtos').update({ integrado_contabil: true }).eq('id', nf.id);
            imported++;
          }
        }
      }
      return imported;
    } catch (err) {
      console.error('Error importing NF Saída:', err);
      return 0;
    }
  },

  async importImpostos(empresaId, competencia) {
    try {
      const { data: impostos, error } = await supabase
        .from('apuracao_impostos')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('periodo_referencia', competencia);

      if (error) throw error;
      if (!impostos || impostos.length === 0) return 0;

      let imported = 0;
      for (const imp of impostos) {
        const desc = `Apuração ${imp.tipo_imposto} - Ref: ${imp.periodo_referencia}`;
        const { data: exists } = await supabase.from('documentos_contabilidade')
          .select('id').eq('origem', 'apuracao_impostos').eq('descricao', desc).single();
        
        if (!exists) {
          const { data: doc } = await supabase.from('documentos_contabilidade').insert([{
            empresa_id: empresaId,
            tipo: 'Imposto',
            origem: 'apuracao_impostos',
            descricao: desc,
            competencia,
            data_inclusao: new Date().toISOString().split('T')[0],
            status: 'Pendente',
            observacoes: 'Importado automaticamente da Apuração'
          }]).select().single();

          if (doc) {
            await this.createHistorico(doc.id, 'Adicionado', 'Importação automática Apuração de Imposto');
            imported++;
          }
        }
      }
      return imported;
    } catch (err) {
      console.error('Error importing Impostos:', err);
      return 0;
    }
  },

  async syncAllDocuments(empresaId, competencia) {
    const results = { nfEntrada: 0, nfSaida: 0, impostos: 0, error: null };
    try {
      results.nfEntrada = await this.importNFEntrada(empresaId, competencia);
      results.nfSaida = await this.importNFSaida(empresaId, competencia);
      results.impostos = await this.importImpostos(empresaId, competencia);
      return results;
    } catch (err) {
      console.error('Sync error:', err);
      results.error = err.message;
      return results;
    }
  }
};
import { supabase } from './customSupabaseClient';
import { NotaFiscalLogger } from './notaFiscalLogger';

export const NotaFiscalInsertionService = {
  async processInvoice(data, fornecedorId) {
    NotaFiscalLogger.info('DB_INSERTION_START', { numero: data.numero, fornecedorId });
    
    try {
      if (!fornecedorId) throw new Error('fornecedor_id é obrigatório para inserção.');
      if (!data.numero) throw new Error('Número da nota é obrigatório.');
      
      // 1. Insert Contas a Pagar
      const contaPagarData = {
        numero: data.numero,
        fornecedor_id: fornecedorId,
        valor_original: data.valor_total,
        data_emissao: data.data_emissao ? data.data_emissao.split('T')[0] : new Date().toISOString().split('T')[0],
        data_vencimento: data.data_vencimento ? data.data_vencimento.split('T')[0] : new Date().toISOString().split('T')[0],
        status: 'Pendente',
        observacoes: `Importado via XML: NFe ${data.numero} - Série ${data.serie}`
      };

      const { data: cpResult, error: cpError } = await supabase
        .from('contas_pagar')
        .insert([contaPagarData])
        .select()
        .single();

      if (cpError) {
        NotaFiscalLogger.error('DB_INSERTION_CP_ERROR', { error: cpError });
        throw new Error(`Falha ao criar Conta a Pagar: ${cpError.message}`);
      }

      // 2. Insert Entrada Estoque
      const entradasEstoqueData = data.itens.map(item => ({
        numero: data.numero,
        referencia: data.numero,
        tipo_movimento: 'Entrada',
        data_entrada: new Date().toISOString().split('T')[0],
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        status: 'Concluído',
        observacoes: `Item: ${item.descricao} (${item.codigo})`
      }));

      let eeResult = [];
      if (entradasEstoqueData.length > 0) {
        const { data: eeData, error: eeError } = await supabase
          .from('entradas_estoque')
          .insert(entradasEstoqueData)
          .select();
          
        if (eeError) {
          NotaFiscalLogger.error('DB_INSERTION_EE_ERROR', { error: eeError });
          throw new Error(`Falha ao criar Entrada de Estoque: ${eeError.message}`);
        }
        eeResult = eeData;
      }

      NotaFiscalLogger.info('DB_INSERTION_SUCCESS', {
        conta_pagar_id: cpResult.id,
        entradas_estoque_count: eeResult.length
      });

      return {
        success: true,
        conta_pagar: cpResult,
        entradas_estoque: eeResult
      };

    } catch (error) {
      NotaFiscalLogger.error('DB_INSERTION_FAILURE', { error: error.message });
      throw error;
    }
  }
};
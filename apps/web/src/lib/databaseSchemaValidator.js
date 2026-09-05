import { supabase } from './customSupabaseClient';
import { NotaFiscalLogger } from './notaFiscalLogger';

export const DatabaseSchemaValidator = {
  async validateSchemas() {
    NotaFiscalLogger.info('SCHEMA_VALIDATION_START', {});
    const errors = [];

    try {
      // 1. Check contas_pagar
      const { error: errorCP } = await supabase
        .from('contas_pagar')
        .select('numero, fornecedor_id, valor_original, data_vencimento, status')
        .limit(1);
      
      if (errorCP) {
        errors.push(`Erro na tabela contas_pagar: ${errorCP.message}`);
        NotaFiscalLogger.error('SCHEMA_VALIDATION_ERROR', { table: 'contas_pagar', error: errorCP });
      }

      // 2. Check entradas_estoque
      const { error: errorEE } = await supabase
        .from('entradas_estoque')
        .select('quantidade, valor_unitario, data_entrada, tipo_movimento, referencia')
        .limit(1);

      if (errorEE) {
        errors.push(`Erro na tabela entradas_estoque: ${errorEE.message}`);
        NotaFiscalLogger.error('SCHEMA_VALIDATION_ERROR', { table: 'entradas_estoque', error: errorEE });
      }

      // 3. Test insert permission (Contas Pagar) - simulate dry run or check user
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        errors.push('Usuário não autenticado. Sem permissão de INSERT.');
      }

      if (errors.length === 0) {
        NotaFiscalLogger.info('SCHEMA_VALIDATION_SUCCESS', { status: 'All required schemas and columns exist.' });
        return { valid: true };
      } else {
        return { valid: false, errors };
      }

    } catch (e) {
      NotaFiscalLogger.error('SCHEMA_VALIDATION_EXCEPTION', { error: e.message });
      return { valid: false, errors: [e.message] };
    }
  }
};
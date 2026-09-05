import { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useConciliacao = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const matchTransactions = async (systemRecord, ofxRecord) => {
    setLoading(true);
    try {
      const table = systemRecord.tipo_geral === 'PAGAR' ? 'contas_pagar' : 'contas_receber';
      const dataConciliacao = new Date().toISOString().split('T')[0];

      // 1. Update system record
      const { error: sysError } = await supabase
        .from(table)
        .update({
          status_conciliacao: 'Conciliado',
          data_conciliacao: dataConciliacao,
          extrato_bancario_id: ofxRecord.id
        })
        .eq('id', systemRecord.id);
      
      if (sysError) throw sysError;

      // 2. Update OFX record
      const { error: ofxError } = await supabase
        .from('extrato_bancario')
        .update({
          status_conciliacao: 'Conciliado',
          conta_sistema_id: systemRecord.id,
          tipo_conta_sistema: systemRecord.tipo_geral
        })
        .eq('id', ofxRecord.id);

      if (ofxError) throw ofxError;
      
      toast({ title: 'Sucesso', description: 'Transações conciliadas com sucesso.' });
      return true;
    } catch (error) {
      console.error('Erro ao conciliar:', error);
      toast({ title: 'Erro', description: 'Falha ao conciliar: ' + error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unmatchTransactions = async (systemRecord, ofxRecord) => {
    setLoading(true);
    try {
      const table = systemRecord.tipo_geral === 'PAGAR' ? 'contas_pagar' : 'contas_receber';

      const { error: sysError } = await supabase
        .from(table)
        .update({
          status_conciliacao: 'Não Conciliado',
          data_conciliacao: null,
          extrato_bancario_id: null
        })
        .eq('id', systemRecord.id);

      if (sysError) throw sysError;

      const { error: ofxError } = await supabase
        .from('extrato_bancario')
        .update({
          status_conciliacao: 'Não Conciliado',
          conta_sistema_id: null,
          tipo_conta_sistema: null
        })
        .eq('id', ofxRecord.id);

      if (ofxError) throw ofxError;
      
      toast({ title: 'Sucesso', description: 'Conciliação desfeita com sucesso.' });
      return true;
    } catch (error) {
      console.error('Erro ao desfazer conciliação:', error);
      toast({ title: 'Erro', description: 'Falha ao desfazer conciliação: ' + error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    matchTransactions,
    unmatchTransactions,
    loading
  };
};
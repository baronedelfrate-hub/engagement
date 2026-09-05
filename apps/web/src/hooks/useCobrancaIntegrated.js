import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { calculatePhaseFromDueDate } from '@/lib/cobrancaService';

export const useCobrancaIntegrated = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchContasReceberForCobranca = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      // Removed numero_parcelas and parcela_atual from selection as requested
      let query = supabase
        .from('contas_receber')
        .select(`
          id,
          numero,
          cliente_id,
          valor_original,
          valor_recebido,
          data_vencimento,
          status_cobranca,
          data_baixa,
          observacoes_cobranca,
          created_at,
          updated_at,
          cliente:clientes(id, nome, email, telefone),
          banco:bancos(id, nome),
          categoria:categorias(id, nome),
          subcategoria:subcategorias(id, nome),
          centro_custo:centros_custo(id, nome),
          tipo_pagamento:tipos_pagamento(id, nome),
          condicao_pagamento:condicoes_pagamento(id, nome),
          tipo_documento:tipos_documento(id, nome),
          origem:origens(id, nome)
        `)
        .or('status_cobranca.eq.em_cobranca,status_cobranca.eq.nao_iniciada,status_cobranca.eq.recuperado')
        .order('data_vencimento', { ascending: true });

      if (filters.clienteId && filters.clienteId !== 'ALL') {
        query = query.eq('cliente_id', filters.clienteId);
      }
      
      const { data, error: err } = await query;
      if (err) throw err;

      const processed = data.map(item => ({
        ...item,
        ...calculatePhaseFromDueDate(item.data_vencimento, item.status_cobranca, item.data_baixa)
      }));

      return processed;
    } catch (err) {
      console.error("Error fetching cobranca data:", err);
      setError(err.message);
      toast({ title: 'Erro', description: 'Falha ao carregar dados de cobrança.', variant: 'destructive' });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateStatusCobranca = async (id, novoStatus, dadosExtras = {}) => {
    try {
      const updates = { 
        status_cobranca: novoStatus,
        updated_at: new Date(),
        ...dadosExtras
      };

      const { error } = await supabase
        .from('contas_receber')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      return true;
    } catch (err) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const markAsRecovered = async (id, valorRecebido, dataBaixa) => {
    return updateStatusCobranca(id, 'recuperado', {
      valor_recebido: valorRecebido,
      data_baixa: dataBaixa || new Date(),
      status: 'Pago'
    });
  };

  return {
    loading,
    error,
    fetchContasReceberForCobranca,
    updateStatusCobranca,
    markAsRecovered
  };
};
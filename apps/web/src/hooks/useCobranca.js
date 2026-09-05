import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { updateAllCobrancaPhases as updateAllPhasesService } from '@/lib/cobrancaService';

export const useCobranca = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllCobranca = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      let query = supabase
        .from('cobranca')
        .select(`
          id, contas_receber_id, cliente_id, valor, data_vencimento, fase, responsavel_id, observacoes, ultima_acao, status, created_at, updated_at,
          cliente:clientes(id, nome, email, telefone),
          responsavel:users(id, nome, email),
          historico:cobranca_historico(
            id, acao, created_at, usuario:users(id, nome)
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
      if (filters.clienteId && filters.clienteId !== 'ALL') query = query.eq('cliente_id', filters.clienteId);
      if (filters.responsavelId && filters.responsavelId !== 'ALL') query = query.eq('responsavel_id', filters.responsavelId);
      if (filters.dataInicio) query = query.gte('data_vencimento', filters.dataInicio);
      if (filters.dataFim) query = query.lte('data_vencimento', filters.dataFim);

      const { data, error: err } = await query;
      if (err) throw err;
      
      let filteredData = data;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = data.filter(item => item.cliente?.nome?.toLowerCase().includes(searchLower));
      }

      return filteredData;
    } catch (err) {
      setError(err.message);
      toast({ title: 'Erro', description: 'Erro ao carregar cobranças: ' + err.message, variant: 'destructive' });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateAllPhases = async () => {
    try {
      const result = await updateAllPhasesService();
      if (result.updated_count > 0) {
        toast({ title: 'Atualização Automática', description: `${result.updated_count} títulos movidos de fase.` });
      }
      return result;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const fetchCobrancaByFase = useCallback(async (fase) => {
     return fetchAllCobranca({ status: 'ativo', fase });
  }, [fetchAllCobranca]);

  const createCobranca = async (data) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userProfile = await supabase.from('users').select('company_id').eq('id', user.id).single();
      const company_id = userProfile.data?.company_id;

      const { data: newRecord, error } = await supabase
        .from('cobranca')
        .insert({ ...data, company_id, responsavel_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      
      await addCobrancaHistorico(newRecord.id, 'Cobrança criada', user.id);
      
      toast({ title: 'Sucesso', description: 'Cobrança criada com sucesso.' });
      return newRecord;
    } catch (err) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateCobranca = async (id, data) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('cobranca')
        .update({ ...data, updated_at: new Date() })
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Atualizado', description: 'Registro atualizado.' });
      return true;
    } catch (err) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addCobrancaHistorico = async (cobrancaId, acao, usuarioId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userProfile = await supabase.from('users').select('company_id').eq('id', user.id).single();
      const company_id = userProfile.data?.company_id;

      await supabase.from('cobranca_historico').insert({
        cobranca_id: cobrancaId,
        acao,
        usuario_id: usuarioId || user.id,
        company_id
      });
    } catch (e) {
      console.error('Falha ao logar historico', e);
    }
  };

  const deleteCobranca = async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('cobranca').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Excluído', description: 'Registro excluído com sucesso.' });
      return true;
    } catch (err) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchAllCobranca,
    fetchCobrancaByFase,
    createCobranca,
    updateCobranca,
    deleteCobranca,
    addCobrancaHistorico,
    updateAllPhases
  };
};
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export function useConciliacoesContabeis() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchConciliacoes = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      let query = supabase
        .from('conciliacoes_contabeis')
        .select(`
          *,
          empresa:empresas(nome_fantasia, razao_social),
          responsavel:users!conciliacoes_contabeis_responsavel_id_fkey(nome)
        `)
        .order('created_at', { ascending: false });

      if (filters.empresa_id && filters.empresa_id !== 'all') {
        query = query.eq('empresa_id', filters.empresa_id);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching conciliações:', error);
      toast({ title: 'Erro', description: 'Falha ao buscar conciliações.', variant: 'destructive' });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchConciliacaoById = useCallback(async (id) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conciliacoes_contabeis')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching conciliação:', error);
      toast({ title: 'Erro', description: 'Falha ao buscar conciliação.', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createConciliacao = useCallback(async (data) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('conciliacoes_contabeis').insert([data]);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Conciliação criada.' });
      return true;
    } catch (error) {
      console.error('Error creating conciliação:', error);
      toast({ title: 'Erro', description: 'Falha ao criar conciliação.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateConciliacao = useCallback(async (id, data) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('conciliacoes_contabeis').update(data).eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Conciliação atualizada.' });
      return true;
    } catch (error) {
      console.error('Error updating conciliação:', error);
      toast({ title: 'Erro', description: 'Falha ao atualizar conciliação.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteConciliacao = useCallback(async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('conciliacoes_contabeis').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Conciliação excluída.' });
      return true;
    } catch (error) {
      console.error('Error deleting conciliação:', error);
      toast({ title: 'Erro', description: 'Falha ao excluir conciliação.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    fetchConciliacoes,
    fetchConciliacaoById,
    createConciliacao,
    updateConciliacao,
    deleteConciliacao,
  };
}

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useProjectos = () => {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchProjectos = useCallback(async (companyId) => {
    setLoading(true);
    setError(null);

    if (!companyId) {
      setError('Nenhuma empresa associada ao seu usuário.');
      setProjetos([]);
      setLoading(false);
      return [];
    }

    try {
      const { data, error: err } = await supabase
        .from('projetos')
        .select(`
          *,
          cliente:clientes(nome)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (err) throw err;

      setProjetos(data || []);
      return data || [];
    } catch (err) {
      console.error('❌ [useProjectos] Exceção capturada ao buscar projetos:', err);
      setError(err.message);
      toast({ variant: 'destructive', title: 'Erro na Busca', description: err.message || 'Erro ao carregar projetos.' });
      setProjetos([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteProjeto = async (id, companyId) => {
    if (!companyId) return { success: false, error: new Error('Empresa não identificada.') };
    setLoading(true);
    try {
      const { error: err } = await supabase.from('projetos').delete().eq('id', id).eq('company_id', companyId);
      if (err) throw err;

      toast({ title: 'Sucesso', description: 'Projeto excluído com sucesso!' });
      fetchProjectos(companyId);
      return { success: true };
    } catch (err) {
      console.error('❌ [useProjectos] Erro ao excluir projeto:', err);
      toast({ variant: 'destructive', title: 'Erro', description: err.message || 'Erro ao excluir projeto.' });
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  return {
    projetos,
    loading,
    error,
    fetchProjectos,
    refetch: fetchProjectos,
    deleteProjeto
  };
};
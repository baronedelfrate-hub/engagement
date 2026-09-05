import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useProjectos = () => {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchProjectos = useCallback(async (companyId) => {
    console.log(`🔍 [useProjectos] fetchProjectos iniciado. company_id recebido:`, companyId);
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('projetos')
        .select(`
          *,
          cliente:clientes(nome)
        `)
        .order('created_at', { ascending: false });

      if (companyId) {
          console.log(`📡 [useProjectos] Aplicando filtro .eq('company_id', '${companyId}')`);
          query = query.eq('company_id', companyId);
      } else {
          console.warn(`⚠️ [useProjectos] company_id está vazio! Buscando TODOS os projetos (Fallback inseguro).`);
      }

      console.log(`🔄 [useProjectos] Executando query no Supabase...`);
      const { data, error: err } = await query;

      if (err) {
          console.error('❌ [useProjectos] Erro retornado pelo Supabase:', err);
          throw err;
      }
      
      console.log(`✅ [useProjectos] Sucesso! Projetos encontrados: ${data?.length || 0}`, data);
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
    setLoading(true);
    try {
      const { error: err } = await supabase.from('projetos').delete().eq('id', id);
      if (err) throw err;
      
      toast({ title: 'Sucesso', description: 'Projeto excluído com sucesso!' });
      if (companyId) fetchProjectos(companyId);
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
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { calculatePhaseStatus } from '@/lib/bpoE5StatusCalculator';

export function useClienteFases(cliente_id) {
  const [fases, setFases] = useState([]);
  const [arquivos, setArquivos] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchFases = useCallback(async () => {
    if (!cliente_id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const { data: fasesData, error: fasesError } = await supabase
        .from('cliente_fases')
        .select('*')
        .eq('cliente_id', cliente_id)
        .order('fase');

      if (fasesError) throw fasesError;

      let arquivosMap = {};
      if (fasesData && fasesData.length > 0) {
        const { data: arquivosData, error: arquivosError } = await supabase
          .from('cliente_fases_arquivos')
          .select('*')
          .in('cliente_fase_id', fasesData.map(f => f.id));

        if (arquivosError) throw arquivosError;
        
        arquivosData?.forEach(arq => {
          if (!arquivosMap[arq.cliente_fase_id]) arquivosMap[arq.cliente_fase_id] = [];
          arquivosMap[arq.cliente_fase_id].push(arq);
        });
      }

      setFases(fasesData || []);
      setArquivos(arquivosMap);
    } catch (err) {
      console.error('[useClienteFases] Erro ao carregar dados:', err);
      setError(err);
      toast({ title: "Erro ao carregar dados", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [cliente_id, toast]);

  useEffect(() => {
    fetchFases();

    if (!cliente_id) return;

    const channel = supabase.channel('cliente_fases_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cliente_fases', filter: `cliente_id=eq.${cliente_id}` }, fetchFases)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cliente_fases_arquivos' }, fetchFases)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cliente_id, fetchFases]);

  const updateFase = async (fase_id, dados) => {
    try {
      const currentArquivos = arquivos[fase_id] || [];
      const newStatus = calculatePhaseStatus(dados.fase, dados, currentArquivos);
      
      const payload = {
        ...dados,
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'Concluído' && !dados.data_conclusao) {
        payload.data_conclusao = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('cliente_fases')
        .update(payload)
        .eq('id', fase_id);

      if (updateError) throw updateError;
      
      console.log('[useClienteFases] Fase salva no Supabase com sucesso. Status:', newStatus);
      return true;
    } catch (err) {
      console.error('[useClienteFases] Erro ao salvar fase:', err);
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
      return false;
    }
  };

  const uploadArquivo = async (fase_id, file, tipo_arquivo) => {
    try {
      const faseData = fases.find(f => f.id === fase_id);
      if (!faseData) throw new Error("Fase não encontrada");

      const fileExt = file.name.split('.').pop();
      const filePath = `${cliente_id}/${faseData.fase}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('cliente_fases')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('cliente_fases').getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('cliente_fases_arquivos')
        .insert({
          cliente_fase_id: fase_id,
          tipo_arquivo,
          url_arquivo: urlData.publicUrl,
          nome_arquivo: file.name,
          tamanho: file.size
        });

      if (dbError) throw dbError;
      
      await updateFase(fase_id, faseData);
      toast({ title: "Upload Concluído", description: `Arquivo ${file.name} enviado.` });
      return true;
    } catch (err) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
      return false;
    }
  };

  const deletarArquivo = async (arquivo_id, url_arquivo, fase_id) => {
    try {
      const filePath = url_arquivo.split('/cliente_fases/')[1];
      if (filePath) {
        await supabase.storage.from('cliente_fases').remove([filePath]);
      }

      const { error: delError } = await supabase
        .from('cliente_fases_arquivos')
        .delete()
        .eq('id', arquivo_id);

      if (delError) throw delError;

      const faseData = fases.find(f => f.id === fase_id);
      if (faseData) await updateFase(fase_id, faseData);

      toast({ title: "Arquivo removido", description: "O arquivo foi excluído." });
      return true;
    } catch (err) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
      return false;
    }
  };

  const initPhasesIfNeeded = async () => {
    if (loading || fases.length > 0 || !cliente_id) return;
    
    const initialFases = ['B1', 'B2', 'B3', 'B4', 'B5'].map(fase => ({
      cliente_id,
      fase,
      status: 'Pendente',
      dados_dinamicos: {}
    }));

    try {
      const { error: initError } = await supabase.from('cliente_fases').insert(initialFases);
      if (initError) throw initError;
      await fetchFases();
    } catch (err) {
      toast({ title: "Erro na Inicialização", description: err.message, variant: "destructive" });
    }
  };

  return { fases, arquivos, loading, error, updateFase, uploadArquivo, deletarArquivo, initPhasesIfNeeded };
}
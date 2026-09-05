import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export function useImplantacaoChecklist(clienteFasesId) {
  const [checklist, setChecklist] = useState({
    item_1_checked: false,
    item_2_checked: false,
    item_3_checked: false,
    item_4_checked: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const timerRef = useRef(null);

  const fetchChecklist = useCallback(async () => {
    if (!clienteFasesId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cliente_fases_implantacao_checklist')
        .select('*')
        .eq('cliente_fases_id', clienteFasesId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setChecklist({
          item_1_checked: data.item_1_checked || false,
          item_2_checked: data.item_2_checked || false,
          item_3_checked: data.item_3_checked || false,
          item_4_checked: data.item_4_checked || false,
        });
      }
    } catch (error) {
      console.error('[Checklist] Error fetching checklist:', error);
      toast({ title: "Erro", description: "Não foi possível carregar o checklist.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [clienteFasesId, toast]);

  useEffect(() => {
    fetchChecklist();
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchChecklist]);

  const updateChecklistItem = (itemKey, value) => {
    console.log(`[Checklist] Toggling ${itemKey} to ${value}`);
    setChecklist(prev => {
      const newState = { ...prev, [itemKey]: value };
      debouncedSave(newState);
      return newState;
    });
  };

  const debouncedSave = (stateToSave) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from('cliente_fases_implantacao_checklist')
          .upsert({
            cliente_fases_id: clienteFasesId,
            ...stateToSave,
            data_atualizacao: new Date().toISOString(),
            user_id: userData?.user?.id || null
          }, { onConflict: 'cliente_fases_id' });

        if (error) throw error;
        console.log('[Checklist] Save completed successfully.');
      } catch (error) {
        console.error('[Checklist] Error saving checklist:', error);
        toast({ title: "Erro ao salvar", description: "Falha ao salvar checklist automático.", variant: "destructive" });
      }
    }, 500);
  };

  return { checklist, updateChecklistItem, isLoading, fetchChecklist };
}
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export function useCombinedDiagnosis(faseId) {
  const [formData, setFormData] = useState({ bloco01: {}, bloco02: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  const { toast } = useToast();
  const autoSaveTimeoutRef = useRef(null);

  const TOTAL_FIELDS_ESTIMATE = 68; // B1 + B2 fields

  const calculateProgress = useCallback((data) => {
    if (!data) return 0;
    let filledFields = 0;
    const countFilled = (obj) => {
      if (!obj) return;
      Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (Array.isArray(val) && val.length > 0) filledFields++;
        else if (typeof val === 'string' && val.trim().length > 0) filledFields++;
        else if (typeof val === 'boolean') filledFields++;
        else if (typeof val === 'number') filledFields++;
      });
    };

    countFilled(data.bloco01);
    countFilled(data.bloco02);
    
    return Math.min(100, Math.round((filledFields / TOTAL_FIELDS_ESTIMATE) * 100));
  }, []);

  const loadData = useCallback(async () => {
    if (!faseId) return;
    setIsLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('cliente_fases')
        .select('dados_dinamicos, status')
        .eq('id', faseId)
        .single();

      if (fetchError) throw fetchError;
      
      const loadedData = data?.dados_dinamicos || {};
      const structuredData = {
        bloco01: loadedData.bloco01 || {},
        bloco02: loadedData.bloco02 || {}
      };
      
      setFormData(structuredData);
      setProgress(calculateProgress(structuredData));
    } catch (err) {
      console.error('[useCombinedDiagnosis] Error loading data:', err);
      setError(err);
      toast({ title: "Erro ao carregar", description: "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [faseId, toast, calculateProgress]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateStatusIfNeeded = async () => {
    try {
      const { data } = await supabase
        .from('cliente_fases')
        .select('status')
        .eq('id', faseId)
        .single();
        
      if (data && data.status === 'Pendente') {
        await supabase
          .from('cliente_fases')
          .update({ status: 'Em andamento' })
          .eq('id', faseId);
      }
    } catch (err) {
      console.error('[useCombinedDiagnosis] Failed to update status:', err);
    }
  };

  const handleSave = async (dataToSave = formData, showToast = false) => {
    if (!faseId) return false;
    
    try {
      const { error: saveError } = await supabase
        .from('cliente_fases')
        .update({ 
          dados_dinamicos: dataToSave,
          updated_at: new Date().toISOString()
        })
        .eq('id', faseId);

      if (saveError) throw saveError;
      
      console.log('[ClienteFasesModal] Dados salvos - Todas as abas');
      
      if (showToast) {
        toast({ title: "Dados Salvos", description: "As informações foram salvas com sucesso no banco de dados." });
      }
      return true;
    } catch (err) {
      console.error('[useCombinedDiagnosis] Save error:', err);
      if (showToast) {
        toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
      }
      return false;
    }
  };

  const handleFieldChange = (bloco, field, value) => {
    const abaNome = bloco === 'bloco01' ? 'Diagnóstico' : 'Implantação Técnica';
    console.log(`[ClienteFasesModal] Aba ${abaNome} - Campo alterado: ${field} = ${value}`);
    
    setFormData(prev => {
      // Maintains bloco01 and bloco02 data completely independent but in the same state object
      const newData = { 
        ...prev, 
        [bloco]: {
          ...prev[bloco],
          [field]: value
        }
      };
      
      setProgress(calculateProgress(newData));
      
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      const totalFields = Object.keys(newData.bloco01).length + Object.keys(newData.bloco02).length;
      if (totalFields === 1) {
         updateStatusIfNeeded(); // Trigger status change to "Em andamento" on first input
      }

      // Debounce logic for independent auto-save (500ms)
      autoSaveTimeoutRef.current = setTimeout(() => {
        console.log('[ClienteFasesModal] Auto-save ativado');
        handleSave(newData, false);
      }, 500);
      
      return newData;
    });
  };

  const forceSave = async () => {
    return await handleSave(formData, true);
  };

  return { 
    formData, 
    handleFieldChange, 
    handleSave: forceSave, 
    progress, 
    isLoading, 
    error 
  };
}
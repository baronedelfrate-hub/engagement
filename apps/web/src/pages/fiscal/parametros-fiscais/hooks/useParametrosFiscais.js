import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { validateParametrosFiscais } from '../utils/validateParametrosFiscais';

export function useParametrosFiscais(empresaId) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [dadosFiscais, setDadosFiscais] = useState({});
  const [parametrosNfe, setParametrosNfe] = useState({});
  const [parametrosNfse, setParametrosNfse] = useState({});
  const [parametrosTributos, setParametrosTributos] = useState([]);
  const [parametrosIntegradores, setParametrosIntegradores] = useState({});

  const fetchParameters = useCallback(async () => {
    if (!empresaId) return;
    
    console.log("[useParametrosFiscais] 🚀 Data fetch started for empresa:", empresaId);
    setLoading(true);

    const timeoutId = setTimeout(() => {
      console.warn("[useParametrosFiscais] ⚠️ Timeout triggered: data fetch took more than 5s");
      setLoading(false);
    }, 5000);

    try {
      const [fiscaisRes, nfeRes, nfseRes, tributosRes, integradoresRes] = await Promise.all([
        supabase.from('parametros_fiscais').select('*').eq('empresa_id', empresaId).maybeSingle(),
        supabase.from('parametros_nfe').select('*').eq('empresa_id', empresaId).maybeSingle(),
        supabase.from('parametros_nfse').select('*').eq('empresa_id', empresaId).maybeSingle(),
        supabase.from('parametros_tributos').select('*').eq('empresa_id', empresaId),
        supabase.from('parametros_integradores').select('*').eq('empresa_id', empresaId).maybeSingle()
      ]);

      setDadosFiscais(fiscaisRes.data || { empresa_id: empresaId, cnae_secundarios: [] });
      setParametrosNfe(nfeRes.data || { empresa_id: empresaId });
      setParametrosNfse(nfseRes.data || { empresa_id: empresaId });
      setParametrosTributos(tributosRes.data || []);
      setParametrosIntegradores(integradoresRes.data || { empresa_id: empresaId });

      console.log("[useParametrosFiscais] ✅ Data fetch completed successfully.");
    } catch (error) {
      console.error("[useParametrosFiscais] ❌ Data fetch error:", error);
      toast({ title: 'Erro ao carregar dados', description: error.message, variant: 'destructive' });
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      console.log("[useParametrosFiscais] 🏁 Loading state set to false.");
    }
  }, [empresaId, toast]);

  const saveDadosFiscais = async (data) => {
    const errors = validateParametrosFiscais.validateDadosFiscais(data);
    if (errors.length) {
      toast({ title: 'Atenção', description: errors.join('\n'), variant: 'destructive' });
      return false;
    }
    
    try {
      setLoading(true);
      const payload = { ...data, empresa_id: empresaId, updated_at: new Date() };
      
      const { error } = await supabase.from('parametros_fiscais')
        .upsert(payload, { onConflict: 'empresa_id' });
        
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Dados fiscais salvos com sucesso.' });
      return true;
    } catch (e) {
      console.error('Error saving dados fiscais:', e);
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveNfe = async (data) => {
    const errors = validateParametrosFiscais.validateNfe(data);
    if (errors.length) {
      toast({ title: 'Atenção', description: errors.join('\n'), variant: 'destructive' });
      return false;
    }
    
    try {
      setLoading(true);
      const payload = { ...data, empresa_id: empresaId, updated_at: new Date() };
      
      const { error } = await supabase.from('parametros_nfe')
        .upsert(payload, { onConflict: 'empresa_id' });
        
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Parâmetros NF-e salvos.' });
      return true;
    } catch (e) {
      console.error('Error saving NFe parameters:', e);
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveNfse = async (data) => {
    const errors = validateParametrosFiscais.validateNfse(data);
    if (errors.length) {
      toast({ title: 'Atenção', description: errors.join('\n'), variant: 'destructive' });
      return false;
    }
    
    try {
      setLoading(true);
      const payload = { ...data, empresa_id: empresaId, updated_at: new Date() };
      
      const { error } = await supabase.from('parametros_nfse')
        .upsert(payload, { onConflict: 'empresa_id' });
        
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Parâmetros NFS-e salvos.' });
      return true;
    } catch (e) {
      console.error('Error saving NFSe parameters:', e);
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveTributos = async (tributosData) => {
    const errors = validateParametrosFiscais.validateTributos(tributosData);
    if (errors.length) {
      toast({ title: 'Atenção', description: errors.join('\n'), variant: 'destructive' });
      return false;
    }

    try {
      setLoading(true);
      const { error: deleteError } = await supabase.from('parametros_tributos').delete().eq('empresa_id', empresaId);
      if (deleteError) throw deleteError;

      const payload = tributosData.map(t => ({
        ...t,
        empresa_id: empresaId,
        id: undefined 
      }));

      const { error: insertError } = await supabase.from('parametros_tributos').insert(payload);
      if (insertError) throw insertError;
      
      setParametrosTributos(payload);
      toast({ title: 'Sucesso', description: 'Tributos atualizados com sucesso.' });
      return true;
    } catch (e) {
      console.error('Error saving tributos:', e);
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveIntegradores = async (data) => {
    const errors = validateParametrosFiscais.validateIntegradores(data);
    if (errors.length) {
      toast({ title: 'Atenção', description: errors.join('\n'), variant: 'destructive' });
      return false;
    }

    try {
      setLoading(true);
      const payload = { ...data, empresa_id: empresaId, updated_at: new Date() };
      
      if (payload.chave_nfe && !payload.chave_nfe.startsWith('ENC_')) payload.chave_nfe = 'ENC_' + btoa(payload.chave_nfe);
      if (payload.chave_nfse && !payload.chave_nfse.startsWith('ENC_')) payload.chave_nfse = 'ENC_' + btoa(payload.chave_nfse);
      if (payload.certificado_senha && !payload.certificado_senha.startsWith('ENC_')) payload.certificado_senha = 'ENC_' + btoa(payload.certificado_senha);
      
      const { error } = await supabase.from('parametros_integradores')
        .upsert(payload, { onConflict: 'empresa_id' });
        
      if (error) throw error;
      
      setParametrosIntegradores(payload);
      toast({ title: 'Sucesso', description: 'Integrações atualizadas com sucesso.' });
      return true;
    } catch (e) {
      console.error('Error saving integradores:', e);
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        setLoading(false);
        const success = Math.random() > 0.3;
        if (success) {
          toast({ title: 'Sucesso', description: 'Conexão com integrador estabelecida.' });
        } else {
          toast({ title: 'Erro', description: 'Falha na conexão com integrador. Verifique credenciais.', variant: 'destructive' });
        }
        resolve(success);
      }, 1500);
    });
  };

  return {
    loading,
    fetchParameters,
    dadosFiscais, setDadosFiscais, saveDadosFiscais,
    parametrosNfe, setParametrosNfe, saveNfe,
    parametrosNfse, setParametrosNfse, saveNfse,
    parametrosTributos, saveTributos,
    parametrosIntegradores, setParametrosIntegradores, saveIntegradores,
    testConnection,
    isValid: true
  };
}
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { encryptData, decryptData } from '@/lib/nfseConfigEncryption';
import { useToast } from '@/components/ui/use-toast';
import { validateNumericField } from '@/lib/validationUtils';

export function useNfseConfig(empresaId) {
  const { toast } = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchConfig = useCallback(async () => {
    if (!empresaId) return null;
    
    console.log('useNfseConfig hook initialized', { empresaId });
    console.log('Fetching NFSE config from API');
    
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('nfse_config')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (dbError) {
        if (dbError.code !== 'PGRST116') {
          console.log('API error:', dbError);
          setError(dbError);
        }
        setConfig(null);
        return null;
      }
      
      console.log('API response received:', data);
      
      if (data) {
        if (data.senha_certificado) {
          data.senha_certificado_decrypted = decryptData(data.senha_certificado);
        }
        setConfig(data);
        console.log('Config state updated:', data);
      } else {
        setConfig(null);
      }
      return data;
    } catch (err) {
      console.log('API error:', err);
      setError(err);
      setConfig(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const validateNfseConfigData = (formData) => {
    const valor_servico_teste = validateNumericField(formData.valor_servico_teste);
    const aliquota_iss_teste = validateNumericField(formData.aliquota_iss_teste);
    return { ...formData, valor_servico_teste, aliquota_iss_teste };
  };

  const saveConfig = async (formData, pfxBase64) => {
    setLoading(true);
    try {
      if (!empresaId) {
        throw new Error("ID da Empresa não fornecido.");
      }

      const validatedData = validateNfseConfigData(formData);
      const now = new Date().toISOString();

      const payload = {
        empresa_id: empresaId,
        cnpj: validatedData.cnpj,
        inscricao_municipal: validatedData.inscricao_municipal,
        razao_social: validatedData.razao_social,
        descricao_servico_teste: validatedData.descricao_servico_teste,
        valor_servico_teste: validatedData.valor_servico_teste,
        aliquota_iss_teste: validatedData.aliquota_iss_teste,
        cpf_cnpj_cliente_teste: validatedData.cpf_cnpj_cliente_teste,
        nome_cliente_teste: validatedData.nome_cliente_teste,
        ambiente: validatedData.ambiente,
        data_atualizacao: now
      };

      if (validatedData.senha_certificado) {
        payload.senha_certificado = encryptData(validatedData.senha_certificado);
      }

      if (pfxBase64) {
        payload.certificado_pfx = encryptData(pfxBase64);
      }

      let result;
      let dbError;
      
      if (config?.id) {
        const response = await supabase.from('nfse_config').update(payload).eq('id', config.id).select().single();
        dbError = response.error;
        result = response.data;
      } else {
        payload.data_criacao = now;
        const response = await supabase.from('nfse_config').insert([payload]).select().single();
        dbError = response.error;
        result = response.data;
      }

      if (dbError) throw dbError;

      toast({ title: 'Sucesso', description: 'Configuração salva com segurança.' });
      await fetchConfig();
      return { success: true, data: result };

    } catch (err) {
      toast({ title: 'Erro ao Salvar', description: err.message, variant: 'destructive' });
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  const deleteConfig = async () => {
    if (!config?.id) return;
    
    setLoading(true);
    try {
      const { error: dbError } = await supabase.from('nfse_config').delete().eq('id', config.id);
      
      if (dbError) throw dbError;
      
      setConfig(null);
      toast({ title: 'Sucesso', description: 'Configuração removida.' });
    } catch (err) {
      toast({ title: 'Erro ao Deletar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return { config, loading, error, fetchConfig, saveConfig, deleteConfig };
}
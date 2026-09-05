import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook customizado para busca de municípios no Supabase.
 * Otimizado para retorno imediato sem debounce excessivo.
 */
export function useFiscalMunicipios(delay = 50) {
  const [municipios, setMunicipios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const timerRef = useRef(null);
  const isMounted = useRef(true);

  // Efetua a busca no Supabase
  const fetchMunicipios = useCallback(async (term) => {
    if (!isMounted.current) return;
    
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('fiscal_municipios_ibge')
        .select('id, codigo_ibge, nome_municipio, uf, nome_formatado')
        .eq('ativo', true)
        .order('nome_municipio', { ascending: true })
        .limit(50); // Limita a 50 resultados para performance

      if (term && term.trim().length > 0) {
        const cleanTerm = term.trim();
        // Se for número, busca por código IBGE
        if (/^\d+$/.test(cleanTerm)) {
          query = query.ilike('codigo_ibge', `${cleanTerm}%`);
        } else {
          // Busca por nome do município
          query = query.ilike('nome_municipio', `%${cleanTerm}%`);
        }
      }

      const { data, error: fetchErr } = await query;

      if (fetchErr) throw fetchErr;

      if (isMounted.current) {
        // Garante que o nome_formatado esteja sempre presente
        const formattedData = (data || []).map(m => ({
          ...m,
          nome_formatado: m.nome_formatado || `${m.nome_municipio} - ${m.uf}`
        }));
        setMunicipios(formattedData);
      }
    } catch (err) {
      console.error("[useFiscalMunicipios ERRO]", err);
      if (isMounted.current) {
        setError("Falha ao buscar municípios. Tente novamente.");
        setMunicipios([]);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  // Implementação de debounce super rápido (quase imediato) para evitar lag
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (delay > 0) {
      timerRef.current = setTimeout(() => {
        fetchMunicipios(searchTerm);
      }, delay);
    } else {
      fetchMunicipios(searchTerm);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchTerm, fetchMunicipios, delay]);

  // Limpeza na desmontagem
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const search = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  // Busca síncrona por ID (útil para preencher valores iniciais)
  const getMunicipioById = useCallback(async (id) => {
    if (!id) return null;
    try {
      const { data } = await supabase
        .from('fiscal_municipios_ibge')
        .select('id, codigo_ibge, nome_municipio, uf, nome_formatado')
        .eq('id', id)
        .single();
        
      if (data) {
        data.nome_formatado = data.nome_formatado || `${data.nome_municipio} - ${data.uf}`;
      }
      return data;
    } catch (e) {
      return null;
    }
  }, []);

  return {
    municipios, 
    loading,
    error,
    searchMunicipios: search,
    getMunicipioById
  };
}
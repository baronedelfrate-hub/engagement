import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function useNfseDropdowns() {
  const [loading, setLoading] = useState(true);
  const [dropdowns, setDropdowns] = useState({
    empresas: [],
    clientes: [],
    servicos: [],
    condicoes: [],
    pedidos: [],
    propostas: []
  });

  const [municipios, setMunicipios] = useState([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    const fetchDropdowns = async () => {
      setLoading(true);
      try {
        const [emp, cli, srv, cond, ped, prop] = await Promise.all([
          supabase.from('empresas').select('id, razao_social').eq('ativo', true),
          supabase.from('clientes').select('id, nome, cidade, estado'),
          supabase.from('servicos').select('id, nome, preco, aliquota_issqn, codigo_servico_lc116, descricao'),
          supabase.from('condicoes_pagamento').select('id, nome').eq('ativo', true),
          supabase.from('pedidos_venda').select('id, numero'),
          supabase.from('propostas').select('id, numero')
        ]);
        
        setDropdowns({
          empresas: emp.data || [],
          clientes: cli.data || [],
          servicos: srv.data || [],
          condicoes: cond.data || [],
          pedidos: ped.data || [],
          propostas: prop.data || []
        });
      } catch (e) {
        console.error("Erro ao carregar dropdowns:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDropdowns();
  }, []);

  const searchMunicipios = (termo) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    setLoadingMunicipios(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        let query = supabase
          .from('fiscal_municipios_ibge')
          .select('id, nome_municipio, uf, codigo_ibge, nome_formatado')
          .eq('ativo', true)
          .order('nome_municipio');

        if (termo && termo.length > 0) {
          query = query.ilike('nome_municipio', `%${termo}%`);
        }

        const { data, error } = await query.limit(100);
          
        if (!error && data) {
          setMunicipios(data);
        } else if (error) {
          console.error("Erro na busca de municípios:", error);
        }
      } catch (err) {
        console.error("Erro na busca de municípios:", err);
      } finally {
        setLoadingMunicipios(false);
      }
    }, 400);
  };

  const getMunicipioById = async (id) => {
    if (!id) return null;
    try {
      const { data, error } = await supabase
        .from('fiscal_municipios_ibge')
        .select('id, nome_municipio, uf, codigo_ibge, nome_formatado')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return data;
    } catch (e) {
      console.error("Erro ao buscar município por ID:", e);
      return null;
    }
  };

  return { dropdowns, loading, municipios, loadingMunicipios, searchMunicipios, getMunicipioById };
}
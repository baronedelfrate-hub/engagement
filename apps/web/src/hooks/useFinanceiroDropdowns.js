import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook centralizado para buscar dados de cadastros auxiliares do módulo financeiro.
 * Agora inclui todas as tabelas de relacionamento solicitadas.
 */
export const useFinanceiroDropdowns = () => {
  const [data, setData] = useState({
    clientes: [],
    fornecedores: [],
    empresas: [],
    bancos: [], 
    centrosCusto: [],
    categorias: [],
    subcategorias: [],
    projetos: [],
    produtos: [],
    servicos: [],
    tiposDocumento: [],
    condicoesPagamento: [],
    tiposPagamento: [],
    origens: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
            supabase.from('clientes').select('id, nome, cnpj_cpf').order('nome'),
            supabase.from('fornecedores').select('id, nome, cnpj').order('nome'),
            supabase.from('empresas').select('id, razao_social, nome_fantasia, cnpj').eq('ativo', true).order('nome_fantasia'),
            supabase.from('bancos').select('id, nome, codigo, agencia, conta').eq('ativo', true).order('nome'),
            supabase.from('centros_custo').select('id, nome').eq('ativo', true).order('nome'),
            supabase.from('categorias').select('id, nome').eq('ativo', true).order('nome'),
            supabase.from('subcategorias').select('id, nome, categoria_id').eq('ativo', true).order('nome'),
            supabase.from('projetos').select('id, nome').order('nome'),
            supabase.from('produtos').select('id, nome, preco_venda').eq('ativo', true).order('nome'),
            supabase.from('servicos').select('id, nome, preco').order('nome'),
            supabase.from('tipos_documento').select('id, nome').eq('ativo', true).order('nome'),
            supabase.from('condicoes_pagamento').select('id, nome').eq('ativo', true).order('nome'),
            supabase.from('tipos_pagamento').select('id, nome').eq('ativo', true).order('nome'),
            supabase.from('origens').select('id, nome').eq('ativo', true).order('nome')
        ]);

        const unwrap = (result) => (result.status === 'fulfilled' && result.value.data) ? result.value.data : [];

        setData({
            clientes: unwrap(results[0]),
            fornecedores: unwrap(results[1]),
            empresas: unwrap(results[2]),
            bancos: unwrap(results[3]),
            centrosCusto: unwrap(results[4]),
            categorias: unwrap(results[5]),
            subcategorias: unwrap(results[6]),
            projetos: unwrap(results[7]),
            produtos: unwrap(results[8]),
            servicos: unwrap(results[9]),
            tiposDocumento: unwrap(results[10]),
            condicoesPagamento: unwrap(results[11]),
            tiposPagamento: unwrap(results[12]),
            origens: unwrap(results[13])
        });

      } catch (err) {
        console.error("Erro ao carregar dropdowns financeiros:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return { ...data, loading, error };
};
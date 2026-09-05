import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useItemClassification = () => {
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [centrosCusto, setCentrosCusto] = useState([]);
    const [projetos, setProjetos] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [servicos, setServicos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [catRes, subRes, ccRes, projRes, prodRes, servRes] = await Promise.all([
                    supabase.from('categorias').select('id, nome').eq('ativo', true).order('nome'),
                    supabase.from('subcategorias').select('id, nome, categoria_id').eq('ativo', true).order('nome'),
                    supabase.from('centros_custo').select('id, nome').eq('ativo', true).order('nome'),
                    supabase.from('projetos').select('id, nome').order('nome'),
                    supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
                    supabase.from('servicos').select('*').eq('ativo', true).order('nome')
                ]);
                
                if (catRes.error) throw catRes.error;
                if (subRes.error) throw subRes.error;
                if (ccRes.error) throw ccRes.error;
                if (projRes.error) throw projRes.error;
                if (prodRes.error) throw prodRes.error;
                if (servRes.error) throw servRes.error;

                if (catRes.data) setCategorias(catRes.data);
                if (subRes.data) setSubcategorias(subRes.data);
                if (ccRes.data) setCentrosCusto(ccRes.data);
                if (projRes.data) setProjetos(projRes.data);
                if (prodRes.data) setProdutos(prodRes.data);
                if (servRes.data) setServicos(servRes.data);
            } catch (err) {
                console.error("Erro ao buscar dados de classificação e produtos:", err);
                setError(err.message || 'Erro ao carregar dados dos dropdowns.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getSubcategoriasPorCategoria = useCallback((categoriaId) => {
        if (!categoriaId) return [];
        return subcategorias.filter(sub => sub.categoria_id === categoriaId);
    }, [subcategorias]);

    return {
        categorias,
        subcategorias,
        centrosCusto,
        projetos,
        produtos,
        servicos,
        getSubcategoriasPorCategoria,
        loading,
        error
    };
};
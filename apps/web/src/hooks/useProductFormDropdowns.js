import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useProductFormDropdowns = () => {
  const [data, setData] = useState({
    categorias: [],
    subcategorias: [],
    centrosCusto: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDropdowns = async () => {
      setLoading(true);
      try {
        const [catRes, subcatRes, ccRes] = await Promise.all([
          supabase.from('categorias').select('id, nome').eq('ativo', true).order('nome'),
          supabase.from('subcategorias').select('id, nome, categoria_id').eq('ativo', true).order('nome'),
          supabase.from('centros_custo').select('id, codigo, nome').eq('ativo', true).order('nome')
        ]);

        if (catRes.error) throw catRes.error;
        if (subcatRes.error) throw subcatRes.error;
        if (ccRes.error) throw ccRes.error;

        setData({
          categorias: catRes.data || [],
          subcategorias: subcatRes.data || [],
          centrosCusto: ccRes.data || []
        });
      } catch (err) {
        console.error("Erro ao carregar dropdowns do produto:", err);
        setError(err.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchDropdowns();
  }, []);

  return { ...data, loading, error };
};
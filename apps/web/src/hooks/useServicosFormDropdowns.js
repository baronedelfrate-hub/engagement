import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useServicosFormDropdowns = () => {
  const [data, setData] = useState({
    tipos_servico: [
      { id: '1', nome: 'Manutenção' },
      { id: '2', nome: 'Consultoria' },
      { id: '3', nome: 'Desenvolvimento' },
      { id: '4', nome: 'Treinamento' },
      { id: '5', nome: 'Outros' }
    ],
    unidades_medida: [
      { id: 'H', nome: 'Hora' },
      { id: 'D', nome: 'Dia' },
      { id: 'M', nome: 'Mês' },
      { id: 'SV', nome: 'Serviço/Projeto' },
      { id: 'UN', nome: 'Unidade' }
    ],
    contas_receita: [
      { id: '1', nome: 'Receita de Serviços Prestados' },
      { id: '2', nome: 'Receita de Consultoria' },
      { id: '3', nome: 'Outras Receitas Operacionais' }
    ],
    natureza_operacao: [
      { id: '1', nome: 'Prestação de Serviço Municipal' },
      { id: '2', nome: 'Prestação de Serviço Intermunicipal' },
      { id: '3', nome: 'Exportação de Serviços' }
    ],
    categorias: [],
    subcategorias: [],
    fornecedores: [],
    centrosCusto: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDropdowns = async () => {
      setLoading(true);
      try {
        const [catRes, subcatRes, fornRes, ccRes] = await Promise.all([
          supabase.from('categorias').select('id, nome').eq('ativo', true).order('nome'),
          supabase.from('subcategorias').select('id, nome, categoria_id').eq('ativo', true).order('nome'),
          supabase.from('fornecedores').select('id, nome, fantasia').eq('ativo', true).order('nome'),
          supabase.from('centros_custo').select('id, codigo, nome').eq('ativo', true).order('nome')
        ]);

        if (catRes.error) throw catRes.error;
        if (subcatRes.error) throw subcatRes.error;
        if (fornRes.error) throw fornRes.error;
        if (ccRes.error) throw ccRes.error;

        setData(prev => ({
          ...prev,
          categorias: catRes.data || [],
          subcategorias: subcatRes.data || [],
          fornecedores: fornRes.data || [],
          centrosCusto: ccRes.data || []
        }));
      } catch (err) {
        console.error("Erro ao carregar dropdowns do serviço:", err);
        setError(err.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchDropdowns();
  }, []);

  return { ...data, loading, error };
};
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useEmpresasDropdown = () => {
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        const fetchEmpresas = async () => {
            try {
                setLoading(true);
                const { data, error: fetchError } = await supabase
                    .from('empresas')
                    .select('*')
                    .eq('ativo', true)
                    .order('razao_social');
                
                if (fetchError) throw fetchError;
                
                if (mounted) {
                    setEmpresas(data || []);
                    setError(null);
                }
            } catch (err) {
                console.error('Erro ao buscar empresas (useEmpresasDropdown):', err);
                if (mounted) {
                    setError(err.message || 'Erro ao buscar empresas');
                    setEmpresas([]);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchEmpresas();
        return () => { mounted = false; };
    }, []);

    return { empresas, loading, error };
};
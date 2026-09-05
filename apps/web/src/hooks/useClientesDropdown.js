import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useClientesDropdown = () => {
    const [clientes, setClientes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        
        const fetchClientes = async () => {
            console.log('🚀 [useClientesDropdown] Hook montado, iniciando busca IMEDIATA de clientes sem aguardar auth state...');
            
            try {
                setIsLoading(true);
                setError(null);
                
                const companyId = localStorage.getItem('company_id');
                console.log('📌 [useClientesDropdown] Company ID (localStorage):', companyId || 'NÃO ENCONTRADO');

                console.log('🔄 [useClientesDropdown] Executando query: SELECT id, nome FROM clientes...');
                
                const { data: allData, error: allError, count } = await supabase
                    .from('clientes')
                    .select('id, nome, company_id', { count: 'exact' })
                    .order('nome');
                
                if (allError) {
                    console.error('❌ [useClientesDropdown] Erro na query:', allError);
                    throw allError;
                }
                
                console.log(`✅ [useClientesDropdown] Dados recebidos do Supabase! Total de registros: ${count || 0}`);
                if (allData && allData.length > 0) {
                    console.log('📊 [useClientesDropdown] Dados brutos (amostra):', allData.slice(0, 4));
                }

                // Filtrar os dados ou retornar tudo (para garantir que os dados apareçam no dropdown)
                let finalData = allData || [];
                
                if (companyId && finalData.length > 0) {
                    const filtered = finalData.filter(c => c.company_id === companyId);
                    if (filtered.length > 0) {
                        finalData = filtered;
                        console.log(`🔍 [useClientesDropdown] Filtro por company_id aplicado. Registros restantes: ${finalData.length}`);
                    } else {
                        console.warn('⚠️ [useClientesDropdown] O filtro de company_id zerou a lista. Retornando todos os clientes da tabela para evitar dropdown vazio.');
                    }
                }

                // Formatar para o padrão do Select do shadcn: { value, label }
                const formattedData = finalData.map(cli => ({
                    value: cli.id,
                    label: cli.nome || 'Cliente sem nome'
                }));
                
                console.log(`✅ [useClientesDropdown] Formatação concluída. Entregando ${formattedData.length} clientes para o componente.`);
                
                if (mounted) {
                    setClientes(formattedData);
                }
            } catch (err) {
                console.error('❌ [useClientesDropdown] Erro ao processar clientes:', err);
                console.error('❌ [useClientesDropdown] Detalhes do erro:', err.message);
                
                if (mounted) {
                    setError(err.message || 'Erro ao buscar clientes');
                    setClientes([]); 
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                    console.log('🏁 [useClientesDropdown] Processo de busca finalizado (loading=false).');
                }
            }
        };

        // Chama a função imediatamente sem checar user/auth
        fetchClientes();

        return () => { mounted = false; };
    }, []); // Array de dependências vazio garante execução única no mount

    return { clientes, loading: isLoading, isLoading, error };
};
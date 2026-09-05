import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { calculateDRETotals, validateBalancete, exportDREToExcel, exportBalanceteToExcel } from '@/lib/dreBalanceteUtils';

export const DREBalanceteContext = createContext();

export const useDREBalancete = () => useContext(DREBalanceteContext);

export const DREBalanceteProvider = ({ children }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  
  const today = new Date();
  const defaultCompetencia = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [filters, setFilters] = useState({
    empresa_id: 'all',
    competencia: defaultCompetencia,
    comparacao: '',
    tipo: 'Ambos',
    mostrarDetalhes: true,
    mostrarVariacao: true,
    mostrarPercentual: true,
  });

  const [dreData, setDreData] = useState([]);
  const [structuredDreData, setStructuredDreData] = useState([]);
  const [balanceteData, setBalanceteData] = useState([]);
  const [balanceteSummary, setBalanceteSummary] = useState({ balanced: true, totalDebitos: 0, totalCreditos: 0, diferenca: 0 });

  useEffect(() => {
    fetchEmpresas();
  }, []);

  useEffect(() => {
    if (filters.empresa_id !== 'all') {
      fetchData();
    }
  }, [filters.empresa_id, filters.competencia]);

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('ativo', true);
      if (error) throw error;
      setEmpresas(data || []);
      if (data && data.length > 0) {
        setFilters(prev => ({ ...prev, empresa_id: data[0].id }));
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível carregar empresas.', variant: 'destructive' });
    }
  };

  const fetchData = async () => {
    if (!filters.empresa_id || filters.empresa_id === 'all') return;
    setLoading(true);
    
    try {
      // Fetch DRE Data
      const { data: dre, error: dreErr } = await supabase
        .from('dre_dados')
        .select('*')
        .eq('empresa_id', filters.empresa_id)
        .eq('competencia', filters.competencia)
        .order('ordem', { ascending: true });
        
      if (dreErr) throw dreErr;
      setDreData(dre || []);
      setStructuredDreData(calculateDRETotals(dre || []));

      // Fetch Balancete Data
      const { data: bal, error: balErr } = await supabase
        .from('balancete_dados')
        .select(`*, conta:contas_contabeis(codigo, nome, tipo, natureza)`)
        .eq('empresa_id', filters.empresa_id)
        .eq('competencia', filters.competencia);
        
      if (balErr) throw balErr;
      setBalanceteData(bal || []);
      setBalanceteSummary(validateBalancete(bal || []));

    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao buscar dados do DRE/Balancete.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async (type) => {
    try {
      if (type === 'DRE') {
        await exportDREToExcel(structuredDreData, `DRE_${filters.competencia}.xlsx`);
      } else {
        await exportBalanceteToExcel(balanceteData, `Balancete_${filters.competencia}.xlsx`);
      }
      toast({ title: 'Sucesso', description: 'Relatório exportado com sucesso.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao exportar relatório.', variant: 'destructive' });
    }
  };

  const value = {
    loading,
    empresas,
    filters,
    setFilters,
    dreData: structuredDreData,
    balanceteData,
    balanceteSummary,
    refreshData: fetchData,
    exportToExcel
  };

  return <DREBalanceteContext.Provider value={value}>{children}</DREBalanceteContext.Provider>;
};
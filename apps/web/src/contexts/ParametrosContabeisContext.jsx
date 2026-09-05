import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const ParametrosContabeisContext = createContext();

export const useParametrosContabeis = () => {
  const context = useContext(ParametrosContabeisContext);
  if (!context) throw new Error('useParametrosContabeis must be used within ParametrosContabeisProvider');
  return context;
};

export const ParametrosContabeisProvider = ({ children }) => {
  const { toast } = useToast();
  const [empresaId, setEmpresaId] = useState('all');
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [data, setData] = useState({
    contas: [],
    vinculacoes: [],
    centrosCusto: [],
    historicos: [],
    competencias: [],
    layouts: [],
    regras: [],
    fechamento: null
  });

  useEffect(() => {
    const fetchEmpresas = async () => {
      const { data: emp } = await supabase.from('empresas').select('id, razao_social').eq('ativo', true);
      if (emp) setEmpresas(emp);
    };
    fetchEmpresas();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filter = empresaId !== 'all' ? empresaId : null;
      
      const promises = [
        supabase.from('pc_contas_contabeis').select('*').order('codigo'),
        supabase.from('pc_vinculacoes').select('*'),
        supabase.from('centros_custo').select('*'),
        supabase.from('pc_historicos').select('*').order('codigo'),
        supabase.from('pc_competencias').select('*').order('competencia', { ascending: false }),
        supabase.from('pc_layouts').select('*'),
        supabase.from('pc_regras_integracao').select('*'),
        supabase.from('pc_parametros_fechamento').select('*').limit(1)
      ];

      const results = await Promise.all(promises);
      
      setData({
        contas: results[0].data || [],
        vinculacoes: results[1].data || [],
        centrosCusto: results[2].data || [],
        historicos: results[3].data || [],
        competencias: results[4].data || [],
        layouts: results[5].data || [],
        regras: results[6].data || [],
        fechamento: results[7].data?.[0] || null
      });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Falha ao carregar parâmetros.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [empresaId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveItem = async (table, item) => {
    try {
      const payload = { ...item, empresa_id: empresaId !== 'all' ? empresaId : null };
      let res;
      if (item.id) {
        res = await supabase.from(table).update(payload).eq('id', item.id);
      } else {
        res = await supabase.from(table).insert([payload]);
      }
      if (res.error) throw res.error;
      toast({ title: 'Sucesso', description: 'Registro salvo com sucesso.' });
      fetchData();
      return true;
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar.', variant: 'destructive' });
      return false;
    }
  };

  const deleteItem = async (table, id) => {
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Registro removido.' });
      fetchData();
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao remover.', variant: 'destructive' });
    }
  };

  return (
    <ParametrosContabeisContext.Provider value={{
      empresaId, setEmpresaId, empresas, data, loading, fetchData, saveItem, deleteItem
    }}>
      {children}
    </ParametrosContabeisContext.Provider>
  );
};
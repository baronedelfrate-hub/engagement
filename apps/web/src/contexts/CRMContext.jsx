import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const CRMContext = createContext();

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};

export const CRMProvider = ({ children }) => {
  const { toast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [propostas, setPropostas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true });
      if (clientesError) throw clientesError;
      setClientes(clientesData || []);

      // Fetch Propostas
      const { data: propostasData, error: propostasError } = await supabase
        .from('propostas')
        .select(`
          *,
          cliente:cliente_id (nome)
        `)
        .order('created_at', { ascending: false });
      if (propostasError) throw propostasError;
      setPropostas(propostasData || []);

      // Fetch Produtos (for proposals)
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('id, nome, preco_venda')
        .order('nome', { ascending: true });
      if (produtosError) throw produtosError;
      setProdutos(produtosData || []);

    } catch (error) {
      console.error('Error fetching CRM data:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar dados do CRM.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createProposta = async (propostaData) => {
    try {
      const { data, error } = await supabase
        .from('propostas')
        .insert([propostaData])
        .select()
        .single();
      
      if (error) throw error;
      
      toast({ title: 'Sucesso', description: 'Proposta criada com sucesso.' });
      fetchData(); // Refresh to get relations
      return data;
    } catch (error) {
      console.error('Error creating proposta:', error);
      toast({ title: 'Erro', description: 'Falha ao criar proposta.', variant: 'destructive' });
      return null;
    }
  };

  const updatePropostaStatus = async (id, status) => {
    // Valid status values per database constraint:
    // 'LEAD', 'PROPOSTA', 'NEGOCIACAO', 'GANHA', 'ENVIADO_FATURAMENTO'
    console.log(`[CRMContext] Updating proposta ${id} to status: ${status}`);
    
    // Optimistic UI update
    const previousPropostas = [...propostas];
    setPropostas(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    
    try {
      const { data, error } = await supabase
        .from('propostas')
        .update({ status })
        .eq('id', id)
        .select();
        
      if (error) {
        throw error;
      }
      
      console.log(`[CRMContext] Successfully updated proposta ${id} in database`, data);
      return { success: true, error: null };
    } catch (error) {
      console.error('[CRMContext] Error updating status:', error);
      // Revert optimistic update on error
      setPropostas(previousPropostas);
      return { success: false, error: error.message || 'Erro ao atualizar status na base de dados' };
    }
  };

  const value = {
    clientes,
    propostas,
    produtos,
    loading,
    refreshData: fetchData,
    createProposta,
    updatePropostaStatus
  };

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
};
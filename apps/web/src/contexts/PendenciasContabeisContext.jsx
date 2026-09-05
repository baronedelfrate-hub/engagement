import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const PendenciasContabeisContext = createContext();

export const usePendenciasContabeis = () => {
  const context = useContext(PendenciasContabeisContext);
  if (!context) {
    throw new Error('usePendenciasContabeis must be used within a PendenciasProvider');
  }
  return context;
};

export const PendenciasProvider = ({ children }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pendencias, setPendencias] = useState([]);

  const fetchPendencias = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      let query = supabase
        .from('pendencias_contabeis')
        .select(`
          *,
          empresa:empresas(id, razao_social, nome_fantasia),
          responsavel:users(id, nome, email)
        `)
        .order('created_at', { ascending: false });

      if (filters.empresa_id && filters.empresa_id !== 'all') {
        query = query.eq('empresa_id', filters.empresa_id);
      }
      if (filters.status && filters.status !== 'Todos') {
        query = query.eq('status', filters.status);
      }
      if (filters.tipo && filters.tipo !== 'Todos') {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters.competencia) {
        query = query.eq('competencia', filters.competencia);
      }
      if (filters.responsavel_id && filters.responsavel_id !== 'all') {
        query = query.eq('responsavel_id', filters.responsavel_id);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      let resultData = data || [];

      if (filters.search) {
        const lowerSearch = filters.search.toLowerCase();
        resultData = resultData.filter(p => 
          p.descricao?.toLowerCase().includes(lowerSearch) || 
          p.origem?.toLowerCase().includes(lowerSearch)
        );
      }

      setPendencias(resultData);
      return resultData;
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao buscar pendências.', variant: 'destructive' });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getPendencia = async (id) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pendencias_contabeis')
        .select(`
          *,
          empresa:empresas(id, razao_social, nome_fantasia),
          responsavel:users(id, nome, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao buscar detalhes da pendência.', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createPendencia = async (data) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        ...data,
        created_by: user?.id,
        data_abertura: new Date().toISOString().split('T')[0]
      };

      const { data: newPendencia, error } = await supabase
        .from('pendencias_contabeis')
        .insert([payload])
        .select()
        .single();
        
      if (error) throw error;

      await supabase.from('pendencias_historico').insert([{
        pendencia_id: newPendencia.id,
        acao: 'Criado',
        status_novo: newPendencia.status,
        usuario_id: user?.id,
        observacoes: 'Pendência registrada no sistema.'
      }]);

      toast({ title: 'Sucesso', description: 'Pendência criada com sucesso.' });
      return newPendencia;
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao criar pendência.', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updatePendencia = async (id, data) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('pendencias_contabeis')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
        
      if (error) throw error;

      await supabase.from('pendencias_historico').insert([{
        pendencia_id: id,
        acao: 'Editado',
        usuario_id: user?.id,
        observacoes: 'Dados da pendência atualizados.'
      }]);

      toast({ title: 'Sucesso', description: 'Pendência atualizada com sucesso.' });
      return true;
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao atualizar pendência.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deletePendencia = async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('pendencias_contabeis').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Pendência excluída com sucesso.' });
      return true;
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao excluir pendência.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const changePendenciaStatus = async (id, currentStatus, newStatus, notes = '', extraData = {}) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let updates = { 
        status: newStatus, 
        updated_at: new Date().toISOString(),
        ...extraData
      };

      if (newStatus === 'Resolvida') {
        updates.data_resolucao = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase.from('pendencias_contabeis').update(updates).eq('id', id);
      if (error) throw error;

      await supabase.from('pendencias_historico').insert([{
        pendencia_id: id,
        acao: 'Status alterado',
        status_anterior: currentStatus,
        status_novo: newStatus,
        usuario_id: user?.id,
        observacoes: notes
      }]);

      toast({ title: 'Sucesso', description: `Status alterado para ${newStatus}.` });
      return true;
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao alterar status.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getHistorico = async (id) => {
    try {
      const { data, error } = await supabase
        .from('pendencias_historico')
        .select('*, usuario:users(nome, email)')
        .eq('pendencia_id', id)
        .order('data_acao', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const getVinculos = async (id) => {
    try {
      const { data, error } = await supabase
        .from('pendencias_vinculos')
        .select('*')
        .eq('pendencia_id', id);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const linkDocument = async (pendenciaId, tipoVinculo, referenciaId) => {
    try {
      const { error } = await supabase.from('pendencias_vinculos').insert([{
        pendencia_id: pendenciaId,
        tipo_vinculo: tipoVinculo,
        referencia_id: referenciaId
      }]);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Vínculo adicionado com sucesso.' });
      return true;
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao adicionar vínculo.', variant: 'destructive' });
      return false;
    }
  };

  const unlinkDocument = async (vinculoId) => {
    try {
      const { error } = await supabase.from('pendencias_vinculos').delete().eq('id', vinculoId);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Vínculo removido.' });
      return true;
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao remover vínculo.', variant: 'destructive' });
      return false;
    }
  };

  const value = {
    loading,
    pendencias,
    fetchPendencias,
    getPendencia,
    createPendencia,
    updatePendencia,
    deletePendencia,
    changePendenciaStatus,
    getHistorico,
    getVinculos,
    linkDocument,
    unlinkDocument
  };

  return (
    <PendenciasContabeisContext.Provider value={value}>
      {children}
    </PendenciasContabeisContext.Provider>
  );
};
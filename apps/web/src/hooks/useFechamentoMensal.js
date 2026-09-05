import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { calculateProgress } from '@/lib/fechamentoUtils';

export function useFechamentoMensal() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchClosings = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      let query = supabase
        .from('fechamentos_contabeis')
        .select(`
          *,
          empresa:empresas(nome_fantasia, razao_social),
          responsavel:users!fechamentos_contabeis_responsavel_id_fkey(nome)
        `)
        .order('created_at', { ascending: false });

      if (filters.empresa_id && filters.empresa_id !== 'all') {
        query = query.eq('empresa_id', filters.empresa_id);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.competencia) {
        query = query.eq('competencia', filters.competencia);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching closings:', error);
      toast({ title: 'Erro', description: 'Falha ao buscar fechamentos.', variant: 'destructive' });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchClosingById = useCallback(async (id) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fechamentos_contabeis')
        .select(`
          *,
          empresa:empresas(nome_fantasia, razao_social),
          responsavel:users!fechamentos_contabeis_responsavel_id_fkey(nome)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;

      // Fetch etapas
      const { data: etapas, error: etapasError } = await supabase
        .from('fechamento_etapas')
        .select('*')
        .eq('fechamento_id', id)
        .order('numero_etapa', { ascending: true });
      
      if (etapasError) throw etapasError;

      return { ...data, etapas: etapas || [] };
    } catch (error) {
      console.error('Error fetching closing:', error);
      toast({ title: 'Erro', description: 'Falha ao buscar detalhes do fechamento.', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createClosing = async (closingData, userId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fechamentos_contabeis')
        .insert([{
          ...closingData,
          data_abertura: new Date().toISOString().split('T')[0],
          progresso: 0
        }])
        .select()
        .single();

      if (error) throw error;

      // Create default steps
      const defaultSteps = [
        { numero_etapa: 1, nome_etapa: 'FINANCEIRO CONFERIDO', descricao: 'Conferência dos saldos das contas bancárias.' },
        { numero_etapa: 2, nome_etapa: 'CONCILIAÇÃO BANCÁRIA', descricao: 'Importação e conciliação de todos os extratos.' },
        { numero_etapa: 3, nome_etapa: 'CONTAS A PAGAR', descricao: 'Baixas de pagamentos realizadas e conferidas.' },
        { numero_etapa: 4, nome_etapa: 'CONTAS A RECEBER', descricao: 'Baixas de recebimentos realizadas e conferidas.' },
        { numero_etapa: 5, nome_etapa: 'NF ENTRADA', descricao: 'Todas as notas de entrada registradas.' },
        { numero_etapa: 6, nome_etapa: 'NF SAÍDA', descricao: 'Todas as notas de saída emitidas e conferidas.' },
        { numero_etapa: 7, nome_etapa: 'IMPOSTOS', descricao: 'Apuração de impostos concluída.' },
        { numero_etapa: 8, nome_etapa: 'DOCUMENTOS ENVIADOS', descricao: 'Envio de documentação para a contabilidade.' },
        { numero_etapa: 9, nome_etapa: 'RETORNO CONTABILIDADE', descricao: 'Análise e aprovação do fechamento pela contabilidade.' },
        { numero_etapa: 10, nome_etapa: 'FECHAMENTO CONCLUÍDO', descricao: 'Processo de fechamento finalizado e bloqueado.' },
      ].map(step => ({
        fechamento_id: data.id,
        ...step,
        concluida: false
      }));

      await supabase.from('fechamento_etapas').insert(defaultSteps);

      // Create history
      await supabase.from('fechamento_historico').insert([{
        fechamento_id: data.id,
        acao: 'Criado',
        status_novo: data.status,
        usuario_id: userId,
        data_acao: new Date().toISOString(),
        observacoes: 'Fechamento criado e etapas iniciais geradas.'
      }]);

      toast({ title: 'Sucesso', description: 'Fechamento criado com sucesso.' });
      return data;
    } catch (error) {
      console.error('Error creating closing:', error);
      toast({ title: 'Erro', description: 'Falha ao criar fechamento.', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateClosing = async (id, updates, userId, oldStatus) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fechamentos_contabeis')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (updates.status && updates.status !== oldStatus) {
        await supabase.from('fechamento_historico').insert([{
          fechamento_id: id,
          acao: 'Status alterado',
          status_anterior: oldStatus,
          status_novo: updates.status,
          usuario_id: userId,
          data_acao: new Date().toISOString()
        }]);
      }

      toast({ title: 'Sucesso', description: 'Fechamento atualizado.' });
      return data;
    } catch (error) {
      console.error('Error updating closing:', error);
      toast({ title: 'Erro', description: 'Falha ao atualizar fechamento.', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteClosing = async (id) => {
    setLoading(true);
    try {
      await supabase.from('fechamento_etapas').delete().eq('fechamento_id', id);
      await supabase.from('fechamento_historico').delete().eq('fechamento_id', id);
      const { error } = await supabase.from('fechamentos_contabeis').delete().eq('id', id);
      
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Fechamento excluído.' });
      return true;
    } catch (error) {
      console.error('Error deleting closing:', error);
      toast({ title: 'Erro', description: 'Falha ao excluir fechamento.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const markStepComplete = async (fechamento_id, etapa, isCompleted, userId, todasEtapas) => {
    try {
      const { error } = await supabase
        .from('fechamento_etapas')
        .update({ 
          concluida: isCompleted,
          data_conclusao: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', etapa.id);

      if (error) throw error;

      // Update progress
      const updatedEtapas = todasEtapas.map(e => e.id === etapa.id ? { ...e, concluida: isCompleted } : e);
      const newProgress = calculateProgress(updatedEtapas);

      await supabase
        .from('fechamentos_contabeis')
        .update({ progresso: newProgress })
        .eq('id', fechamento_id);

      // Add to history
      await supabase.from('fechamento_historico').insert([{
        fechamento_id: fechamento_id,
        acao: isCompleted ? 'Etapa concluída' : 'Etapa reaberta',
        etapa_numero: etapa.numero_etapa,
        usuario_id: userId,
        data_acao: new Date().toISOString(),
        observacoes: `Etapa ${etapa.numero_etapa} - ${etapa.nome_etapa}`
      }]);

      return { success: true, newProgress, updatedEtapas };
    } catch (error) {
      console.error('Error marking step:', error);
      toast({ title: 'Erro', description: 'Falha ao atualizar etapa.', variant: 'destructive' });
      return { success: false };
    }
  };

  const finalizeClosing = async (id, userId, oldStatus) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('fechamentos_contabeis')
        .update({ 
          status: 'Concluído',
          data_conclusao: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('fechamento_historico').insert([{
        fechamento_id: id,
        acao: 'Status alterado',
        status_anterior: oldStatus,
        status_novo: 'Concluído',
        usuario_id: userId,
        data_acao: new Date().toISOString(),
        observacoes: 'Fechamento finalizado pelo usuário.'
      }]);

      toast({ title: 'Sucesso', description: 'Fechamento finalizado com sucesso!' });
      return true;
    } catch (error) {
      console.error('Error finalizing closing:', error);
      toast({ title: 'Erro', description: 'Falha ao finalizar fechamento.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reopenClosing = async (id, userId) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('fechamentos_contabeis')
        .update({ 
          status: 'Em andamento',
          data_conclusao: null
        })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('fechamento_historico').insert([{
        fechamento_id: id,
        acao: 'Reabertura',
        status_anterior: 'Concluído',
        status_novo: 'Em andamento',
        usuario_id: userId,
        data_acao: new Date().toISOString(),
        observacoes: 'Fechamento reaberto pelo usuário.'
      }]);

      toast({ title: 'Sucesso', description: 'Fechamento reaberto.' });
      return true;
    } catch (error) {
      console.error('Error reopening closing:', error);
      toast({ title: 'Erro', description: 'Falha ao reabrir fechamento.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = useCallback(async (fechamento_id) => {
    try {
      const { data, error } = await supabase
        .from('fechamento_historico')
        .select(`
          *,
          usuario:users!fechamento_historico_usuario_id_fkey(nome)
        `)
        .eq('fechamento_id', fechamento_id)
        .order('data_acao', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    }
  }, []);

  return {
    loading,
    fetchClosings,
    fetchClosingById,
    createClosing,
    updateClosing,
    deleteClosing,
    markStepComplete,
    finalizeClosing,
    reopenClosing,
    fetchHistory
  };
}
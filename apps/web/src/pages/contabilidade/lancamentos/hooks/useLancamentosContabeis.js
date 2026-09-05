import { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { validateLancamento } from '../utils/lancamentosUtils';

export function useLancamentosContabeis() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchLancamentos = async (filters) => {
    setLoading(true);
    try {
      let query = supabase
        .from('lancamentos_contabeis')
        .select(`
          *,
          empresa:empresas(id, razao_social, nome_fantasia),
          conta_debito:contas_contabeis!lancamentos_contabeis_conta_debito_id_fkey(id, codigo, nome),
          conta_credito:contas_contabeis!lancamentos_contabeis_conta_credito_id_fkey(id, codigo, nome),
          centro_custo:centros_custo(id, codigo, nome)
        `)
        .order('data', { ascending: false });

      if (filters?.empresa_id && filters.empresa_id !== 'all') query = query.eq('empresa_id', filters.empresa_id);
      if (filters?.competencia) query = query.eq('competencia', filters.competencia);
      if (filters?.origem && filters.origem !== 'Todas') query = query.eq('origem', filters.origem);
      if (filters?.status && filters.status !== 'Todos') query = query.eq('status', filters.status);
      if (filters?.search) {
        query = query.or(`historico.ilike.%${filters.search}%,documento_vinculado.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao buscar lançamentos.', variant: 'destructive' });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getLancamento = async (id) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lancamentos_contabeis')
        .select(`
          *,
          empresa:empresas(id, razao_social, nome_fantasia),
          conta_debito:contas_contabeis!lancamentos_contabeis_conta_debito_id_fkey(id, codigo, nome),
          conta_credito:contas_contabeis!lancamentos_contabeis_conta_credito_id_fkey(id, codigo, nome),
          centro_custo:centros_custo(id, codigo, nome)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao buscar detalhes do lançamento.', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createLancamento = async (lancamentoData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        ...lancamentoData,
        status: 'Rascunho',
        data_criacao: new Date().toISOString(),
        usuario_criacao_id: user?.id
      };

      const { data, error } = await supabase.from('lancamentos_contabeis').insert([payload]).select().single();
      if (error) throw error;

      await supabase.from('lancamentos_historico').insert([{
        lancamento_id: data.id,
        acao: 'Criado',
        status_novo: 'Rascunho',
        usuario_id: user?.id,
        observacoes: 'Lançamento criado como rascunho.'
      }]);

      toast({ title: 'Sucesso', description: 'Lançamento criado com sucesso.' });
      return data;
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao criar lançamento.', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateLancamento = async (id, lancamentoData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('lancamentos_contabeis').update(lancamentoData).eq('id', id);
      if (error) throw error;

      await supabase.from('lancamentos_historico').insert([{
        lancamento_id: id,
        acao: 'Editado',
        status_novo: lancamentoData.status,
        usuario_id: user?.id,
        observacoes: 'Lançamento editado manualmente.'
      }]);

      toast({ title: 'Sucesso', description: 'Lançamento atualizado com sucesso.' });
      return true;
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao atualizar lançamento.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteLancamento = async (id) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('lancamentos_contabeis').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Lançamento excluído com sucesso.' });
      return true;
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao excluir lançamento.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const changeLancamentoStatus = async (id, currentStatus, newStatus, notes = '') => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let updates = { status: newStatus };

      if (newStatus === 'Pendente') {
        updates.data_submissao = new Date().toISOString();
        updates.usuario_submissao_id = user?.id;
      } else if (newStatus === 'Conferido') {
        updates.data_aprovacao = new Date().toISOString();
        updates.usuario_aprovacao_id = user?.id;
      } else if (newStatus === 'Exportado') {
        updates.data_exportacao = new Date().toISOString();
      }

      const { error } = await supabase.from('lancamentos_contabeis').update(updates).eq('id', id);
      if (error) throw error;

      await supabase.from('lancamentos_historico').insert([{
        lancamento_id: id,
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

  const getLancamentoHistory = async (id) => {
    try {
      const { data, error } = await supabase
        .from('lancamentos_historico')
        .select('*, usuario:auth.users(email)') // Quick fallback if custom user table is complicated
        .eq('lancamento_id', id)
        .order('data_acao', { ascending: false });
      
      if (error) throw error;
      
      // Try to fetch from custom users table if auth.users fails or isn't joined properly
      const { data: historyWithUsers } = await supabase
        .from('lancamentos_historico')
        .select('*, usuario:users(nome, email)')
        .eq('lancamento_id', id)
        .order('data_acao', { ascending: false });

      return historyWithUsers || data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const exportBatch = async (ids) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('lancamentos_contabeis')
        .update({ status: 'Exportado', data_exportacao: now })
        .in('id', ids)
        .eq('status', 'Conferido');

      if (error) throw error;

      const historyRecords = ids.map(id => ({
        lancamento_id: id,
        acao: 'Exportado em lote',
        status_anterior: 'Conferido',
        status_novo: 'Exportado',
        usuario_id: user?.id,
        observacoes: 'Exportação em lote via sistema.'
      }));

      await supabase.from('lancamentos_historico').insert(historyRecords);

      toast({ title: 'Sucesso', description: `${ids.length} lançamentos exportados com sucesso.` });
      return true;
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao exportar lançamentos.', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchLancamentos,
    getLancamento,
    createLancamento,
    updateLancamento,
    deleteLancamento,
    changeLancamentoStatus,
    getLancamentoHistory,
    exportBatch
  };
}
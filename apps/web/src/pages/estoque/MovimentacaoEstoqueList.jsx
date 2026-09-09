import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

function MovimentacaoEstoqueList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [movRes, prodRes] = await Promise.all([
        supabase.from('movimentacao_estoque').select('*').order('data', { ascending: false }),
        supabase.from('produtos').select('id, nome, estoque_atual')
      ]);
      if (movRes.error) throw movRes.error;
      if (prodRes.error) throw prodRes.error;
      setMovimentacoes(movRes.data || []);
      setProdutos(prodRes.data || []);
    } catch (error) {
      console.error('[MovimentacaoEstoqueList] Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as movimentações.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getProdutoName = (id) => {
    const produto = produtos.find(p => p.id === id);
    return produto ? produto.nome : 'Produto não encontrado';
  };

  const handleEdit = (id) => {
    navigate(`/estoque/movimentacao/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta movimentação?')) {
      const { error } = await supabase.from('movimentacao_estoque').delete().eq('id', id);
      if (error) {
        toast({ title: 'Erro', description: error.message || 'Não foi possível excluir.', variant: 'destructive' });
        return;
      }
      await loadData();
      toast({ title: 'Movimentação excluída', description: 'Registro removido com sucesso.' });
    }
  };

  const handleApprove = async (item) => {
    if (!window.confirm('Aprovar este ajuste de estoque?')) return;

    try {
      const { error: updError } = await supabase
        .from('movimentacao_estoque')
        .update({ status: 'Concluído' })
        .eq('id', item.id);
      if (updError) throw updError;

      // Atualiza o estoque real do produto
      const prod = produtos.find(p => p.id === item.produto_id);
      if (prod) {
        const currentStock = parseFloat(prod.estoque_atual || 0);
        const qty = parseFloat(item.quantidade) || 0;
        // Ajuste: soma a quantidade informada (positivo aumenta, negativo diminui o estoque)
        const newStock = currentStock + qty;
        const { error: stockError } = await supabase
          .from('produtos')
          .update({ estoque_atual: newStock })
          .eq('id', prod.id);
        if (stockError) throw stockError;
      }

      await loadData();
      toast({ title: 'Aprovado', description: 'Estoque atualizado.' });
    } catch (error) {
      console.error('[MovimentacaoEstoqueList] Erro ao aprovar ajuste:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível aprovar este ajuste.', variant: 'destructive' });
    }
  };

  const filteredMovimentacoes = movimentacoes.filter(mov =>
    getProdutoName(mov.produto_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    mov.motivo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { header: 'Produto', render: (item) => getProdutoName(item.produto_id) },
    { 
      header: 'Tipo', 
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.tipo === 'Entrada' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' :
            item.tipo === 'Saída' ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
        }`}>
          {item.tipo}
        </span>
      )
    },
    { header: 'Quantidade', accessor: 'quantidade' },
    { header: 'Status', render: (item) => (
        <div className="flex items-center gap-2">
            <span className={`text-xs ${item.status === 'Pendente' ? 'text-orange-600 font-bold' : 'text-muted-foreground'}`}>
                {item.status || 'Concluído'}
            </span>
            {item.status === 'Pendente' && (
                <Button size="xs" variant="ghost" className="h-6 w-6 p-0 bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400" onClick={() => handleApprove(item)} title="Aprovar">
                    <Check className="h-3 w-3" />
                </Button>
            )}
        </div>
    )},
    { header: 'Data', render: (item) => item.data ? new Date(item.data).toLocaleDateString() : '-' },
    { header: 'Motivo', accessor: 'motivo' }
  ];

  return (
    <>
      <Helmet><title>Movimentação de Estoque - Engagement Soluções</title></Helmet>
      <PageHeader
        title="Movimentação de Estoque"
        description="Registro de entradas e saídas"
        action={
          <Button onClick={() => navigate('/estoque/movimentacao/novo')} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Movimentação
          </Button>
        }
      />
      <div className="mb-6">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar..." />
      </div>
      <DataTable
        data={filteredMovimentacoes}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
        emptyMessage="Nenhuma movimentação registrada"
      />
    </>
  );
}

export default MovimentacaoEstoqueList;
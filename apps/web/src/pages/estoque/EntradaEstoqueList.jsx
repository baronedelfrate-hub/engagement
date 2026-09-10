import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

function EntradaEstoqueList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entradas, setEntradas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [entradasRes, produtosRes] = await Promise.all([
        supabase.from('entradas_estoque').select('*').order('data_entrada', { ascending: false }),
        supabase.from('produtos').select('id, nome')
      ]);
      if (entradasRes.error) throw entradasRes.error;
      if (produtosRes.error) throw produtosRes.error;
      setEntradas(entradasRes.data || []);
      setProdutos(produtosRes.data || []);
    } catch (error) {
      console.error('[EntradaEstoqueList] Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as entradas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getProdutoName = (id) => {
    const produto = produtos.find(p => p.id === id);
    return produto ? produto.nome : 'Produto não encontrado';
  };

  const handleEdit = (id) => {
    navigate(`/estoque/entrada/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta entrada?')) {
      const { error } = await supabase.from('entradas_estoque').delete().eq('id', id);
      if (error) {
        toast({ title: 'Erro', description: error.message || 'Não foi possível excluir.', variant: 'destructive' });
        return;
      }
      await loadData();
      toast({
        title: "Entrada excluída",
        description: "O registro de entrada foi removido com sucesso.",
      });
    }
  };

  const filteredEntradas = entradas.filter(entrada =>
    getProdutoName(entrada.produto_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    entrada.referencia?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      header: 'Produto',
      render: (item) => getProdutoName(item.produto_id)
    },
    {
      header: 'Quantidade',
      accessor: 'quantidade'
    },
    {
      header: 'Data',
      render: (item) => item.data_entrada ? new Date(item.data_entrada).toLocaleDateString() : '-'
    },
    {
      header: 'Documento',
      accessor: 'referencia'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Entrada de Estoque - ERP Platform</title>
      </Helmet>

      <PageHeader
        title="Entrada de Estoque"
        description="Gerencie as entradas de produtos"
        action={
          <Button onClick={() => navigate('/estoque/entrada/novo')} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Entrada
          </Button>
        }
      />

      <div className="mb-6">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por produto ou documento..."
        />
      </div>

      <DataTable
        data={filteredEntradas}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
        emptyMessage="Nenhuma entrada registrada"
      />
    </>
  );
}

export default EntradaEstoqueList;

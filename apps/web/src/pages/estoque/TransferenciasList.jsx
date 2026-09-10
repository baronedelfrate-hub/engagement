import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

function TransferenciasList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transferenciasRes, produtosRes] = await Promise.all([
        supabase.from('transferencias').select('*').order('data', { ascending: false }),
        supabase.from('produtos').select('id, nome')
      ]);
      if (transferenciasRes.error) throw transferenciasRes.error;
      if (produtosRes.error) throw produtosRes.error;
      setItems(transferenciasRes.data || []);
      setProdutos(produtosRes.data || []);
    } catch (error) {
      console.error('[TransferenciasList] Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as transferências.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getProdutoName = (id) => {
    const p = produtos.find(x => x.id === id);
    return p ? p.nome : 'Desconhecido';
  };

  const handleDelete = async (id) => {
    if (window.confirm('Excluir esta transferência?')) {
      const { error } = await supabase.from('transferencias').delete().eq('id', id);
      if (error) {
        toast({ title: 'Erro', description: error.message || 'Não foi possível excluir.', variant: 'destructive' });
        return;
      }
      await loadData();
      toast({ title: "Excluído", description: "Registro removido." });
    }
  };

  const handleEdit = () => {
      // Usually transfers are immutable once done, but for CRUD completeness:
      navigate(`/estoque/transferencias`);
      toast({ title: "Visualização", description: "Edição de transferência concluída não permitida." });
  };

  const filteredItems = items.filter(item =>
    getProdutoName(item.produto_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { header: 'Produto', render: (item) => getProdutoName(item.produto_id) },
    { header: 'Qtd', accessor: 'quantidade' },
    {
        header: 'Origem -> Destino',
        render: (item) => (
            <div className="flex items-center gap-2 text-sm">
                <span className="bg-red-50 text-red-700 px-2 py-1 rounded dark:bg-red-950/30 dark:text-red-400">{item.origem}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="bg-green-50 text-green-700 px-2 py-1 rounded dark:bg-green-950/30 dark:text-green-400">{item.destino}</span>
            </div>
        )
    },
    { header: 'Data', render: (item) => item.data ? new Date(item.data).toLocaleDateString() : '-' },
    { header: 'Status', accessor: 'status' }
  ];

  return (
    <>
      <Helmet><title>Transferências - ERP Platform</title></Helmet>
      <PageHeader
        title="Transferências de Estoque"
        description="Movimentação entre locais"
        action={
          <Button onClick={() => navigate('/estoque/transferencias/novo')} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Transferência
          </Button>
        }
      />
      <div className="mb-6">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar..." />
      </div>
      <DataTable
        data={filteredItems}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
        emptyMessage="Nenhuma transferência registrada"
      />
    </>
  );
}

export default TransferenciasList;

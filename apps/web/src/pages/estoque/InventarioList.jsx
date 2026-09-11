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
import { formatDateOnly } from '@/lib/dateUtils';

function InventarioList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [inventarios, setInventarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inventariosRes, produtosRes] = await Promise.all([
        supabase.from('inventario').select('*').order('data_contagem', { ascending: false }),
        supabase.from('produtos').select('id, nome')
      ]);
      if (inventariosRes.error) throw inventariosRes.error;
      if (produtosRes.error) throw produtosRes.error;
      setInventarios(inventariosRes.data || []);
      setProdutos(produtosRes.data || []);
    } catch (error) {
      console.error('[InventarioList] Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar o inventário.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getProdutoName = (id) => {
    const produto = produtos.find(p => p.id === id);
    return produto ? produto.nome : 'Produto não encontrado';
  };

  const handleEdit = (id) => {
    navigate(`/estoque/inventario/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      const { error } = await supabase.from('inventario').delete().eq('id', id);
      if (error) {
        toast({ title: 'Erro', description: error.message || 'Não foi possível excluir.', variant: 'destructive' });
        return;
      }
      await loadData();
      toast({ title: "Inventário excluído", description: "Registro removido com sucesso." });
    }
  };

  const filteredInventarios = inventarios.filter(inv =>
    getProdutoName(inv.produto_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { header: 'Produto', render: (item) => getProdutoName(item.produto_id) },
    { header: 'Qtd Contada', accessor: 'quantidade_contada' },
    { header: 'Qtd Sistema', accessor: 'quantidade_sistema' },
    { header: 'Diferença', accessor: 'diferenca' },
    { header: 'Data Contagem', render: (item) => formatDateOnly(item.data_contagem) }
  ];

  return (
    <>
      <Helmet><title>Inventário - ERP Platform</title></Helmet>
      <PageHeader
        title="Inventário"
        description="Contagem e conferência de estoque"
        action={
          <Button onClick={() => navigate('/estoque/inventario/novo')} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Inventário
          </Button>
        }
      />
      <div className="mb-6">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por produto..." />
      </div>
      <DataTable
        data={filteredInventarios}
        columns={columns}
        onEdit={(row) => handleEdit(row.id)}
        onDelete={handleDelete}
        loading={loading}
        emptyMessage="Nenhum inventário registrado"
      />
    </>
  );
}

export default InventarioList;

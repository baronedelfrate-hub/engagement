import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

function EntradaEstoqueList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entradas, setEntradas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setEntradas(storage.get('ENTRADA_ESTOQUE'));
    setProdutos(storage.get('PRODUTOS'));
  };

  const getProdutoName = (id) => {
    const produto = produtos.find(p => p.id === id);
    return produto ? produto.nome : 'Produto não encontrado';
  };

  const handleEdit = (id) => {
    navigate(`/estoque/entrada/${id}`);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta entrada?')) {
      storage.delete('ENTRADA_ESTOQUE', id);
      loadData();
      toast({
        title: "Entrada excluída",
        description: "O registro de entrada foi removido com sucesso.",
      });
    }
  };

  const filteredEntradas = entradas.filter(entrada =>
    getProdutoName(entrada.produtoId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    entrada.documentoOrigem?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { 
      header: 'Produto', 
      render: (item) => getProdutoName(item.produtoId)
    },
    { 
      header: 'Quantidade', 
      accessor: 'quantidade' 
    },
    { 
      header: 'Data', 
      render: (item) => new Date(item.data).toLocaleDateString() 
    },
    { 
      header: 'Documento', 
      accessor: 'documentoOrigem' 
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
        emptyMessage="Nenhuma entrada registrada"
      />
    </>
  );
}

export default EntradaEstoqueList;
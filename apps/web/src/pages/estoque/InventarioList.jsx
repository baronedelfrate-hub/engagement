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

function InventarioList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [inventarios, setInventarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setInventarios(storage.get('INVENTARIO'));
    setProdutos(storage.get('PRODUTOS'));
  };

  const getProdutoName = (id) => {
    const produto = produtos.find(p => p.id === id);
    return produto ? produto.nome : 'Produto não encontrado';
  };

  const handleEdit = (id) => {
    navigate(`/estoque/inventario/${id}`);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      storage.delete('INVENTARIO', id);
      loadData();
      toast({ title: "Inventário excluído", description: "Registro removido com sucesso." });
    }
  };

  const filteredInventarios = inventarios.filter(inv =>
    getProdutoName(inv.produtoId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { header: 'Produto', render: (item) => getProdutoName(item.produtoId) },
    { header: 'Qtd Contada', accessor: 'quantidadeContada' },
    { header: 'Qtd Sistema', accessor: 'quantidadeSistema' },
    { header: 'Diferença', accessor: 'diferenca' },
    { header: 'Data Contagem', render: (item) => new Date(item.dataContagem).toLocaleDateString() }
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
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="Nenhum inventário registrado"
      />
    </>
  );
}

export default InventarioList;
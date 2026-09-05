import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Bookmark } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import DataTable from '@/components/DataTable';
import { storage } from '@/lib/storage';

function ReservasList() {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setItems(storage.get('RESERVAS'));
    setProdutos(storage.get('PRODUTOS'));
    setPedidos(storage.get('PEDIDOS'));
  };

  const getProdutoName = (id) => {
    const p = produtos.find(x => x.id === id);
    return p ? p.nome : 'Desconhecido';
  };

  const getPedidoInfo = (id) => {
      const p = pedidos.find(x => x.id === id);
      return p ? `Pedido #${id.slice(0,8)}` : 'Manual';
  };

  // Read-only list, no edit/delete action exposed directly here for safety, 
  // as reservations are tied to Orders mostly.
  const handleEdit = () => {}; 
  const handleDelete = () => {};

  const filteredItems = items.filter(item =>
    getProdutoName(item.produtoId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { header: 'Produto', render: (item) => getProdutoName(item.produtoId) },
    { header: 'Qtd Reservada', accessor: 'quantidade' },
    { header: 'Origem', render: (item) => getPedidoInfo(item.pedidoId) },
    { header: 'Data', render: (item) => new Date(item.dataReserva).toLocaleDateString() },
    { header: 'Status', accessor: 'status' }
  ];

  return (
    <>
      <Helmet><title>Reservas - ERP Platform</title></Helmet>
      <PageHeader
        title="Reservas de Estoque"
        description="Itens comprometidos em pedidos de venda"
      />
      <div className="mb-6">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por produto..." />
      </div>
      <DataTable
        data={filteredItems}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="Nenhuma reserva ativa"
      />
    </>
  );
}

export default ReservasList;
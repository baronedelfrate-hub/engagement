import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import DataTable from '@/components/DataTable';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { formatDateOnly } from '@/lib/dateUtils';

function ReservasList() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reservasRes, produtosRes, pedidosRes] = await Promise.all([
        supabase.from('reservas').select('*').order('data_reserva', { ascending: false }),
        supabase.from('produtos').select('id, nome'),
        supabase.from('pedidos_venda').select('id')
      ]);
      if (reservasRes.error) throw reservasRes.error;
      if (produtosRes.error) throw produtosRes.error;
      if (pedidosRes.error) throw pedidosRes.error;
      setItems(reservasRes.data || []);
      setProdutos(produtosRes.data || []);
      setPedidos(pedidosRes.data || []);
    } catch (error) {
      console.error('[ReservasList] Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as reservas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
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
    getProdutoName(item.produto_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { header: 'Produto', render: (item) => getProdutoName(item.produto_id) },
    { header: 'Qtd Reservada', accessor: 'quantidade' },
    { header: 'Origem', render: (item) => getPedidoInfo(item.pedido_id) },
    { header: 'Data', render: (item) => formatDateOnly(item.data_reserva) },
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
        loading={loading}
        emptyMessage="Nenhuma reserva ativa"
      />
    </>
  );
}

export default ReservasList;

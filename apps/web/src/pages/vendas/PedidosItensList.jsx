import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';

const PedidosItensList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const fetchData = async (page = 1) => {
    setLoading(true);
    const res = await erpServices.pedidosVendaItens.list({ page, limit: 10 });
    if (res.success) {
      setData(res.data);
      setPagination({ page: res.page, limit: res.limit, total: res.total, totalPages: res.totalPages });
    } else {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'ID Pedido', accessorKey: 'pedido_id', sortable: true },
    { header: 'Produto', accessorKey: 'produto_id' }, // Idealmente faria um join ou busca pelo nome
    { header: 'Quantidade', accessorKey: 'quantidade' },
    { header: 'Valor Unitário', accessorKey: 'valor_unitario', cell: ({ row }) => `R$ ${parseFloat(row.valor_unitario).toFixed(2)}` },
    { header: 'Total', accessorKey: 'valor_total', cell: ({ row }) => `R$ ${parseFloat(row.valor_total).toFixed(2)}` },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="Itens de Pedidos de Venda"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={fetchData}
        onCreate={() => navigate('/vendas/pedidos-itens/novo')}
        onEdit={(row) => navigate(`/vendas/pedidos-itens/${row.id}`)}
        onDelete={async (id) => {
            const res = await erpServices.pedidosVendaItens.delete(id);
            if(res.success) fetchData();
            else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default PedidosItensList;
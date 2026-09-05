import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const MovimentacoesFinanceirasList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const fetchData = async (page = 1) => {
    setLoading(true);
    const res = await erpServices.movimentacoesFinanceiras.list({ page, limit: 10 });
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
    { header: 'Data', accessorKey: 'data_movimento', cell: ({ row }) => new Date(row.data_movimento).toLocaleDateString() },
    { header: 'Descrição', accessorKey: 'descricao' },
    { 
        header: 'Tipo', 
        accessorKey: 'tipo',
        cell: ({ row }) => <Badge variant={row.tipo === 'entrada' ? 'success' : 'destructive'}>{row.tipo === 'entrada' ? 'Entrada' : 'Saída'}</Badge>
    },
    { 
        header: 'Valor', 
        accessorKey: 'valor',
        cell: ({ row }) => <span className={row.tipo === 'entrada' ? 'text-green-500' : 'text-red-500'}>R$ {parseFloat(row.valor).toFixed(2)}</span>
    },
    { header: 'Conta Bancária', accessorKey: 'conta_id' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="Movimentações Financeiras"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={fetchData}
        onCreate={() => navigate('/financeiro/movimentacoes/novo')}
        onEdit={(row) => navigate(`/financeiro/movimentacoes/${row.id}`)}
        onDelete={async (id) => {
            const res = await erpServices.movimentacoesFinanceiras.delete(id);
            if(res.success) fetchData();
            else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default MovimentacoesFinanceirasList;
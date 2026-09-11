import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { formatDateOnly } from '@/lib/dateUtils';

const NotasFiscaisEntradaList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const fetchData = async (page = 1) => {
    setLoading(true);
    const res = await erpServices.notasFiscaisEntrada.list({ page, limit: 10 });
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
    { header: 'Número', accessorKey: 'numero', sortable: true },
    { header: 'Série', accessorKey: 'serie' },
    { header: 'Emissão', accessorKey: 'data_emissao', cell: ({ row }) => formatDateOnly(row.data_emissao) },
    { header: 'Fornecedor', accessorKey: 'fornecedor_id' },
    { header: 'Valor Total', accessorKey: 'valor_total', cell: ({ row }) => `R$ ${parseFloat(row.valor_total).toFixed(2)}` },
    { 
        header: 'Status', 
        accessorKey: 'status',
        cell: ({ row }) => <Badge variant={row.status === 'processada' ? 'success' : 'secondary'}>{row.status}</Badge>
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="Notas Fiscais de Entrada"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={fetchData}
        onCreate={() => navigate('/compras/notas-fiscais-entrada/novo')}
        onEdit={(row) => navigate(`/compras/notas-fiscais-entrada/${row.id}`)}
        onDelete={async (id) => {
            const res = await erpServices.notasFiscaisEntrada.delete(id);
            if(res.success) fetchData();
            else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default NotasFiscaisEntradaList;
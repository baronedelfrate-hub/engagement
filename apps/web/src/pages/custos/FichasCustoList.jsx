import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const FichasCustoList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await erpServices.fichasCusto.list({ limit: 50 });
    if (res.success) {
      setData(res.data);
    } else {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'Código', accessorKey: 'codigo', sortable: true },
    { header: 'Descrição', accessorKey: 'descricao' },
    { header: 'Data Criação', accessorKey: 'created_at', cell: ({ row }) => new Date(row.created_at).toLocaleDateString() },
    { 
        header: 'Status', 
        accessorKey: 'status',
        cell: ({ row }) => <Badge variant={row.status === 'ativo' ? 'success' : 'secondary'}>{row.status}</Badge>
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="Fichas de Custo"
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page: 1, limit: 50, total: data.length, totalPages: 1 }}
        onPageChange={() => {}}
        onCreate={() => navigate('/custos/fichas-custo/novo')}
        onEdit={(row) => navigate(`/custos/fichas-custo/${row.id}`)}
        onDelete={async (id) => {
            const res = await erpServices.fichasCusto.delete(id);
            if(res.success) fetchData();
            else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default FichasCustoList;
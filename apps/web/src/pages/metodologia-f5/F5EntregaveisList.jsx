import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const F5EntregaveisList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await erpServices.f5Entregaveis.list({ limit: 50 });
    if (res.success) {
      setData(res.data);
    } else {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'Nome', accessorKey: 'nome', sortable: true },
    { header: 'Etapa', accessorKey: 'etapa_f5_id' },
    { header: 'Entrega', accessorKey: 'data_entrega', cell: ({ row }) => new Date(row.data_entrega).toLocaleDateString() },
    { header: 'Responsável', accessorKey: 'responsavel' },
    { 
        header: 'Status', 
        accessorKey: 'status',
        cell: ({ row }) => <Badge variant="outline">{row.status}</Badge>
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="Entregáveis F5"
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page: 1, limit: 50, total: data.length, totalPages: 1 }}
        onPageChange={() => {}}
        onCreate={() => navigate('/metodologia-f5/entregaveis/novo')}
        onEdit={(row) => navigate(`/metodologia-f5/entregaveis/${row.id}`)}
        onDelete={async (id) => {
            const res = await erpServices.f5Entregaveis.delete(id);
            if(res.success) fetchData();
            else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default F5EntregaveisList;
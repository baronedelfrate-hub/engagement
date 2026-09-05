import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const F5EtapasList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await erpServices.f5Etapas.list({ limit: 50 });
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
    { header: 'Projeto', accessorKey: 'projeto_f5_id' },
    { header: 'Início', accessorKey: 'data_inicio', cell: ({ row }) => new Date(row.data_inicio).toLocaleDateString() },
    { header: 'Fim', accessorKey: 'data_fim', cell: ({ row }) => row.data_fim ? new Date(row.data_fim).toLocaleDateString() : '-' },
    { 
        header: 'Status', 
        accessorKey: 'status',
        cell: ({ row }) => <Badge variant="outline">{row.status}</Badge>
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="Etapas F5"
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page: 1, limit: 50, total: data.length, totalPages: 1 }}
        onPageChange={() => {}}
        onCreate={() => navigate('/metodologia-f5/etapas/novo')}
        onEdit={(row) => navigate(`/metodologia-f5/etapas/${row.id}`)}
        onDelete={async (id) => {
            const res = await erpServices.f5Etapas.delete(id);
            if(res.success) fetchData();
            else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default F5EtapasList;
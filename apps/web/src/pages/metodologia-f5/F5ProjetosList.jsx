import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const F5ProjetosList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await erpServices.f5Projetos.list({ limit: 50 });
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
    { header: 'Cliente', accessorKey: 'cliente_id' },
    { 
        header: 'Fase Atual', 
        accessorKey: 'fase_atual',
        cell: ({ row }) => <Badge>{row.fase_atual}</Badge>
    },
    { header: 'Início', accessorKey: 'data_inicio', cell: ({ row }) => new Date(row.data_inicio).toLocaleDateString() },
    { header: 'Progresso', accessorKey: 'progresso', cell: ({ row }) => `${row.progresso}%` },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="Projetos F5"
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page: 1, limit: 50, total: data.length, totalPages: 1 }}
        onPageChange={() => {}}
        onCreate={() => navigate('/metodologia-f5/projetos/novo')}
        onEdit={(row) => navigate(`/metodologia-f5/projetos/${row.id}`)}
        onDelete={async (id) => {
            const res = await erpServices.f5Projetos.delete(id);
            if(res.success) fetchData();
            else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default F5ProjetosList;
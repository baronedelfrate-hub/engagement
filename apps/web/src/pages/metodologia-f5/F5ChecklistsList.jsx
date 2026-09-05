import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';

const F5ChecklistsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await erpServices.f5Checklists.list({ limit: 50 });
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
    { header: 'Total Itens', accessorKey: 'total_itens' },
    { header: 'Concluídos', accessorKey: 'itens_concluidos' },
    { header: '% Conclusão', accessorKey: 'percentual_conclusao', cell: ({ row }) => `${row.percentual_conclusao}%` },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="Checklists F5"
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page: 1, limit: 50, total: data.length, totalPages: 1 }}
        onPageChange={() => {}}
        onCreate={() => navigate('/metodologia-f5/checklists/novo')}
        onEdit={(row) => navigate(`/metodologia-f5/checklists/${row.id}`)}
        onDelete={async (id) => {
            const res = await erpServices.f5Checklists.delete(id);
            if(res.success) fetchData();
            else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default F5ChecklistsList;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const F5ChecklistsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [res, etapasRes] = await Promise.all([
      erpServices.f5Checklists.list({ limit: 50 }),
      erpServices.f5Etapas.list({ limit: 100 })
    ]);
    if (res.success) {
      setData(res.data);
    } else {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    }
    if (etapasRes.success) setEtapas(etapasRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getEtapaNome = (id) => etapas.find(e => e.id === id)?.nome || '-';

  const columns = [
    { header: 'Item', accessorKey: 'item', sortable: true },
    { header: 'Etapa', cell: ({ row }) => getEtapaNome(row.etapa_id) },
    { header: 'Descrição', accessorKey: 'descricao' },
    {
        header: 'Status',
        cell: ({ row }) => row.concluido
          ? <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">Concluído</Badge>
          : <Badge variant="outline">Pendente</Badge>
    },
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

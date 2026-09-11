import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { formatDateOnly } from '@/lib/dateUtils';

const F5EntregaveisList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [res, etapasRes] = await Promise.all([
      erpServices.f5Entregaveis.list({ limit: 50 }),
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
    { header: 'Nome', accessorKey: 'nome', sortable: true },
    { header: 'Etapa', cell: ({ row }) => getEtapaNome(row.etapa_id) },
    { header: 'Entrega', accessorKey: 'data_entrega', cell: ({ row }) => formatDateOnly(row.data_entrega) },
    {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => <Badge variant="outline">{row.status || '-'}</Badge>
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

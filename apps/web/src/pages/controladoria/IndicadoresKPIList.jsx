import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const IndicadoresKPIList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await erpServices.indicadoresKpi.list({ limit: 100 });
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
    { header: 'Meta', accessorKey: 'meta' },
    { header: 'Valor Atual', accessorKey: 'valor_atual' },
    { 
        header: 'Status', 
        accessorKey: 'status',
        cell: ({ row }) => {
            const colors = {
                'on_track': 'success',
                'at_risk': 'warning',
                'off_track': 'destructive'
            };
            const labels = {
                'on_track': 'Na Meta',
                'at_risk': 'Em Risco',
                'off_track': 'Fora da Meta'
            };
            return <Badge variant={colors[row.status] || 'secondary'}>{labels[row.status] || row.status}</Badge>;
        }
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="Indicadores KPI"
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page: 1, limit: 100, total: data.length, totalPages: 1 }}
        onPageChange={() => {}}
        onCreate={() => navigate('/controladoria/indicadores-kpi/novo')}
        onEdit={(row) => navigate(`/controladoria/indicadores-kpi/${row.id}`)}
        onDelete={async (id) => {
            const res = await erpServices.indicadoresKpi.delete(id);
            if(res.success) fetchData();
            else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default IndicadoresKPIList;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const F5KPIsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [res, projetosRes] = await Promise.all([
      erpServices.f5Kpis.list({ limit: 50 }),
      erpServices.f5Projetos.list({ limit: 100 })
    ]);
    if (res.success) {
      setData(res.data);
    } else {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    }
    if (projetosRes.success) setProjetos(projetosRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getProjetoNome = (id) => projetos.find(p => p.id === id)?.nome || '-';

  const columns = [
    { header: 'Nome', accessorKey: 'nome', sortable: true },
    { header: 'Projeto', cell: ({ row }) => getProjetoNome(row.projeto_id) },
    { header: 'Valor Atual', cell: ({ row }) => `${row.valor_atual ?? '-'} ${row.unidade || ''}` },
    { header: 'Meta', cell: ({ row }) => `${row.valor_meta ?? '-'} ${row.unidade || ''}` },
    {
        header: '% Atingido',
        cell: ({ row }) => {
          if (!row.valor_meta || !row.valor_atual) return '-';
          const pct = Math.round((row.valor_atual / row.valor_meta) * 100);
          return <Badge variant={pct >= 100 ? 'success' : 'outline'}>{pct}%</Badge>;
        }
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="KPIs F5"
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page: 1, limit: 50, total: data.length, totalPages: 1 }}
        onPageChange={() => {}}
        onCreate={() => navigate('/metodologia-f5/kpis/novo')}
        onEdit={(row) => navigate(`/metodologia-f5/kpis/${row.id}`)}
        onDelete={async (id) => {
            const res = await erpServices.f5Kpis.delete(id);
            if(res.success) fetchData();
            else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default F5KPIsList;

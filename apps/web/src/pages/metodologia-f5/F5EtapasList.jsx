import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { formatDateOnly } from '@/lib/dateUtils';

const F5EtapasList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [res, projetosRes] = await Promise.all([
      erpServices.f5Etapas.list({ limit: 50 }),
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
    {
      header: 'Nome',
      cell: ({ row }) => (
        <button
          type="button"
          className="font-medium text-primary hover:underline text-left"
          onClick={() => navigate(`/metodologia-f5/etapas/${row.id}/detalhe`)}
        >
          {row.nome}
        </button>
      )
    },
    { header: 'Projeto', cell: ({ row }) => getProjetoNome(row.projeto_id) },
    { header: 'Número', accessorKey: 'numero' },
    { header: 'Início', accessorKey: 'data_inicio', cell: ({ row }) => formatDateOnly(row.data_inicio) },
    { header: 'Fim', accessorKey: 'data_fim', cell: ({ row }) => formatDateOnly(row.data_fim) },
    {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => <Badge variant="outline">{row.status || '-'}</Badge>
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

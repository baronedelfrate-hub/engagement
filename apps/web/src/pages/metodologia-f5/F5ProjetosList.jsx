import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { formatDateOnly } from '@/lib/dateUtils';

const F5ProjetosList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [res, usersRes] = await Promise.all([
      erpServices.f5Projetos.list({ limit: 50 }),
      erpServices.users.list({ limit: 100 })
    ]);
    if (res.success) {
      setData(res.data);
    } else {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    }
    if (usersRes.success) setUsuarios(usersRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getResponsavelNome = (id) => usuarios.find(u => u.id === id)?.nome || '-';

  const columns = [
    { header: 'Nome', accessorKey: 'nome', sortable: true },
    { header: 'Responsável', cell: ({ row }) => getResponsavelNome(row.responsavel_id) },
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

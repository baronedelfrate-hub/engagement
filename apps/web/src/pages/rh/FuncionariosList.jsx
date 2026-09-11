import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { formatDateOnly } from '@/lib/dateUtils';

const FuncionariosList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const fetchData = async (page = 1) => {
    setLoading(true);
    const res = await erpServices.funcionarios.list({ page, limit: 10 });
    if (res.success) {
      setData(res.data);
      setPagination({ page: res.page, limit: res.limit, total: res.total, totalPages: res.totalPages });
    } else {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'Nome Completo', accessorKey: 'nome', sortable: true },
    { header: 'Cargo', accessorKey: 'cargo' },
    { header: 'Departamento', accessorKey: 'departamento' },
    { header: 'Admissão', accessorKey: 'data_admissao', cell: ({ row }) => formatDateOnly(row.data_admissao) },
    { 
        header: 'Status', 
        accessorKey: 'status',
        cell: ({ row }) => <Badge variant={row.status === 'ativo' ? 'success' : 'secondary'}>{row.status}</Badge>
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="Funcionários"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={fetchData}
        onCreate={() => navigate('/rh/funcionarios/novo')}
        onEdit={(row) => navigate(`/rh/funcionarios/${row.id}`)}
        onDelete={async (id) => {
            const res = await erpServices.funcionarios.delete(id);
            if(res.success) fetchData();
            else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default FuncionariosList;
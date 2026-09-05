import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const DRELinhasList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await erpServices.dreLinhas.list({ limit: 100, sortBy: 'ordem', sortOrder: 'asc' });
    if (res.success) {
      setData(res.data);
    } else {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'Ordem', accessorKey: 'ordem', sortable: true },
    { header: 'Código', accessorKey: 'codigo' },
    { header: 'Descrição', accessorKey: 'descricao' },
    { 
        header: 'Tipo', 
        accessorKey: 'tipo',
        cell: ({ row }) => <Badge variant="outline">{row.tipo}</Badge>
    },
    { 
        header: 'Status', 
        accessorKey: 'ativo',
        cell: ({ row }) => <Badge variant={row.ativo ? 'default' : 'secondary'}>{row.ativo ? 'Ativo' : 'Inativo'}</Badge>
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="Estrutura do DRE"
        columns={columns}
        data={data}
        loading={loading}
        pagination={{ page: 1, limit: 100, total: data.length, totalPages: 1 }}
        onPageChange={() => {}}
        onCreate={() => navigate('/controladoria/dre-linhas/novo')}
        onEdit={(row) => navigate(`/controladoria/dre-linhas/${row.id}`)}
        onDelete={async (id) => {
            const res = await erpServices.dreLinhas.delete(id);
            if(res.success) fetchData();
            else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default DRELinhasList;
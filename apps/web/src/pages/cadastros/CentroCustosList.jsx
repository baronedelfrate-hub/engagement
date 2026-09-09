import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { Badge } from '@/components/ui/badge';

const CentroCustosList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await erpServices.centrosCusto.list({});
    if (res.success) setData(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { 
      header: 'Código', 
      accessorKey: 'codigo', 
      sortable: true,
      cell: ({ row }) => <span className="text-foreground font-mono">{row.codigo}</span>
    },
    { 
      header: 'Nome', 
      accessorKey: 'nome', 
      sortable: true,
      cell: ({ row }) => <span className="text-foreground font-medium">{row.nome}</span>
    },
    { 
      header: 'Descrição', 
      accessorKey: 'descricao',
      cell: ({ row }) => <span className="text-foreground">{row.descricao}</span>
    },
    { 
        header: 'Ativo', 
        accessorKey: 'ativo',
        cell: ({ row }) => (
            <Badge variant={row.ativo ? 'success' : 'secondary'} className={row.ativo ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-muted text-foreground'}>
                {row.ativo ? 'Sim' : 'Não'}
            </Badge>
        )
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-muted">
      <CRUDTable
        title={<span className="text-foreground">Centros de Custo</span>}
        columns={columns}
        data={data}
        loading={loading}
        onCreate={() => navigate('/cadastros/centro-custos/novo')}
        onEdit={(row) => navigate(`/cadastros/centro-custos/${row.id}`)}
        onDelete={async (id) => { await erpServices.centrosCusto.delete(id); fetchData(); }}
        pagination={{ page: 1, limit: 100, total: data.length, totalPages: 1 }}
        onPageChange={() => {}}
      />
    </div>
  );
};

export default CentroCustosList;
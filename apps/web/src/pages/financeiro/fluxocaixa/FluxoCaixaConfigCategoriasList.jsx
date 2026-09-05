import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const FluxoCaixaConfigCategoriasList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const fetchData = async (page = 1) => {
    setLoading(true);
    const res = await erpServices.fluxoCaixaConfigCategorias.list({ page, limit: 10 });
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
    { header: 'Nome', accessorKey: 'nome', sortable: true },
    { 
        header: 'Tipo', 
        accessorKey: 'tipo',
        cell: ({ row }) => <Badge variant={row.tipo === 'receita' ? 'success' : 'destructive'}>{row.tipo}</Badge>
    },
    { 
        header: 'Cor', 
        accessorKey: 'cor',
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: row.cor }}></div>
                <span className="text-xs text-muted-foreground">{row.cor}</span>
            </div>
        )
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
        title="Categorias de Fluxo de Caixa"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={fetchData}
        onCreate={() => navigate('/financeiro/fluxo-caixa/config-categorias/novo')}
        onEdit={(row) => navigate(`/financeiro/fluxo-caixa/config-categorias/${row.id}`)}
        onDelete={async (id) => {
            const res = await erpServices.fluxoCaixaConfigCategorias.delete(id);
            if(res.success) fetchData();
            else toast({ title: 'Erro', description: res.error, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default FluxoCaixaConfigCategoriasList;
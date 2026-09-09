import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const FornecedoresList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ field: 'created_at', order: 'desc' });

  const fetchData = async (page = 1, searchTerm = search) => {
    setLoading(true);
    const res = await erpServices.fornecedores.list({
      page,
      limit: pagination.limit,
      search: searchTerm,
      sortBy: sort.field,
      sortOrder: sort.order,
      searchColumns: ['nome', 'email', 'cnpj']
    });

    if (res.success) {
      setData(res.data);
      setPagination({ 
        page: res.page, 
        limit: res.limit, 
        total: res.total, 
        totalPages: res.totalPages 
      });
    } else {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [sort]);

  const handleDelete = async (id) => {
    const res = await erpServices.fornecedores.delete(id);
    if (res.success) {
      toast({ title: 'Sucesso', description: 'Fornecedor removido com sucesso.' });
      fetchData(pagination.page);
    } else {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    }
  };

  const columns = [
    { 
      header: 'Razão Social', 
      accessorKey: 'nome', 
      sortable: true,
      cell: ({ row }) => <span className="text-foreground font-medium">{row.nome}</span>
    },
    { 
      header: 'CNPJ', 
      accessorKey: 'cnpj', 
      sortable: true,
      cell: ({ row }) => <span className="text-foreground font-mono">{row.cnpj}</span>
    },
    { 
      header: 'Email', 
      accessorKey: 'email', 
      sortable: true,
      cell: ({ row }) => <span className="text-foreground">{row.email}</span>
    },
    { 
      header: 'Telefone', 
      accessorKey: 'telefone',
      cell: ({ row }) => <span className="text-foreground">{row.telefone}</span>
    },
    { 
      header: 'Cidade', 
      accessorKey: 'cidade', 
      sortable: true,
      cell: ({ row }) => <span className="text-foreground">{row.cidade}</span>
    },
    { 
        header: 'Status', 
        accessorKey: 'status',
        cell: ({ row }) => (
            <Badge variant={row.status === 'ativo' ? 'success' : 'secondary'} className={row.status === 'ativo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-muted text-foreground'}>
                {row.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </Badge>
        )
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-muted">
      <CRUDTable
        title={<span className="text-foreground">Gerenciamento de Fornecedores</span>}
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => fetchData(page)}
        onSearch={(term) => {
            setSearch(term);
            fetchData(1, term);
        }}
        onSort={(field) => setSort(prev => ({ 
            field, 
            order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc' 
        }))}
        onCreate={() => navigate('/cadastros/fornecedores/novo')}
        onEdit={(row) => navigate(`/cadastros/fornecedores/${row.id}`)}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default FornecedoresList;
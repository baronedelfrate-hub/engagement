import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const ClientesList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ field: 'created_at', order: 'desc' });

  const fetchData = async (page = 1, searchTerm = search) => {
    setLoading(true);
    try {
      const companyId = localStorage.getItem('company_id');
      
      let query = supabase
        .from('clientes')
        .select('*', { count: 'exact' });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,cnpj_cpf.ilike.%${searchTerm}%`);
      }

      if (sort.field) {
        query = query.order(sort.field, { ascending: sort.order === 'asc' });
      }

      const from = (page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);

      const { data: clientesData, error, count } = await query;

      if (error) throw error;

      setData(clientesData || []);
      setPagination(prev => ({ 
        ...prev, 
        page, 
        total: count || 0,
        totalPages: Math.ceil((count || 0) / prev.limit) || 1
      }));
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      toast({ title: 'Erro', description: 'Não foi possível carregar a lista de clientes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      
      if (error) throw error;
      
      toast({ title: 'Sucesso', description: 'Cliente removido com sucesso.' });
      fetchData(pagination.page);
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
      toast({ title: 'Erro', description: 'Não foi possível remover o cliente.', variant: 'destructive' });
    }
  };

  const columns = [
    { 
      header: 'Nome / Razão Social', 
      accessorKey: 'nome', 
      sortable: true,
      cell: ({ row }) => <span className="text-slate-900 font-medium">{row.nome}</span>
    },
    { 
      header: 'CNPJ / CPF', 
      accessorKey: 'cnpj_cpf', 
      sortable: true,
      cell: ({ row }) => <span className="text-slate-700 font-mono">{row.cnpj_cpf}</span>
    },
    { 
      header: 'Email', 
      accessorKey: 'email', 
      sortable: true,
      cell: ({ row }) => <span className="text-slate-700">{row.email}</span>
    },
    { 
      header: 'Telefone', 
      accessorKey: 'telefone',
      cell: ({ row }) => <span className="text-slate-700">{row.telefone}</span>
    },
    { 
        header: 'Status', 
        accessorKey: 'status',
        cell: ({ row }) => (
            <Badge variant={row.status === 'ativo' ? 'success' : 'secondary'} className={row.status === 'ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}>
                {row.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </Badge>
        )
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-slate-50 dark:bg-slate-900">
      <CRUDTable
        title={<span className="text-slate-900 dark:text-white">Gerenciamento de Clientes</span>}
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
        onCreate={() => navigate('/cadastros/clientes/novo')}
        onEdit={(row) => navigate(`/cadastros/clientes/${row.id}`)}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ClientesList;
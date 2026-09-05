import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const ServicosList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ field: 'nome', order: 'asc' });

  const fetchData = async (page = 1, searchTerm = search) => {
    setLoading(true);
    try {
      let query = supabase
        .from('servicos')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%`);
      }

      query = query.order(sort.field, { ascending: sort.order === 'asc' });
      
      const from = (page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);

      const { data: resultData, count, error } = await query;

      if (error) throw error;

      setData(resultData);
      setPagination(prev => ({
        ...prev,
        page,
        total: count,
        totalPages: Math.ceil(count / prev.limit)
      }));
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sort]);

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('servicos').delete().eq('id', id);
      if (error) throw error;
      
      toast({ title: 'Sucesso', description: 'Serviço removido com sucesso.' });
      fetchData(pagination.page);
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const columns = [
    { 
        header: 'Nome do Serviço', 
        accessorKey: 'nome', 
        sortable: true,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.nome}</span>
            {row.codigo_interno && <span className="text-xs text-muted-foreground">Cód: {row.codigo_interno}</span>}
          </div>
        )
    },
    { 
        header: 'Tipo', 
        accessorKey: 'tipo', 
        sortable: true,
        cell: ({ row }) => <span className="text-muted-foreground">{row.tipo || '-'}</span> 
    },
    { 
        header: 'Preço Padrão', 
        accessorKey: 'preco', 
        sortable: true,
        cell: ({ row }) => <span className="text-foreground font-medium">R$ {parseFloat(row.preco || 0).toFixed(2)}</span>
    },
    { 
        header: 'Status', 
        accessorKey: 'status',
        cell: ({ row }) => {
            const isActive = row.status === 'ativo' || row.ativo;
            return (
              <Badge variant={isActive ? 'success' : 'secondary'} className={isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}>
                  {isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            )
        }
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <CRUDTable
        title="Catálogo de Serviços"
        description="Gerencie os serviços oferecidos pela sua empresa"
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
        onCreate={() => navigate('/cadastros/servicos/novo')}
        onEdit={(row) => navigate(`/cadastros/servicos/${row.id}`)}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ServicosList;
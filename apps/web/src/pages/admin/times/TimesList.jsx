import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

function TimesList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [times, setTimes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimes();
  }, []);

  const fetchTimes = async () => {
    setLoading(true);
    try {
      // Fetch times and count users in each group
      const { data, error } = await supabase
        .from('times')
        .select(`
          *,
          users:users(count)
        `);

      if (error) throw error;

      // Transform data to get the count
      const formattedData = data.map(time => ({
        ...time,
        member_count: time.users ? time.users[0]?.count || 0 : 0
      }));

      setTimes(formattedData);
    } catch (error) {
      console.error('Error fetching times:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar times",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este time?")) return;

    try {
      const { error } = await supabase
        .from('times')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Time excluído",
        description: "O time foi removido com sucesso."
      });
      fetchTimes();
    } catch (error) {
      console.error('Error deleting time:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message
      });
    }
  };

  const columns = [
    { header: 'Nome do Time', accessorKey: 'nome' },
    { header: 'Descrição', accessorKey: 'descricao' },
    { header: 'Membros', accessorKey: 'member_count', cell: ({ row }) => <span className="font-medium">{row.member_count}</span> }
  ];

  return (
    <>
      <Helmet>
        <title>Times e Grupos - ERP Platform</title>
      </Helmet>

      <PageHeader
        title="Times e Grupos"
        description="Gerenciamento de equipes e departamentos"
        action={
          <Button onClick={() => navigate('/admin/times/novo')} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Time
          </Button>
        }
      />

      <div className="p-6">
        <DataTable
          data={times}
          columns={columns}
          loading={loading}
          onEdit={(row) => navigate(`/admin/times/${row.id}`)}
          onDelete={(id) => handleDelete(id)}
          emptyMessage="Nenhum time encontrado"
        />
      </div>
    </>
  );
}

export default TimesList;
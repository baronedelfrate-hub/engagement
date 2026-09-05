import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

function PermissoesList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('permissions').select('*').order('modulo');
      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Deseja realmente excluir esta permissão?")) return;
    
    try {
      const { error } = await supabase.from('permissions').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Permissão excluída." });
      fetchPermissions();
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const columns = [
    { header: 'Código', accessorKey: 'codigo', cell: ({row}) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{row.codigo}</code> },
    { header: 'Nome', accessorKey: 'nome' },
    { header: 'Módulo', accessorKey: 'modulo' },
    { header: 'Descrição', accessorKey: 'descricao' },
    { 
        header: 'Status', 
        accessorKey: 'ativo',
        cell: ({ row }) => <Badge variant={row.ativo ? 'default' : 'secondary'}>{row.ativo ? 'Ativo' : 'Inativo'}</Badge>
    },
  ];

  return (
    <>
      <Helmet>
        <title>Permissões - ERP Platform</title>
      </Helmet>

      <PageHeader
        title="Catálogo de Permissões"
        description="Definição de acessos disponíveis no sistema"
        action={
          <Button onClick={() => navigate('/admin/permissoes/novo')} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Permissão
          </Button>
        }
      />

      <div className="p-6">
        <DataTable
            data={permissions}
            columns={columns}
            loading={loading}
            onEdit={(row) => navigate(`/admin/permissoes/${row.id}`)}
            onDelete={(id) => handleDelete(id)}
            emptyMessage="Nenhuma permissão encontrada"
        />
      </div>
    </>
  );
}

export default PermissoesList;
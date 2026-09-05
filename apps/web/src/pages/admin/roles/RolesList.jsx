import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

function RolesList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
        // Fetch roles with count of users and permissions
        // Note: Supabase counts with head: true or exact count is tricky in single query sometimes without specific setup
        // We will fetch relations
        const { data, error } = await supabase
            .from('roles')
            .select(`
                *,
                role_permissions(count),
                user_roles(count)
            `);
            
        if (error) throw error;
        
        const formatted = data.map(r => ({
            ...r,
            permissions_count: r.role_permissions ? r.role_permissions[0]?.count : 0,
            users_count: r.user_roles ? r.user_roles[0]?.count : 0
        }));
        
        setRoles(formatted);
    } catch (err) {
        console.error("Error fetching roles", err);
        toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza? Isso removerá o acesso de usuários vinculados a este perfil.')) return;
    
    try {
        const { error } = await supabase.from('roles').delete().eq('id', id);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Perfil excluído." });
        fetchRoles();
    } catch (err) {
        toast({ variant: 'destructive', title: 'Erro', description: err.message });
    }
  };

  const columns = [
    { header: 'Nome do Perfil', accessorKey: 'nome' },
    { header: 'Descrição', accessorKey: 'descricao' },
    { header: 'Usuários', accessorKey: 'users_count', cell: ({row}) => <span>{row.users_count || 0}</span> },
    { header: 'Permissões', accessorKey: 'permissions_count', cell: ({row}) => <span>{row.permissions_count || 0} regras</span> },
  ];

  return (
    <>
      <Helmet>
        <title>Perfis e Roles - ERP Platform</title>
      </Helmet>

      <PageHeader
        title="Perfis de Acesso (Roles)"
        description="Defina os níveis de acesso"
        action={
          <Button onClick={() => navigate('/admin/roles/novo')} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Perfil
          </Button>
        }
      />

      <div className="p-6">
        <DataTable
            data={roles}
            columns={columns}
            loading={loading}
            onEdit={(row) => navigate(`/admin/roles/${row.id}`)}
            onDelete={(id) => handleDelete(id)}
            emptyMessage="Nenhum perfil encontrado"
        />
      </div>
    </>
  );
}

export default RolesList;
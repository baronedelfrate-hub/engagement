import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { formatCPF } from '@/lib/rhUtils';

const RHFuncionariosList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: res, error } = await supabase
      .from('rh_funcionarios')
      .select(`*, cargo:roles(nome), departamento:times(nome)`) // Assuming cargo links to roles and dept to times for simplicity, adjust if specific tables exist
      .order('nome_completo');
    
    if (res) setData(res);
    setLoading(false);
  };

  const columns = [
    { header: 'Nome', accessorKey: 'nome_completo' },
    { header: 'CPF', accessorKey: 'cpf', cell: ({ row }) => formatCPF(row.cpf) },
    { header: 'Cargo', accessorKey: 'cargo.nome', cell: ({ row }) => row.cargo?.nome || '-' },
    { header: 'Departamento', accessorKey: 'departamento.nome', cell: ({ row }) => row.departamento?.nome || '-' },
    { header: 'Admissão', accessorKey: 'data_admissao', cell: ({ row }) => new Date(row.data_admissao).toLocaleDateString() },
    { 
      header: 'Status', 
      accessorKey: 'status', 
      cell: ({ row }) => <Badge variant={row.status === 'Ativo' ? 'success' : 'secondary'}>{row.status}</Badge> 
    },
    {
      header: 'Ações',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/rh/funcionarios/${row.id}`)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/rh/funcionarios/${row.id}/editar`)}><Edit className="h-4 w-4" /></Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <Helmet><title>Funcionários - RH</title></Helmet>
      <PageHeader 
        title="Funcionários" 
        description="Cadastro e gestão de colaboradores"
        action={
          <Button onClick={() => navigate('/rh/funcionarios/novo')}><Plus className="mr-2 h-4 w-4" /> Novo Funcionário</Button>
        }
      />
      <DataTable columns={columns} data={data} loading={loading} searchColumn="nome_completo" />
    </div>
  );
};

export default RHFuncionariosList;
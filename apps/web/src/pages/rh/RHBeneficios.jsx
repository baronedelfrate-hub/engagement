import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import DataTable from '@/components/DataTable';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { formatDateOnly } from '@/lib/dateUtils';

const RHBeneficios = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase.from('rh_beneficios').select('*').order('nome_beneficio');
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os benefícios.', variant: 'destructive' });
    } else {
      setData(rows || []);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este benefício?')) return;
    const { error } = await supabase.from('rh_beneficios').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message || 'Não foi possível excluir.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Excluído', description: 'Benefício removido.' });
    loadData();
  };

  const columns = [
    { header: 'Nome', accessorKey: 'nome_beneficio' },
    { header: 'Tipo', accessorKey: 'tipo' },
    { header: 'Valor', cell: ({ row }) => row.valor != null ? `R$ ${parseFloat(row.valor).toFixed(2)}` : '-' },
    { header: 'Início', cell: ({ row }) => formatDateOnly(row.data_inicio) },
    { header: 'Fim', cell: ({ row }) => formatDateOnly(row.data_fim) },
    {
      header: 'Status',
      cell: ({ row }) => row.ativo
        ? <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">Ativo</Badge>
        : <Badge variant="secondary">Inativo</Badge>
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <Helmet><title>Benefícios - RH</title></Helmet>
      <PageHeader
        title="Benefícios"
        description="Gestão de benefícios corporativos"
        action={<Button onClick={() => navigate('/rh/beneficios/novo')}><Plus className="mr-2 h-4 w-4" /> Novo Benefício</Button>}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            data={data}
            columns={columns}
            loading={loading}
            searchColumn="nome_beneficio"
            searchPlaceholder="Buscar benefício..."
            emptyMessage="Nenhum benefício cadastrado"
            onEdit={(row) => navigate(`/rh/beneficios/${row.id}`)}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default RHBeneficios;

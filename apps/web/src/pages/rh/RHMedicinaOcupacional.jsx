import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Plus, FileText, Trash2, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import { useToast } from '@/components/ui/use-toast';
import { calculateExamStatus, getAlertColor } from '@/lib/rhUtils';

const RHMedicinaOcupacional = () => {
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    const { data: res } = await supabase.from('rh_exames_ocupacionais').select('*, funcionario:rh_funcionarios(nome_completo)');
    if (res) setData(res);
    setLoading(false);
  };

  const columns = [
    { header: 'Funcionário', accessorKey: 'funcionario.nome_completo', cell: ({row}) => row.funcionario?.nome_completo || '-' },
    { header: 'Tipo Exame', accessorKey: 'tipo_exame' },
    { header: 'Data Realização', accessorKey: 'data_exame', cell: ({row}) => new Date(row.data_exame).toLocaleDateString() },
    { header: 'Próximo Vencimento', accessorKey: 'proxima_data', cell: ({row}) => row.proxima_data ? new Date(row.proxima_data).toLocaleDateString() : '-' },
    { 
      header: 'Status Vencimento', 
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = calculateExamStatus(row.proxima_data);
        return <Badge className={getAlertColor(status)}>{status}</Badge>;
      }
    },
    { header: 'Ações', id: 'actions', cell: ({row}) => (
      <div className="flex gap-2">
        {row.arquivo_url && <Button variant="ghost" size="icon" onClick={() => window.open(row.arquivo_url)}><FileText className="h-4 w-4" /></Button>}
        <Button variant="ghost" size="icon" onClick={() => toast({description:"Editar em desenvolvimento"})}><Edit className="h-4 w-4" /></Button>
      </div>
    )}
  ];

  return (
    <div className="p-6 space-y-6">
      <Helmet><title>Medicina Ocupacional - RH</title></Helmet>
      <PageHeader 
        title="Medicina Ocupacional" 
        description="Gestão de exames (ASO) e normas regulamentadoras"
        action={<Button onClick={() => toast({description:"Modal de cadastro em dev"})}><Plus className="mr-2 h-4 w-4" /> Novo Exame</Button>}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={data} loading={loading} searchColumn="tipo_exame" />
        </CardContent>
      </Card>
    </div>
  );
};

export default RHMedicinaOcupacional;
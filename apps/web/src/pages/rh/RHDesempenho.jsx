import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Eye } from 'lucide-react';
import DataTable from '@/components/DataTable';
import { useToast } from '@/components/ui/use-toast';

const RHDesempenho = () => {
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvals();
  }, []);

  const fetchEvals = async () => {
    setLoading(true);
    const { data: res } = await supabase.from('rh_avaliacoes_desempenho')
      .select('*, funcionario:rh_funcionarios(nome_completo), avaliador:users(nome)');
    if (res) setData(res);
    setLoading(false);
  };

  const columns = [
    { header: 'Funcionário', accessorKey: 'funcionario.nome_completo', cell: ({row}) => row.funcionario?.nome_completo || '-' },
    { header: 'Data', accessorKey: 'data_avaliacao', cell: ({row}) => new Date(row.data_avaliacao).toLocaleDateString() },
    { header: 'Avaliador', accessorKey: 'avaliador.nome', cell: ({row}) => row.avaliador?.nome || '-' },
    { header: 'Pontuação', accessorKey: 'pontuacao', cell: ({row}) => <span className="font-bold">{row.pontuacao || 'N/A'}</span> },
    { header: 'Ações', id: 'actions', cell: ({row}) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={() => toast({description:"Visualizar em desenvolvimento"})}><Eye className="h-4 w-4" /></Button>
      </div>
    )}
  ];

  return (
    <div className="p-6 space-y-6">
      <Helmet><title>Análise de Desempenho - RH</title></Helmet>
      <PageHeader 
        title="Análise de Desempenho" 
        description="Avaliações, feedbacks e PDIs"
        action={<Button onClick={() => toast({description:"Nova Avaliação em dev"})}><Plus className="mr-2 h-4 w-4" /> Nova Avaliação</Button>}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={data} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
};

export default RHDesempenho;
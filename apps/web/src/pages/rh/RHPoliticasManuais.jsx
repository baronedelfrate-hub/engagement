import React from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Book } from 'lucide-react';
import DataTable from '@/components/DataTable';

const RHPoliticasManuais = () => {
  const data = [
    { id: 1, titulo: 'Código de Conduta e Ética', versao: '2.0', atualizacao: '2025-01-10' },
    { id: 2, titulo: 'Manual do Colaborador', versao: '1.5', atualizacao: '2024-11-20' },
    { id: 3, titulo: 'Política de Home Office', versao: '1.0', atualizacao: '2024-06-15' },
  ];

  const columns = [
    { header: 'Título', accessorKey: 'titulo' },
    { header: 'Versão', accessorKey: 'versao' },
    { header: 'Última Atualização', accessorKey: 'atualizacao' },
  ];

  return (
    <div className="p-6 space-y-6">
      <Helmet><title>Políticas e Manuais - RH</title></Helmet>
      <PageHeader 
        title="Políticas e Manuais" 
        description="Documentação institucional e normas internas"
        action={<Button><Plus className="mr-2 h-4 w-4" /> Novo Documento</Button>}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable 
            data={data} 
            columns={columns} 
            searchColumn="titulo"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default RHPoliticasManuais;
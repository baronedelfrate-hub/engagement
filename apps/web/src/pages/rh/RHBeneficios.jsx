import React from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Gift } from 'lucide-react';
import DataTable from '@/components/DataTable';

const RHBeneficios = () => {
  // Mock data
  const data = [
    { id: 1, nome: 'Vale Transporte', tipo: 'Transporte', valor: 'Variável', status: 'Ativo' },
    { id: 2, nome: 'Vale Refeição', tipo: 'Alimentação', valor: 'R$ 800,00', status: 'Ativo' },
    { id: 3, nome: 'Plano de Saúde', tipo: 'Saúde', valor: 'Integral', status: 'Ativo' },
  ];

  const columns = [
    { header: 'Nome', accessorKey: 'nome' },
    { header: 'Tipo', accessorKey: 'tipo' },
    { header: 'Valor Médio', accessorKey: 'valor' },
    { header: 'Status', accessorKey: 'status' },
  ];

  return (
    <div className="p-6 space-y-6">
      <Helmet><title>Benefícios - RH</title></Helmet>
      <PageHeader 
        title="Benefícios" 
        description="Gestão de benefícios corporativos"
        action={<Button><Plus className="mr-2 h-4 w-4" /> Novo Benefício</Button>}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable 
            data={data} 
            columns={columns} 
            searchColumn="nome"
            searchPlaceholder="Buscar benefício..."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default RHBeneficios;
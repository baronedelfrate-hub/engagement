import React from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Briefcase } from 'lucide-react';
import DataTable from '@/components/DataTable';

const RHDescricaoCargos = () => {
  const data = [
    { id: 1, cargo: 'Analista de Sistemas Jr', departamento: 'TI', nivel: 'Júnior' },
    { id: 2, cargo: 'Gerente de Vendas', departamento: 'Comercial', nivel: 'Gerência' },
    { id: 3, cargo: 'Auxiliar Administrativo', departamento: 'Admin', nivel: 'Auxiliar' },
  ];

  const columns = [
    { header: 'Cargo', accessorKey: 'cargo' },
    { header: 'Departamento', accessorKey: 'departamento' },
    { header: 'Nível', accessorKey: 'nivel' },
  ];

  return (
    <div className="p-6 space-y-6">
      <Helmet><title>Descrição de Cargos - RH</title></Helmet>
      <PageHeader 
        title="Descrição de Cargos" 
        description="Matriz de cargos, salários e responsabilidades"
        action={<Button><Plus className="mr-2 h-4 w-4" /> Novo Cargo</Button>}
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable 
            data={data} 
            columns={columns} 
            searchColumn="cargo"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default RHDescricaoCargos;
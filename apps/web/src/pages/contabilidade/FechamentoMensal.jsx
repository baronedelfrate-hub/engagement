import React from 'react';
import PageHeader from '@/components/PageHeader';
import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function FechamentoMensal() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageHeader 
        title="Fechamento Mensal" 
        description="Gestão de fechamentos contábeis e fiscais do mês."
        icon={Calendar}
        breadcrumbs={[
          { label: 'Contabilidade', href: '/contabilidade/dashboard' },
          { label: 'Fechamento Mensal' }
        ]}
      />
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <p>Módulo de fechamento em desenvolvimento. Aqui você poderá criar novos fechamentos, enviar guias e integrar relatórios.</p>
        </CardContent>
      </Card>
    </div>
  );
}
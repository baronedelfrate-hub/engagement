import React from 'react';
import PageHeader from '@/components/PageHeader';
import { Edit } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function LancamentosContabeis() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader 
        title="Lançamentos Contábeis" 
        description="Gestão de lançamentos contábeis manuais e automáticos."
        icon={Edit}
      />
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <p>Módulo de lançamentos em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}
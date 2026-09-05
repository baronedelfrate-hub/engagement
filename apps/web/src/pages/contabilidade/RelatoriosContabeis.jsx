import React from 'react';
import PageHeader from '@/components/PageHeader';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function RelatoriosContabeis() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader 
        title="DRE / Balancete" 
        description="Visualização de relatórios contábeis e importações."
        icon={BarChart3}
      />
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <p>Módulo de relatórios em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}
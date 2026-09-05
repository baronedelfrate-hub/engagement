import React from 'react';
import PageHeader from '@/components/PageHeader';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function PendenciasContabeis() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader 
        title="Pendências Contábeis" 
        description="Acompanhamento de conciliações e pendências."
        icon={AlertCircle}
      />
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <p>Módulo de pendências em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}
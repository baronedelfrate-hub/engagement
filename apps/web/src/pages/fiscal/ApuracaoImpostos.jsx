import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from 'react-helmet';

const ApuracaoImpostos = () => {
  return (
    <div className="p-6 space-y-6">
      <Helmet>
        <title>Apuração de Impostos | Horizons ERP</title>
      </Helmet>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Apuração de Impostos</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cálculo de Tributos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Resumo e apuração de impostos (ISS, ICMS, PIS, COFINS, IRPJ, CSLL).</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApuracaoImpostos;
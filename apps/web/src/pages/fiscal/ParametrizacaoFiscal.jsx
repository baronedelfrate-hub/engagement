import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from 'react-helmet';

const ParametrizacaoFiscal = () => {
  return (
    <div className="p-6 space-y-6">
      <Helmet>
        <title>Parametrização Fiscal | Horizons ERP</title>
      </Helmet>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Parametrização Fiscal</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Configurações Fiscais</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Configuração de dados da empresa, certificados digitais e regras de tributação.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParametrizacaoFiscal;
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from 'react-helmet';

const EntradaFiscalLista = () => {
  return (
    <div className="p-6 space-y-6">
      <Helmet>
        <title>Entradas Fiscais | Horizons ERP</title>
      </Helmet>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Entradas Fiscais</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Registro de Entradas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Controle de entrada de notas fiscais e movimentação de estoque fiscal.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EntradaFiscalLista;
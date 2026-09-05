import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from 'react-helmet';

const NfeLista = () => {
  return (
    <div className="p-6 space-y-6">
      <Helmet>
        <title>NF-e (Produtos) | Horizons ERP</title>
      </Helmet>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">NF-e (Produtos)</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Notas Fiscais de Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Lista de Notas Fiscais Eletrônicas (Produtos) emitida será exibida aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NfeLista;
import React from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, GitFork } from 'lucide-react';

const RHOrganogramas = () => {
  return (
    <div className="p-6 space-y-6">
      <Helmet><title>Organogramas - RH</title></Helmet>
      <PageHeader 
        title="Organogramas" 
        description="Estrutura organizacional da empresa"
        action={<Button><Plus className="mr-2 h-4 w-4" /> Nova Versão</Button>}
      />

      <Card className="min-h-[400px] flex flex-col items-center justify-center border-dashed p-8">
        <GitFork className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-medium mb-2">Visualizador de Organograma</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Faça upload da estrutura organizacional ou utilize a ferramenta de desenho para criar um novo organograma.
        </p>
        <div className="mt-6 flex gap-4">
            <Button variant="outline">Upload PDF/Imagem</Button>
            <Button>Criar Novo</Button>
        </div>
      </Card>
    </div>
  );
};

export default RHOrganogramas;
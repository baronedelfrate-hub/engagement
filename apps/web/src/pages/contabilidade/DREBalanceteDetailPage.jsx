import React from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { FileSpreadsheet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { DREBalanceteProvider } from '@/contexts/DREBalanceteContext';
import DREBalanceteFilters from './dre-balancete/components/DREBalanceteFilters';
import DRETab from './dre-balancete/components/DRETab';
import BalanceteTab from './dre-balancete/components/BalanceteTab';
import DREBalanceteActions from './dre-balancete/components/DREBalanceteActions';

export default function DREBalanceteDetailPage() {
  return (
    <DREBalanceteProvider>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-24">
        <Helmet><title>DRE & Balancete | ERP Platform</title></Helmet>

        <PageHeader 
          title="DRE e Balancete de Verificação" 
          description="Acompanhamento de resultados, análise de DRE e conferência de saldos contábeis."
          icon={FileSpreadsheet}
          breadcrumbs={[
            { label: 'Contabilidade', href: '/contabilidade/dashboard' },
            { label: 'DRE & Balancete' }
          ]}
        />

        <DREBalanceteFilters />

        <Tabs defaultValue="dre" className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2 mb-6">
            <TabsTrigger value="dre" className="font-semibold">DRE</TabsTrigger>
            <TabsTrigger value="balancete" className="font-semibold">Balancete</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dre" className="mt-0 outline-none">
            <DRETab />
          </TabsContent>
          
          <TabsContent value="balancete" className="mt-0 outline-none">
            <BalanceteTab />
          </TabsContent>
        </Tabs>

        <DREBalanceteActions />

      </div>
    </DREBalanceteProvider>
  );
}
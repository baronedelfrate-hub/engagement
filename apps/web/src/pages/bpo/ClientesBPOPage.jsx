import React from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Construction, Info } from 'lucide-react';

const ClientesBPOPage = () => {
  return (
    <div className="bg-background min-h-screen text-foreground font-sans pb-16">
      <Helmet>
        <title>CLIENTES BPO - ERP ENGAGEMENT</title>
        <meta name="description" content="Gerenciamento de clientes BPO" />
      </Helmet>
      
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
        <PageHeader 
          title="CLIENTES BPO" 
          description="Central de gerenciamento de clientes BPO"
          icon={Building2}
        />

        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="bg-slate-900 border-slate-800 shadow-2xl max-w-2xl w-full">
            <CardContent className="p-12">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="p-6 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-2 border-blue-500/30">
                  <Construction className="h-16 w-16 text-blue-400" />
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-white">
                    Página em Construção
                  </h2>
                  <p className="text-lg text-slate-400">
                    Nenhum submenu configurado ainda
                  </p>
                </div>

                <Alert className="bg-blue-500/10 border-blue-500/30 text-blue-300 w-full">
                  <Info className="h-5 w-5" />
                  <AlertDescription className="ml-2">
                    Esta seção está sendo desenvolvida. Os submenus e funcionalidades serão adicionados em breve para fornecer uma gestão completa de clientes BPO.
                  </AlertDescription>
                </Alert>

                <div className="pt-4 space-y-2 text-sm text-slate-500">
                  <p className="flex items-center gap-2 justify-center">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Sistema disponível para navegação
                  </p>
                  <p>Funcionalidades adicionais em desenvolvimento</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientesBPOPage;
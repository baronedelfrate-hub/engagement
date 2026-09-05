import React from 'react';
import { ParametrosContabeisProvider, useParametrosContabeis } from '@/contexts/ParametrosContabeisContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Upload, RotateCcw, Settings, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

import PlanoDeContasTab from './tabs/PlanoDeContasTab';
import VinculacaoFinanceiroContabilTab from './tabs/VinculacaoFinanceiroContabilTab';
import CentrosCustoTab from './tabs/CentrosCustoTab';
import HistoricosPadraoTab from './tabs/HistoricosPadraoTab';
import CompetenciasTab from './tabs/CompetenciasTab';
import LayoutsExportacaoTab from './tabs/LayoutsExportacaoTab';
import FechamentoParametrosTab from './tabs/FechamentoParametrosTab';
import RegrasIntegracaoTab from './tabs/RegrasIntegracaoTab';

function ParametrosContabeisContent() {
  const { empresas, empresaId, setEmpresaId, loading } = useParametrosContabeis();

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-24">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            Parâmetros Contábeis
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure regras, planos de contas e parametrizações gerais do módulo contábil.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={empresaId} onValueChange={setEmpresaId}>
            <SelectTrigger className="w-[250px] bg-white">
              <SelectValue placeholder="Selecione a Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Configurações Globais / Padrão</SelectItem>
              {empresas.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.razao_social}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="h-8 w-px bg-slate-200 mx-1"></div>
          <Button variant="outline" size="sm" className="hidden lg:flex" title="Restaurar Padrões">
            <RotateCcw className="w-4 h-4 mr-2" /> Restaurar
          </Button>
          <Button variant="outline" size="sm" className="hidden lg:flex" title="Exportar Configurações">
            <Download className="w-4 h-4 mr-2" /> Exportar
          </Button>
          <Button variant="outline" size="sm" className="hidden lg:flex" title="Importar Configurações">
            <Upload className="w-4 h-4 mr-2" /> Importar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <Tabs defaultValue="plano-contas" className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 flex flex-wrap h-auto gap-1 mb-6 rounded-lg">
            <TabsTrigger value="plano-contas" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Plano de Contas</TabsTrigger>
            <TabsTrigger value="vinculacao" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Vinculação</TabsTrigger>
            <TabsTrigger value="centros-custo" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Centros de Custo</TabsTrigger>
            <TabsTrigger value="historicos" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Históricos Padrão</TabsTrigger>
            <TabsTrigger value="competencias" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Competências</TabsTrigger>
            <TabsTrigger value="layouts" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Layouts Exportação</TabsTrigger>
            <TabsTrigger value="fechamento" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Fechamento</TabsTrigger>
            <TabsTrigger value="integracao" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Integração</TabsTrigger>
          </TabsList>

          <TabsContent value="plano-contas"><PlanoDeContasTab /></TabsContent>
          <TabsContent value="vinculacao"><VinculacaoFinanceiroContabilTab /></TabsContent>
          <TabsContent value="centros-custo"><CentrosCustoTab /></TabsContent>
          <TabsContent value="historicos"><HistoricosPadraoTab /></TabsContent>
          <TabsContent value="competencias"><CompetenciasTab /></TabsContent>
          <TabsContent value="layouts"><LayoutsExportacaoTab /></TabsContent>
          <TabsContent value="fechamento"><FechamentoParametrosTab /></TabsContent>
          <TabsContent value="integracao"><RegrasIntegracaoTab /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default function ParametrosContabeisPage() {
  return (
    <ParametrosContabeisProvider>
      <ParametrosContabeisContent />
    </ParametrosContabeisProvider>
  );
}
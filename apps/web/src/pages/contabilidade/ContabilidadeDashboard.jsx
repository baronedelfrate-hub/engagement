import React from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Loader2, X } from 'lucide-react';
import { useContabilidade } from '@/contexts/ContabilidadeContext';

import SummaryCardsGrid from './components/SummaryCardsGrid';
import PendenciasDoMes from './components/PendenciasDoMes';
import UltimosDocumentosEnviados from './components/UltimosDocumentosEnviados';
import UltimosFechamentos from './components/UltimosFechamentos';
import UltimosRelatorios from './components/UltimosRelatorios';
import QuickActionsSection from './components/QuickActionsSection';

export default function ContabilidadeDashboard() {
  const { filtros, setFiltros, empresas, dashboardData, loading, refreshData } = useContabilidade();
  const { summary, grids } = dashboardData;

  const handleFilterChange = (key, value) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    const today = new Date();
    setFiltros({
      periodo: `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`,
      empresa_id: 'all',
      status: 'Todos'
    });
  };

  return (
    <div className="relative min-h-screen bg-muted/50 pb-24">
      <Helmet><title>Dashboard Contábil | ERP Platform</title></Helmet>
      
      {/* STICKY FILTER BAR */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border shadow-sm px-6 py-4 mb-6">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <span>Filtros do Dashboard</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex flex-col w-full md:w-40">
              <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Período (MM/YYYY)</span>
              <Input 
                value={filtros.periodo}
                onChange={(e) => handleFilterChange('periodo', e.target.value)}
                placeholder="MM/YYYY"
                className="h-9 bg-background"
              />
            </div>
            
            <div className="flex flex-col w-full md:w-56">
              <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Empresa</span>
              <Select value={filtros.empresa_id} onValueChange={(v) => handleFilterChange('empresa_id', v)}>
                <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="Todas as Empresas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Empresas</SelectItem>
                  {empresas.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col w-full md:w-40">
              <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Status</span>
              <Select value={filtros.status} onValueChange={(v) => handleFilterChange('status', v)}>
                <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2 mt-4 md:mt-0">
              <Button onClick={refreshData} disabled={loading} className="h-9 bg-slate-800 hover:bg-slate-700">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Aplicar"}
              </Button>
              <Button variant="outline" onClick={handleResetFilters} className="h-9 w-9 p-0" title="Limpar">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto space-y-8">
        
        <PageHeader 
          title="Dashboard Contábil" 
          description="Visão geral e status do fechamento contábil"
          breadcrumbs={[
            { label: 'Contabilidade' },
            { label: 'Dashboard' }
          ]}
        />

        {/* SUMMARY CARDS GRID */}
        <SummaryCardsGrid summary={summary} />

        {/* DATA GRIDS SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Top grids */}
          <PendenciasDoMes data={grids.pendenciasMes} />
          <UltimosDocumentosEnviados data={grids.ultimosDocumentos} />

          {/* Bottom grids */}
          <UltimosFechamentos data={grids.ultimosFechamentos} />
          <UltimosRelatorios data={grids.ultimosRelatorios} />
        </div>

      </div>

      {/* QUICK ACTIONS FIXED SECTION */}
      <QuickActionsSection />

    </div>
  );
}
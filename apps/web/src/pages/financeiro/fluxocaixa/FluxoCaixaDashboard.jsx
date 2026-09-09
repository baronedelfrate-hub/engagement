import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { CalendarDays, Download, Filter, Plus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import FluxoCaixaTabela from './FluxoCaixaTabela';
import { generateTimelineData } from './fluxoCaixaUtils';
import FluxoCaixaDashboardChart from './FluxoCaixaDashboardChart';
import DrilldownModal from './components/DrilldownModal';
import EditarPrevistoModal from './components/EditarPrevistoModal';
import { toast } from '@/components/ui/use-toast';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function FluxoCaixaDashboard() {
  const [timelineData, setTimelineData] = useState([]);
  const [isDrilldownModalOpen, setIsDrilldownModalOpen] = useState(false);
  const [drilldownData, setDrilldownData] = useState(null);
  const [isEditarPrevistoModalOpen, setIsEditarPrevistoModalOpen] = useState(false);
  const [editarPrevistoData, setEditarPrevistoData] = useState(null);
  
  // New Filters State using Hook
  const { empresas, bancos, centrosCusto } = useFinanceiroDropdowns();
  const [filters, setFilters] = useState({ empresaId: 'all', bancoId: 'all' });

  useEffect(() => {
    // Here we would ideally fetch real data filtered by empresa/banco
    setTimelineData(generateTimelineData(60));
  }, [filters]);

  const handleCellClick = useCallback((date, categoryId, type) => {
    const mockDetails = [
      { id: 1, descricao: `${type} de ${categoryId} em ${date} - Item 1`, valor: 1234.56, status: 'Pago' },
      { id: 2, descricao: `${type} de ${categoryId} em ${date} - Item 2`, valor: 789.01, status: 'Aberto' },
    ];

    setDrilldownData({ date, categoryId, type, details: mockDetails });
    setIsDrilldownModalOpen(true);
  }, []);

  const handleOpenEditarPrevistoModal = useCallback((date, categoryId, currentValue) => {
    setEditarPrevistoData({ date, categoryId, currentValue });
    setIsEditarPrevistoModalOpen(true);
  }, []);

  const handleSavePrevisto = useCallback((date, categoryId, newValue) => {
    setTimelineData(prevData => {
      return prevData.map(day => {
        if (day.date === date) {
          return {
            ...day,
            [categoryId]: {
              ...day[categoryId],
              previsto: parseFloat(newValue)
            }
          };
        }
        return day;
      });
    });
    toast({
      title: "Previsto atualizado com sucesso!",
      description: `O valor previsto para ${categoryId} em ${date} foi atualizado.`,
      variant: "success",
    });
    setIsEditarPrevistoModalOpen(false);
  }, []);

  return (
    <>
      <Helmet>
        <title>Fluxo de Caixa - ERP Platform</title>
        <meta name="description" content="Acompanhe o fluxo de caixa da sua empresa." />
      </Helmet>

      <PageHeader
        title="Fluxo de Caixa"
        description="Visualize e projete os movimentos financeiros da sua empresa."
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 bg-background p-4 rounded-lg border border-border">
          <div className="flex gap-4 items-center w-full md:w-auto">
             <div className="w-48">
                 <Select value={filters.empresaId} onValueChange={v => setFilters({...filters, empresaId: v})}>
                    <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as Empresas</SelectItem>
                        {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                    </SelectContent>
                 </Select>
             </div>
             <div className="w-48">
                 <Select value={filters.bancoId} onValueChange={v => setFilters({...filters, bancoId: v})}>
                    <SelectTrigger><SelectValue placeholder="Banco" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Bancos</SelectItem>
                        {bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                    </SelectContent>
                 </Select>
             </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => toast({title: "Nova Entrada", description: "Em breve"})}>
              <Plus className="mr-2 h-4 w-4" /> Nova Entrada
            </Button>
          </div>
        </div>

        <Tabs defaultValue="tabela" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-muted">
            <TabsTrigger value="tabela">Tabela de Fluxo</TabsTrigger>
            <TabsTrigger value="graficos">Gráficos de Fluxo</TabsTrigger>
          </TabsList>
          <TabsContent value="tabela" className="mt-4">
            <FluxoCaixaTabela 
              timeline={timelineData} 
              onCellClick={handleCellClick} 
              onEditPrevistoClick={handleOpenEditarPrevistoModal} 
            />
          </TabsContent>
          <TabsContent value="graficos" className="mt-4">
            <FluxoCaixaDashboardChart timeline={timelineData} />
          </TabsContent>
        </Tabs>
      </motion.div>

      {drilldownData && (
        <DrilldownModal
          isOpen={isDrilldownModalOpen}
          onClose={() => setIsDrilldownModalOpen(false)}
          data={drilldownData}
        />
      )}

      {editarPrevistoData && (
        <EditarPrevistoModal
          isOpen={isEditarPrevistoModalOpen}
          onClose={() => setIsEditarPrevistoModalOpen(false)}
          data={editarPrevistoData}
          onSave={handleSavePrevisto}
        />
      )}
    </>
  );
}

export default FluxoCaixaDashboard;
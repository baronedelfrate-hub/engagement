import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Settings, FileBarChart, ListTree } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import FluxoCaixaTabela from './FluxoCaixaTabela';
import { fetchFluxoCaixaData, formatCurrency } from './fluxoCaixaUtils';
import FluxoCaixaDashboardChart from './FluxoCaixaDashboardChart';
import DrilldownModal from './components/DrilldownModal';
import EditarPrevistoModal from './components/EditarPrevistoModal';
import { useToast } from '@/components/ui/use-toast';

function FluxoCaixaDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [matrixData, setMatrixData] = useState(null);
  const [chartTimeline, setChartTimeline] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);

  const [isDrilldownModalOpen, setIsDrilldownModalOpen] = useState(false);
  const [drilldownItems, setDrilldownItems] = useState([]);
  const [drilldownTitle, setDrilldownTitle] = useState('');

  const [isEditarPrevistoModalOpen, setIsEditarPrevistoModalOpen] = useState(false);
  const [editarPrevistoData, setEditarPrevistoData] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFluxoCaixaData(60);
      setMatrixData(result.matrix);
      setChartTimeline(result.chartTimeline);
      setMovimentacoes(result.movimentacoes);
      setCentrosCusto(result.centrosCusto);
    } catch (error) {
      console.error('[FluxoCaixaDashboard] Erro ao carregar dados:', error);
      toast({ title: "Erro", description: "Não foi possível carregar o fluxo de caixa.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCellClick = useCallback((row, day, type) => {
    const status = type === 'previsto' ? 'Previsto' : 'Realizado';
    const items = movimentacoes.filter(m => {
      const rowId = m.centro_custo_id || 'sem-centro';
      return rowId === row.id && m.data_movimentacao === day.key && m.status === status;
    }).map(m => ({
      data: m.data_movimentacao,
      descricao: m.descricao,
      categoria: m.categoria,
      tipo: m.status?.toUpperCase(),
      valor: m.tipo === 'Despesa' ? -parseFloat(m.valor || 0) : parseFloat(m.valor || 0),
    }));

    setDrilldownItems(items);
    setDrilldownTitle(`${row.name} — ${day.label} (${status})`);
    setIsDrilldownModalOpen(true);
  }, [movimentacoes]);

  const handleOpenEditarPrevistoModal = useCallback((row, day) => {
    setEditarPrevistoData(row && day ? { centroCustoId: row.id, dayKey: day.key } : null);
    setIsEditarPrevistoModalOpen(true);
  }, []);

  const totalDias = chartTimeline.length;
  const ultimoDia = totalDias > 0 ? chartTimeline[totalDias - 1] : null;

  return (
    <>
      <Helmet>
        <title>Fluxo de Caixa - ERP Platform</title>
        <meta name="description" content="Acompanhe o fluxo de caixa da sua empresa." />
      </Helmet>

      <PageHeader
        title="Fluxo de Caixa"
        description="Visualize e projete os movimentos financeiros da sua empresa (próximos 60 dias)."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/financeiro/fluxo-caixa/movimentacoes')} className="gap-2">
              <ListTree className="h-4 w-4" /> Movimentações
            </Button>
            <Button variant="outline" onClick={() => navigate('/financeiro/fluxo-caixa/config-categorias')} className="gap-2">
              <Settings className="h-4 w-4" /> Categorias
            </Button>
            <Button variant="outline" onClick={() => navigate('/financeiro/fluxo-caixa/relatorios')} className="gap-2">
              <FileBarChart className="h-4 w-4" /> Relatórios
            </Button>
            <Button onClick={() => handleOpenEditarPrevistoModal(null, null)} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Entrada
            </Button>
          </div>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 min-w-0"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-bold">Saldo Previsto (60 dias)</p>
              <h3 className="text-xl font-mono font-bold text-blue-600">{formatCurrency(ultimoDia?.saldoFinal?.previsto)}</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-bold">Saldo Realizado (60 dias)</p>
              <h3 className="text-xl font-mono font-bold text-emerald-600">{formatCurrency(ultimoDia?.saldoFinal?.realizado)}</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-bold">Diferença</p>
              <h3 className="text-xl font-mono font-bold text-foreground">{formatCurrency((ultimoDia?.saldoFinal?.realizado || 0) - (ultimoDia?.saldoFinal?.previsto || 0))}</h3>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-background">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Carregando fluxo de caixa...</p>
          </div>
        ) : (
          <Tabs defaultValue="tabela" className="w-full min-w-0">
            <TabsList className="grid w-full grid-cols-2 bg-muted">
              <TabsTrigger value="tabela">Tabela de Fluxo</TabsTrigger>
              <TabsTrigger value="graficos">Gráficos de Fluxo</TabsTrigger>
            </TabsList>
            <TabsContent value="tabela" className="mt-4">
              <FluxoCaixaTabela
                data={matrixData}
                onCellClick={handleCellClick}
              />
            </TabsContent>
            <TabsContent value="graficos" className="mt-4">
              <FluxoCaixaDashboardChart timeline={chartTimeline} />
            </TabsContent>
          </Tabs>
        )}
      </motion.div>

      <DrilldownModal
        isOpen={isDrilldownModalOpen}
        onClose={() => setIsDrilldownModalOpen(false)}
        items={drilldownItems}
        title={drilldownTitle}
      />

      <EditarPrevistoModal
        isOpen={isEditarPrevistoModalOpen}
        onClose={() => setIsEditarPrevistoModalOpen(false)}
        data={editarPrevistoData}
        centrosCusto={centrosCusto}
        onSave={loadData}
      />
    </>
  );
}

export default FluxoCaixaDashboard;

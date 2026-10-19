import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, FileBarChart, ListTree } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FluxoCaixaTabela from './FluxoCaixaTabela';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { fetchFluxoCaixaData, fetchVencidos, intervaloDoPeriodo, PERIODOS_FLUXO, MAX_DIAS_FLUXO, AGRUPAMENTOS_FLUXO, descreverLinha, diasEntre, formatarDataBR, formatCurrency } from './fluxoCaixaUtils';
import FluxoCaixaDashboardChart from './FluxoCaixaDashboardChart';
import DrilldownModal from './components/DrilldownModal';
import { useToast } from '@/components/ui/use-toast';

// Fluxo de caixa a partir da Movimentação Financeira (base única):
// previsto = títulos pelo vencimento; realizado = baixas pela data do pagamento/recebimento.
function FluxoCaixaDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mes');
  const [incluirProvisoes, setIncluirProvisoes] = useState(true);
  const [agruparPor, setAgruparPor] = useState('centro');
  // período personalizado: o que o usuário digita (rascunho) e o que foi aplicado de fato
  const [rascunho, setRascunho] = useState(intervaloDoPeriodo('mes'));
  const [intervaloCustom, setIntervaloCustom] = useState(intervaloDoPeriodo('mes'));
  const [matrixData, setMatrixData] = useState(null);
  const [chartTimeline, setChartTimeline] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [vencidos, setVencidos] = useState(null);

  const [isDrilldownModalOpen, setIsDrilldownModalOpen] = useState(false);
  const [drilldownItems, setDrilldownItems] = useState([]);
  const [drilldownTitle, setDrilldownTitle] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const intervalo = periodo === 'personalizado' ? intervaloCustom : intervaloDoPeriodo(periodo);
      const [result, venc] = await Promise.all([
        fetchFluxoCaixaData({ ...intervalo, incluirProvisoes, agruparPor }),
        fetchVencidos(),
      ]);
      setMatrixData(result.matrix);
      setChartTimeline(result.chartTimeline);
      setMovimentacoes(result.movimentacoes);
      setVencidos(venc);
    } catch (error) {
      console.error('[FluxoCaixaDashboard] Erro ao carregar dados:', error);
      toast({ title: "Erro", description: "Não foi possível carregar o fluxo de caixa.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, periodo, intervaloCustom, incluirProvisoes, agruparPor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const aplicarPersonalizado = () => {
    const { inicio, fim } = rascunho;
    if (!inicio || !fim) {
      toast({ title: 'Atenção', description: 'Informe a data inicial e a data final.', variant: 'destructive' });
      return;
    }
    if (fim < inicio) {
      toast({ title: 'Atenção', description: 'A data final não pode ser anterior à data inicial.', variant: 'destructive' });
      return;
    }
    if (diasEntre(inicio, fim) > MAX_DIAS_FLUXO) {
      toast({ title: 'Período muito longo', description: `A tabela diária comporta até ${MAX_DIAS_FLUXO} dias. Para períodos maiores, use os Relatórios.`, variant: 'destructive' });
      return;
    }
    setIntervaloCustom({ inicio, fim });
  };

  const handleCellClick = useCallback((row, day, type) => {
    const status = type === 'previsto' ? 'Previsto' : 'Realizado';
    const items = movimentacoes.filter(m => {
      return descreverLinha(m, agruparPor).id === row.id && m.data_movimentacao === day.key && m.status === status;
    }).map(m => ({
      data: m.data_movimentacao,
      descricao: m.descricao,
      categoria: m.categoria,
      subcategoria: m.subcategoria,
      tipo: m.status?.toUpperCase(),
      valor: m.tipo === 'Despesa' ? -parseFloat(m.valor || 0) : parseFloat(m.valor || 0),
    }));

    setDrilldownItems(items);
    setDrilldownTitle(`${row.name} — ${day.label} (${status})`);
    setIsDrilldownModalOpen(true);
  }, [movimentacoes, agruparPor]);

  const ultimoDia = chartTimeline.length > 0 ? chartTimeline[chartTimeline.length - 1] : null;
  const rotuloPeriodo = periodo === 'personalizado'
    ? `${formatarDataBR(intervaloCustom.inicio)} a ${formatarDataBR(intervaloCustom.fim)}`
    : PERIODOS_FLUXO.find((p) => p.valor === periodo)?.rotulo?.toLowerCase();
  const temVencidos = vencidos && (vencidos.aPagar.qtd > 0 || vencidos.aReceber.qtd > 0);

  return (
    <>
      <Helmet>
        <title>Fluxo de Caixa - ERP Platform</title>
        <meta name="description" content="Acompanhe o fluxo de caixa da sua empresa." />
      </Helmet>

      <PageHeader
        title="Fluxo de Caixa"
        description="Previsto (títulos pelo vencimento) x realizado (baixas pela data do pagamento), a partir da Movimentação Financeira."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-44 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODOS_FLUXO.map((p) => <SelectItem key={p.valor} value={p.valor}>{p.rotulo}</SelectItem>)}
              </SelectContent>
            </Select>
            {periodo === 'personalizado' && (
              <>
                <Input type="date" className="w-40 bg-background" value={rascunho.inicio} onChange={(e) => setRascunho((r) => ({ ...r, inicio: e.target.value }))} title="Data inicial" />
                <span className="text-sm text-muted-foreground">até</span>
                <Input type="date" className="w-40 bg-background" value={rascunho.fim} onChange={(e) => setRascunho((r) => ({ ...r, fim: e.target.value }))} title="Data final" />
                <Button onClick={aplicarPersonalizado} disabled={loading}>Aplicar</Button>
              </>
            )}
            <Select value={agruparPor} onValueChange={setAgruparPor}>
              <SelectTrigger className="w-52 bg-background" title="Como agrupar as linhas da tabela"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGRUPAMENTOS_FLUXO.map((a) => <SelectItem key={a.valor} value={a.valor}>Agrupar por {a.rotulo.toLowerCase()}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm px-2 cursor-pointer select-none" title="Provisões pendentes entram no previsto">
              <Checkbox checked={incluirProvisoes} onCheckedChange={(v) => setIncluirProvisoes(v === true)} />
              Incluir provisões
            </label>
            <Button variant="outline" onClick={() => navigate('/movimentacao-financeira')} className="gap-2">
              <ListTree className="h-4 w-4" /> Movimentações
            </Button>
            <Button variant="outline" onClick={() => navigate('/financeiro/fluxo-caixa/relatorios')} className="gap-2">
              <FileBarChart className="h-4 w-4" /> Relatórios
            </Button>
            <Button onClick={() => navigate('/movimentacao-financeira/nova')} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Movimentação
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-bold">Saldo Previsto ({rotuloPeriodo})</p>
              <h3 className="text-xl font-mono font-bold text-blue-600">{formatCurrency(ultimoDia?.saldoFinal?.previsto)}</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-bold">Saldo Realizado ({rotuloPeriodo})</p>
              <h3 className="text-xl font-mono font-bold text-emerald-600">{formatCurrency(ultimoDia?.saldoFinal?.realizado)}</h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-bold">Diferença</p>
              <h3 className="text-xl font-mono font-bold text-foreground">{formatCurrency((ultimoDia?.saldoFinal?.realizado || 0) - (ultimoDia?.saldoFinal?.previsto || 0))}</h3>
            </CardContent>
          </Card>
          <Card className={temVencidos ? 'border-red-500/50' : ''}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-bold">Vencidos em aberto</p>
              <h3 className="text-sm font-mono font-bold text-red-600">
                {vencidos ? `A pagar: ${vencidos.aPagar.qtd} · ${formatCurrency(vencidos.aPagar.valor)}` : '—'}
              </h3>
              <h3 className="text-sm font-mono font-bold text-amber-600">
                {vencidos ? `A receber: ${vencidos.aReceber.qtd} · ${formatCurrency(vencidos.aReceber.valor)}` : ''}
              </h3>
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
                rotuloLinha={AGRUPAMENTOS_FLUXO.find((a) => a.valor === agruparPor)?.coluna}
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
    </>
  );
}

export default FluxoCaixaDashboard;

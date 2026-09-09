import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, Eye, AlertCircle, RefreshCcw, WifiOff, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getRelatorioData } from '../fluxoCaixaUtils';
import SelecionarColunasFluxo from './components/SelecionarColunasFluxo';
import { fetchWithRetry } from '@/lib/fetchWithRetry';

const RelatoriosFluxoCaixa = () => {
  // State
  const [filters, setFilters] = useState({
    dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dataFim: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    fonte: 'FLUXO_COMPLETO',
    categoria: '',
  });

  const [data, setData] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState(['data', 'categoria', 'descricao', 'valor_previsto', 'valor_realizado', 'diferenca']);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Data
  useEffect(() => {
    loadData();
  }, [filters]);

  const mockFetcher = async (url) => {
      // Simulação de sucesso padrão
      await new Promise(r => setTimeout(r, 500)); 
      return { ok: true, status: 200, json: async () => ({}) };
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Uso do fetchWithRetry para garantir robustez (mesmo com mock)
      await fetchWithRetry('/api/relatorios/fluxo', {}, 3, 800, mockFetcher);

      // Carregamento real dos dados (Local)
      const result = getRelatorioData(filters);
      setData(result || []);
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      setError({
          message: "Falha na comunicação com o servidor de relatórios.",
          details: error.message
      });
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = () => {
      if (!data || data.length === 0) return { prev: 0, real: 0, diff: 0 };
      const prev = data.reduce((acc, i) => acc + (i.valor_previsto || 0), 0);
      const real = data.reduce((acc, i) => acc + (i.valor_realizado || 0), 0);
      const diff = real - prev;
      return { prev, real, diff };
  };

  const totals = calculateTotals();

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-96 p-6 bg-background rounded-lg shadow-sm border">
             <WifiOff className="h-10 w-10 text-muted-foreground mb-4" />
             <h3 className="text-lg font-semibold text-foreground">Erro de Carregamento</h3>
             <p className="text-muted-foreground mb-4 text-center max-w-xs">{error.message}</p>
             <Button onClick={loadData} variant="outline" className="gap-2">
                 <RefreshCcw className="h-4 w-4" /> Tentar Agora
             </Button>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 p-6">
      <Helmet><title>Relatórios - Fluxo de Caixa</title></Helmet>
      
      <PageHeader 
        title="Relatórios de Fluxo de Caixa" 
        description="Listagem detalhada de transações para análise e conferência."
        breadcrumb={[
            { label: 'Financeiro' },
            { label: 'Fluxo de Caixa', path: '/financeiro/fluxo-caixa' },
            { label: 'Relatórios' }
        ]}
      />

      {/* Filters Section */}
      <Card className="bg-muted border-border">
        <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filtros do Relatório
            </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Fonte de Dados</label>
                <Select value={filters.fonte} onValueChange={v => setFilters({...filters, fonte: v})}>
                    <SelectTrigger className="bg-background h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="FLUXO_COMPLETO">Todos Lançamentos</SelectItem>
                        <SelectItem value="ENTRADAS">Apenas Entradas</SelectItem>
                        <SelectItem value="SAIDAS">Apenas Saídas</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Data Início</label>
                <Input type="date" className="bg-background h-9" value={filters.dataInicio} onChange={e => setFilters({...filters, dataInicio: e.target.value})} />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Data Fim</label>
                <Input type="date" className="bg-background h-9" value={filters.dataFim} onChange={e => setFilters({...filters, dataFim: e.target.value})} />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Categoria (Busca)</label>
                <Input 
                    placeholder="Filtrar por categoria..." 
                    className="bg-background h-9" 
                    value={filters.categoria} 
                    onChange={e => setFilters({...filters, categoria: e.target.value})} 
                />
            </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-background">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Atualizando relatório...</p>
        </div>
      ) : (
        <>
            {/* KPIs Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-slate-400">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground uppercase font-bold">Total Previsto</p>
                        <h3 className="text-xl font-mono font-bold text-foreground">R$ {totals.prev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground uppercase font-bold">Total Realizado</p>
                        <h3 className="text-xl font-mono font-bold text-blue-600">R$ {totals.real.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </CardContent>
                </Card>
                <Card className={`border-l-4 ${totals.diff >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground uppercase font-bold">Diferença (Real - Prev)</p>
                        <h3 className={`text-xl font-mono font-bold ${totals.diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            R$ {totals.diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Eye className="w-4 h-4 text-muted-foreground" /> Dados
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setIsColumnModalOpen(true)}>
                        Configurar Colunas
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto max-h-[600px]">
                        <Table>
                            <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                                <TableRow>
                                    {selectedColumns.includes('data') && <TableHead className="w-[120px]">Data</TableHead>}
                                    {selectedColumns.includes('categoria') && <TableHead>Categoria</TableHead>}
                                    {selectedColumns.includes('descricao') && <TableHead>Descrição</TableHead>}
                                    {selectedColumns.includes('dreGroup') && <TableHead className="w-[80px]">Grupo</TableHead>}
                                    {selectedColumns.includes('conta') && <TableHead>Conta</TableHead>}
                                    {selectedColumns.includes('valor_previsto') && <TableHead className="text-right w-[140px]">Previsto</TableHead>}
                                    {selectedColumns.includes('valor_realizado') && <TableHead className="text-right w-[140px]">Realizado</TableHead>}
                                    {selectedColumns.includes('diferenca') && <TableHead className="text-right w-[140px]">Diferença</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={selectedColumns.length} className="text-center py-8 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                            <AlertCircle className="w-8 h-8 opacity-20" />
                                            <p>Nenhum dado encontrado para os filtros selecionados.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item, idx) => {
                                        const diff = (item.valor_realizado || 0) - (item.valor_previsto || 0);
                                        return (
                                            <TableRow key={item.id || idx} className="hover:bg-muted">
                                                {selectedColumns.includes('data') && <TableCell className="font-mono text-xs">{new Date(item.data).toLocaleDateString('pt-BR')}</TableCell>}
                                                {selectedColumns.includes('categoria') && <TableCell className="text-xs font-medium">{item.categoria}</TableCell>}
                                                {selectedColumns.includes('descricao') && <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{item.descricao}</TableCell>}
                                                {selectedColumns.includes('dreGroup') && <TableCell className="text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.dreGroup === 'A' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>{item.dreGroup}</span></TableCell>}
                                                {selectedColumns.includes('conta') && <TableCell className="text-xs text-muted-foreground">{item.conta || '-'}</TableCell>}
                                                {selectedColumns.includes('valor_previsto') && <TableCell className="text-right font-mono text-xs text-muted-foreground">{(item.valor_previsto || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</TableCell>}
                                                {selectedColumns.includes('valor_realizado') && <TableCell className="text-right font-mono text-xs font-medium">{(item.valor_realizado || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</TableCell>}
                                                {selectedColumns.includes('diferenca') && <TableCell className={`text-right font-mono text-xs font-bold ${diff < 0 && item.dreGroup === 'A' ? 'text-red-600' : (diff > 0 && item.dreGroup === 'B' ? 'text-red-600' : 'text-emerald-600')}`}>{diff.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</TableCell>}
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </>
      )}

      <SelecionarColunasFluxo 
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        selectedColumns={selectedColumns}
        onSave={setSelectedColumns}
      />
    </div>
  );
};

export default RelatoriosFluxoCaixa;
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
import { supabase } from '@/lib/customSupabaseClient';
import SelecionarColunasFluxo from './components/SelecionarColunasFluxo';
import { formatDateOnly } from '@/lib/dateUtils';

const RelatoriosFluxoCaixa = () => {
  const [filters, setFilters] = useState({
    dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dataFim: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    tipo: 'TODOS',
    status: 'TODOS',
    categoria: '',
  });

  const [rawData, setRawData] = useState([]);
  const [centrosCustoMap, setCentrosCustoMap] = useState({});
  const [selectedColumns, setSelectedColumns] = useState(['data', 'tipo', 'status', 'categoria', 'descricao', 'valor']);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [filters.dataInicio, filters.dataFim]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('fluxo_caixa_movimentacoes')
        .select('*')
        .gte('data_movimentacao', filters.dataInicio)
        .lte('data_movimentacao', filters.dataFim)
        .order('data_movimentacao', { ascending: false });
      if (fetchError) throw fetchError;

      const centroIds = [...new Set((data || []).map(m => m.centro_custo_id).filter(Boolean))];
      let map = {};
      if (centroIds.length > 0) {
        const { data: centros } = await supabase.from('centros_custo').select('id, codigo, nome').in('id', centroIds);
        (centros || []).forEach(c => { map[c.id] = c; });
      }
      setCentrosCustoMap(map);
      setRawData(data || []);
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      setError({
          message: "Falha ao carregar os dados do fluxo de caixa.",
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

  const data = rawData.filter(item => {
    if (filters.tipo !== 'TODOS' && item.tipo !== filters.tipo) return false;
    if (filters.status !== 'TODOS' && item.status !== filters.status) return false;
    if (filters.categoria && !(item.categoria || '').toLowerCase().includes(filters.categoria.toLowerCase())) return false;
    return true;
  });

  const calculateTotals = () => {
      const prev = data.filter(i => i.status === 'Previsto').reduce((acc, i) => acc + parseFloat(i.valor || 0), 0);
      const real = data.filter(i => i.status === 'Realizado').reduce((acc, i) => acc + parseFloat(i.valor || 0), 0);
      return { prev, real };
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
        description="Listagem detalhada de movimentações para análise e conferência."
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
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Tipo</label>
                <Select value={filters.tipo} onValueChange={v => setFilters({...filters, tipo: v})}>
                    <SelectTrigger className="bg-background h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODOS">Todos</SelectItem>
                        <SelectItem value="Receita">Entradas (Receita)</SelectItem>
                        <SelectItem value="Despesa">Saídas (Despesa)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Status</label>
                <Select value={filters.status} onValueChange={v => setFilters({...filters, status: v})}>
                    <SelectTrigger className="bg-background h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODOS">Todos</SelectItem>
                        <SelectItem value="Previsto">Previsto</SelectItem>
                        <SelectItem value="Realizado">Realizado</SelectItem>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    {selectedColumns.includes('tipo') && <TableHead className="w-[100px]">Tipo</TableHead>}
                                    {selectedColumns.includes('status') && <TableHead className="w-[100px]">Status</TableHead>}
                                    {selectedColumns.includes('categoria') && <TableHead>Categoria</TableHead>}
                                    {selectedColumns.includes('centroCusto') && <TableHead>Centro de Custo</TableHead>}
                                    {selectedColumns.includes('descricao') && <TableHead>Descrição</TableHead>}
                                    {selectedColumns.includes('valor') && <TableHead className="text-right w-[140px]">Valor</TableHead>}
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
                                    data.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-muted">
                                            {selectedColumns.includes('data') && <TableCell className="font-mono text-xs">{formatDateOnly(item.data_movimentacao)}</TableCell>}
                                            {selectedColumns.includes('tipo') && (
                                                <TableCell>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.tipo === 'Receita' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
                                                        {item.tipo === 'Receita' ? 'Entrada' : 'Saída'}
                                                    </span>
                                                </TableCell>
                                            )}
                                            {selectedColumns.includes('status') && (
                                                <TableCell>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'Realizado' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'}`}>
                                                        {item.status}
                                                    </span>
                                                </TableCell>
                                            )}
                                            {selectedColumns.includes('categoria') && <TableCell className="text-xs font-medium">{item.categoria}</TableCell>}
                                            {selectedColumns.includes('centroCusto') && <TableCell className="text-xs text-muted-foreground">{centrosCustoMap[item.centro_custo_id] ? `${centrosCustoMap[item.centro_custo_id].codigo} - ${centrosCustoMap[item.centro_custo_id].nome}` : '-'}</TableCell>}
                                            {selectedColumns.includes('descricao') && <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{item.descricao}</TableCell>}
                                            {selectedColumns.includes('valor') && <TableCell className={`text-right font-mono text-xs font-bold ${item.tipo === 'Receita' ? 'text-emerald-600' : 'text-red-600'}`}>{parseFloat(item.valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</TableCell>}
                                        </TableRow>
                                    ))
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

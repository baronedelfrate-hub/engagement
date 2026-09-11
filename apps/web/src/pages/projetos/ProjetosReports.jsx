import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { supabase } from '@/lib/customSupabaseClient';
import { resolveCompanyId } from '@/lib/companyUtils';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDateOnly } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import ProjetosReportsFilters from './ProjetosReportsFilters';
import ProjetosReportsSummary from './ProjetosReportsSummary';

const COLORS = ['#94a3b8', '#3b82f6', '#eab308', '#10b981', '#ef4444'];

export default function ProjetosReports() {
  const [projetos, setProjetos] = useState([]);
  const [filteredProjetos, setFilteredProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    cliente_id: 'all',
    status: 'all'
  });

  const fetchProjetos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cid = await resolveCompanyId(null);
      if (!cid) throw new Error("Empresa não identificada.");

      const { data, error: fetchError } = await supabase
        .from('projetos')
        .select(`*, cliente:clientes(nome)`)
        .eq('company_id', cid)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setProjetos(data || []);
      applyFilters(data || [], filters);
    } catch (err) {
      console.error("Erro ao buscar projetos para relatórios:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjetos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = (dataToFilter, currentFilters) => {
    let result = [...dataToFilter];

    if (currentFilters.status !== 'all') {
      result = result.filter(p => p.status === currentFilters.status);
    }

    if (currentFilters.cliente_id !== 'all') {
      result = result.filter(p => p.cliente_id === currentFilters.cliente_id);
    }

    if (currentFilters.dataInicio) {
      result = result.filter(p => new Date(p.data_inicio) >= new Date(currentFilters.dataInicio));
    }

    if (currentFilters.dataFim) {
      result = result.filter(p => new Date(p.data_fim) <= new Date(currentFilters.dataFim));
    }

    setFilteredProjetos(result);
  };

  const handleFilter = (newFilters) => {
    applyFilters(projetos, newFilters);
  };

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let total = filteredProjetos.length;
    let budget = 0;
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;

    filteredProjetos.forEach(p => {
      budget += Number(p.orcamento || 0);
      if (p.status === 'Concluído') completed++;
      if (p.status === 'Em Andamento') inProgress++;
      
      if (p.data_fim && p.status !== 'Concluído' && p.status !== 'Cancelado') {
        const endDate = new Date(p.data_fim);
        if (endDate < today) overdue++;
      }
    });

    return { total, budget, completed, inProgress, overdue };
  }, [filteredProjetos]);

  const chartData = useMemo(() => {
    const statusCount = { 'Planejamento': 0, 'Em Andamento': 0, 'Pausado': 0, 'Concluído': 0, 'Cancelado': 0 };
    const budgetByStatus = { 'Planejamento': 0, 'Em Andamento': 0, 'Pausado': 0, 'Concluído': 0, 'Cancelado': 0 };
    const projectsByMonth = {};

    filteredProjetos.forEach(p => {
      const status = p.status || 'Planejamento';
      if (statusCount[status] !== undefined) {
        statusCount[status]++;
        budgetByStatus[status] += Number(p.orcamento || 0);
      }

      if (p.data_inicio) {
        const date = new Date(p.data_inicio);
        const monthYear = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        if (!projectsByMonth[monthYear]) projectsByMonth[monthYear] = 0;
        projectsByMonth[monthYear]++;
      }
    });

    const statusPieData = Object.keys(statusCount).map(key => ({
      name: key,
      value: statusCount[key]
    })).filter(item => item.value > 0);

    const budgetBarData = Object.keys(budgetByStatus).map(key => ({
      name: key,
      valor: budgetByStatus[key]
    })).filter(item => item.valor > 0);

    const timelineData = Object.keys(projectsByMonth)
      .map(key => {
        const [m, y] = key.split('/');
        return { name: key, quantidade: projectsByMonth[key], sortKey: `${y}${m}` };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ name, quantidade }) => ({ name, quantidade }));

    return { statusPieData, budgetBarData, timelineData };
  }, [filteredProjetos]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Helmet><title>Relatórios de Projetos | ERP</title></Helmet>
      
      <div className="flex items-center justify-between">
        <PageHeader title="Relatórios de Projetos" description="Análise de desempenho e indicadores dos projetos" />
        <Button variant="outline" onClick={fetchProjetos} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ProjetosReportsFilters filters={filters} setFilters={setFilters} onFilter={handleFilter} />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      ) : (
        <>
          <ProjetosReportsSummary stats={stats} />

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader><CardTitle className="text-base">Projetos por Status</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {chartData.statusPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.statusPieData}
                          cx="50%" cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Sem dados</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Orçamento por Status</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {chartData.budgetBarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.budgetBarData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} tickMargin={10} />
                        <YAxis tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`} fontSize={12} />
                        <RechartsTooltip formatter={(val) => formatCurrency(val)} />
                        <Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Sem dados</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 xl:col-span-1">
              <CardHeader><CardTitle className="text-base">Início de Projetos (Tempo)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {chartData.timelineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.timelineData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis allowDecimals={false} fontSize={12} />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="quantidade" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Sem dados</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Detalhamento dos Projetos</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Término</TableHead>
                      <TableHead>Orçamento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjetos.length > 0 ? (
                      filteredProjetos.map(p => {
                        const isOverdue = p.data_fim && new Date(p.data_fim) < new Date() && p.status !== 'Concluído' && p.status !== 'Cancelado';
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.nome}</TableCell>
                            <TableCell>{p.cliente?.nome || '-'}</TableCell>
                            <TableCell>{formatDateOnly(p.data_inicio)}</TableCell>
                            <TableCell className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {formatDateOnly(p.data_fim)}
                              {isOverdue && <span className="ml-2 text-xs">(Atrasado)</span>}
                            </TableCell>
                            <TableCell>{formatCurrency(p.orcamento)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                p.status === 'Concluído' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' :
                                p.status === 'Cancelado' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800' :
                                p.status === 'Em Andamento' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800' :
                                'bg-muted text-foreground'
                              }>
                                {p.status || 'Planejamento'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum projeto encontrado com os filtros atuais.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCobranca } from '@/hooks/useCobranca';
import { calculateInadimplencia, calculatePMR, formatCurrency, getPhaseSequence, PHASES } from '@/lib/cobrancaService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Loader2, TrendingDown, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

const CobrancaDashboard = () => {
  const { fetchAllCobranca, loading: apiLoading } = useCobranca();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetchAllCobranca({ status: 'ALL' }); // Fetch all history/active
      setData(res || []);
      setLoading(false);
    };
    load();
  }, [fetchAllCobranca]);

  // Metrics
  const activeCobrancas = data.filter(i => i.status === 'ativo');
  const inadimplenciaRate = calculateInadimplencia(activeCobrancas);
  const pmr = calculatePMR(data); 
  const totalVencidos = activeCobrancas.filter(i => new Date(i.data_vencimento) < new Date()).length;
  const totalPagos = data.filter(i => i.status === 'resolvido').length;

  // Chart Data Preparation
  
  // 1. Distribution by Phase
  const phaseDistribution = getPhaseSequence().map(phase => ({
    name: PHASES[phase].label.split('(')[0].trim(),
    value: activeCobrancas.filter(i => i.fase === phase).length,
  })).filter(entry => entry.value > 0); 

  const COLORS_PIE = ['#3b82f6', '#06b6d4', '#eab308', '#f97316', '#ef4444', '#881337'];

  // 2. Top Debtors (Active only)
  const topDebtors = Object.values(activeCobrancas
    .reduce((acc, curr) => {
      const id = curr.cliente_id;
      if (!acc[id]) acc[id] = { name: curr.cliente?.nome, value: 0 };
      acc[id].value += parseFloat(curr.valor);
      return acc;
    }, {}))
    .sort((a,b) => b.value - a.value)
    .slice(0, 5);
  
  // 3. Status Bar Chart (Vencidos vs Pagos)
  const statusChartData = [
    { name: 'Títulos Vencidos', count: totalVencidos, color: '#ef4444' },
    { name: 'Títulos Pagos', count: totalPagos, color: '#22c55e' },
  ];

  return (
    <>
      <Helmet><title>Dashboard de Cobrança | Financeiro</title></Helmet>
      <PageHeader 
        title="Dashboard de Recuperação" 
        description="Indicadores chave de performance de cobrança e inadimplência." 
      />

      {(loading || apiLoading) && data.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-background border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Taxa de Inadimplência</p>
                    <h3 className="text-2xl font-bold text-red-500 mt-2">{inadimplenciaRate.toFixed(1)}%</h3>
                  </div>
                  <div className="p-2 bg-red-900/20 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Títulos Vencidos</p>
                    <h3 className="text-2xl font-bold text-orange-500 mt-2">{totalVencidos}</h3>
                  </div>
                  <div className="p-2 bg-orange-900/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Recuperados (Pagos)</p>
                    <h3 className="text-2xl font-bold text-emerald-500 mt-2">{totalPagos}</h3>
                  </div>
                  <div className="p-2 bg-emerald-900/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background border-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Prazo Médio Rec. (PMR)</p>
                    <h3 className="text-2xl font-bold text-blue-500 mt-2">{pmr.toFixed(0)} dias</h3>
                  </div>
                  <div className="p-2 bg-blue-900/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-background border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Distribuição por Fase (Ativos)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={phaseDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label
                    >
                      {phaseDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                      itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-background border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Top 5 Clientes Inadimplentes (Valor)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={topDebtors} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" style={{ fontSize: '10px' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                        itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                 </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-background border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Títulos Vencidos vs Pagos</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                      itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                      formatter={(value) => `${value} títulos`}
                    />
                    <Legend />
                    <Bar dataKey="count" fill={(entry) => entry.color} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-background border-border">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Timeline de Recuperação (Últimos 30 dias)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[]}> {/* Placeholder */}
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                      itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="recovered" stroke="#22c55e" activeDot={{ r: 8 }} name="Recuperados" />
                    <Line type="monotone" dataKey="new_overdue" stroke="#ef4444" name="Novos Vencidos" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
};

export default CobrancaDashboard;
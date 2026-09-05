import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { storage } from '@/lib/storage';
import AnimatedCounter from '@/components/AnimatedCounter';

function DashboardVendas() {
  const [stats, setStats] = useState({
    totalOrcamentos: 0,
    totalPedidos: 0,
    conversionRate30: 0,
    conversionRate90: 0,
    pieData: []
  });

  useEffect(() => {
    const orcamentos = storage.get('ORCAMENTOS');
    const pedidos = storage.get('PEDIDOS');

    const now = new Date();
    const days30 = new Date(now.setDate(now.getDate() - 30));
    const days90 = new Date(now.setDate(now.getDate() - 60)); 

    const getConversion = (dateLimit) => {
        const recentQuotes = orcamentos.filter(o => new Date(o.dataEmissao) >= dateLimit).length;
        const recentOrders = pedidos.filter(p => new Date(p.dataEmissao) >= dateLimit).length;
        return recentQuotes > 0 ? (recentOrders / recentQuotes) * 100 : 0;
    };

    setStats({
      totalOrcamentos: orcamentos.length,
      totalPedidos: pedidos.length,
      conversionRate30: getConversion(days30),
      conversionRate90: getConversion(days90),
      pieData: [
        { name: 'Orçamentos', value: orcamentos.length },
        { name: 'Pedidos Fechados', value: pedidos.length }
      ]
    });
  }, []);

  const COLORS = ['#64748b', '#3b82f6'];

  return (
    <>
      <Helmet>
        <title>Dashboard Vendas - ERP Platform</title>
      </Helmet>

      <PageHeader title="Dashboard de Vendas" description="Métricas de performance comercial" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-400">Total de Orçamentos</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-white"><AnimatedCounter value={stats.totalOrcamentos} /></div></CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-400">Total de Pedidos</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-blue-500"><AnimatedCounter value={stats.totalPedidos} /></div></CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-400">Conv. (30 dias)</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-emerald-500"><AnimatedCounter value={stats.conversionRate30} suffix="%" /></div></CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-purple-400">Conv. (90 dias)</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-purple-500"><AnimatedCounter value={stats.conversionRate90} suffix="%" /></div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-h-[400px]">
            <CardHeader><CardTitle>Funil de Vendas Simplificado</CardTitle></CardHeader>
            <CardContent>
                 <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={stats.pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                label
                                animationDuration={1500}
                            >
                                {stats.pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Insights</CardTitle></CardHeader>
            <CardContent>
                <div className={`p-4 rounded-lg border mb-4 ${stats.conversionRate30 > 30 ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                    {stats.conversionRate30 > 30 
                        ? "Sua taxa de conversão recente (30d) está saudável." 
                        : "Atenção: A taxa de conversão recente está baixa. Verifique os follow-ups."}
                </div>
                <div className="space-y-4 mt-6">
                    <h4 className="font-medium text-sm text-slate-400 uppercase tracking-wider">Comparativo de Períodos</h4>
                    <div className="flex items-center justify-between text-sm border-b border-white/10 pb-3">
                        <span className="text-slate-300">Últimos 30 dias</span>
                        <span className="font-bold text-emerald-400"><AnimatedCounter value={stats.conversionRate30} suffix="%" /></span>
                    </div>
                    <div className="flex items-center justify-between text-sm border-b border-white/10 pb-3">
                        <span className="text-slate-300">Últimos 90 dias</span>
                        <span className="font-bold text-purple-400"><AnimatedCounter value={stats.conversionRate90} suffix="%" /></span>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}

export default DashboardVendas;
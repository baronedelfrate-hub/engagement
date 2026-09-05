import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { storage } from '@/lib/storage';

function DashboardControladoria() {
  const [dreChartData, setDreChartData] = useState([]);
  const [kpis, setKpis] = useState({
      avgMargin: 0,
      avgEbitda: 0,
      ytdRevenue: 0
  });

  useEffect(() => {
    // Reusing logic from DRE calculation roughly for visual
    const receitas = storage.get('CONTAS_RECEBER');
    const despesas = storage.get('CONTAS_PAGAR');
    
    // Simple agg by month for last 6 months
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push(d);
    }

    const data = months.map(monthDate => {
        const monthKey = `${monthDate.getMonth() + 1}/${monthDate.getFullYear()}`;
        const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

        const r = receitas.filter(i => new Date(i.dataEmissao) >= start && new Date(i.dataEmissao) <= end)
            .reduce((acc, curr) => acc + parseFloat(curr.valorTotal || 0), 0);
        const d = despesas.filter(i => new Date(i.dataEmissao) >= start && new Date(i.dataEmissao) <= end)
            .reduce((acc, curr) => acc + parseFloat(curr.valorTotal || 0), 0);
        
        return {
            name: monthKey,
            Receita: r,
            Despesa: d,
            Lucro: r - d
        };
    });

    const totalRev = data.reduce((acc, curr) => acc + curr.Receita, 0);
    const totalProfit = data.reduce((acc, curr) => acc + curr.Lucro, 0);
    
    setDreChartData(data);
    setKpis({
        ytdRevenue: totalRev,
        avgMargin: totalRev > 0 ? (totalProfit / totalRev) * 100 : 0,
        avgEbitda: totalProfit // Proxy for simplicity
    });
  }, []);

  return (
    <>
      <Helmet>
        <title>Dashboard Controladoria - ERP Platform</title>
      </Helmet>

      <PageHeader title="Dashboard de Controladoria" description="Visão estratégica de resultados" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Receita Acumulada (6m)</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">R$ {kpis.ytdRevenue.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-600">Margem Média</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-green-700">{kpis.avgMargin.toFixed(1)}%</div></CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-600">Resultado Operacional</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-blue-700">R$ {kpis.avgEbitda.toFixed(2)}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-h-[400px]">
            <CardHeader><CardTitle>Receita vs Despesa (Semestral)</CardTitle></CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dreChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Receita" fill="#22c55e" />
                            <Bar dataKey="Despesa" fill="#ef4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>

        <Card className="min-h-[400px]">
            <CardHeader><CardTitle>Evolução do Resultado</CardTitle></CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dreChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="Lucro" stroke="#8884d8" fill="#8884d8" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}

export default DashboardControladoria;
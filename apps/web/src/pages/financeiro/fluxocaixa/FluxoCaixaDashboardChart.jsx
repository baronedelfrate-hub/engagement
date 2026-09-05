import React from 'react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FluxoCaixaDashboardChart = ({ timeline }) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg border border-dashed">
        <p className="text-slate-400">Sem dados para exibir no gráfico.</p>
      </div>
    );
  }

  // Transform data for Recharts
  const data = timeline.map(day => ({
    date: new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    fullDate: new Date(day.date).toLocaleDateString('pt-BR'),
    saldoPrevisto: day.saldoFinal?.previsto || 0,
    saldoRealizado: day.saldoFinal?.realizado || 0,
    entradasPrevisto: day.entradas?.previsto || 0,
    entradasRealizado: day.entradas?.realizado || 0,
    saidasPrevisto: Math.abs(day.saidas?.previsto || 0), // Absolute for visualization
    saidasRealizado: Math.abs(day.saidas?.realizado || 0),
  }));

  const formatCurrency = (value) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Gráfico de Saldo Acumulado */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Saldo: Previsto vs Realizado</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#64748b' }}
                interval="preserveStartEnd"
                minTickGap={30}
              />
              <YAxis 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `R$ ${value/1000}k`}
                tick={{ fill: '#64748b' }}
              />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area 
                type="monotone" 
                dataKey="saldoPrevisto" 
                name="Saldo Previsto" 
                fill="#dbeafe" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={0.5} 
              />
              <Line 
                type="monotone" 
                dataKey="saldoRealizado" 
                name="Saldo Realizado" 
                stroke="#059669" 
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Movimentações */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentações Diárias: Entradas e Saídas (Realizado)</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#64748b' }}
                interval="preserveStartEnd"
                minTickGap={30}
              />
              <YAxis 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `R$ ${value/1000}k`}
                tick={{ fill: '#64748b' }}
              />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar 
                dataKey="entradasRealizado" 
                name="Entradas (Receitas)" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={50}
              />
              <Bar 
                dataKey="saidasRealizado" 
                name="Saídas (Despesas)" 
                fill="#ef4444" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={50}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default FluxoCaixaDashboardChart;
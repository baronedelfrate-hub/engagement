import React from 'react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateOnly } from '@/lib/dateUtils';

const FluxoCaixaDashboardChart = ({ timeline }) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg border border-dashed">
        <p className="text-muted-foreground">Sem dados para exibir no gráfico.</p>
      </div>
    );
  }

  // Transform data for Recharts
  const data = timeline.map(day => ({
    date: formatDateOnly(day.date, { day: '2-digit', month: '2-digit' }),
    fullDate: formatDateOnly(day.date),
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
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
                minTickGap={30}
              />
              <YAxis 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `R$ ${value/1000}k`}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area
                type="monotone"
                dataKey="saldoPrevisto"
                name="Saldo Previsto"
                fill="#3b82f6"
                fillOpacity={0.15}
                stroke="#3b82f6"
                strokeWidth={2}
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
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
                minTickGap={30}
              />
              <YAxis 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `R$ ${value/1000}k`}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))' }}
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
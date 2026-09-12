import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { RefreshCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuthContext } from '@/contexts/AuthContext';

function PontoEquilibrio() {
  const { company_id } = useAuthContext();

  // Base values from DRE (using last month as baseline)
  const [baseValues, setBaseValues] = useState({
    revenue: 0,
    variableCost: 0,
    fixedCost: 0
  });
  const [hasRealData, setHasRealData] = useState(true);

  // Simulation State
  const [simValues, setSimValues] = useState({
    revenue: 0,
    variableCostPct: 0, // Percentage of Revenue
    fixedCost: 0
  });

  useEffect(() => {
    if (company_id) loadBaseData();
  }, [company_id]);

  const loadBaseData = async () => {
    // Logic similar to DRE but taking last month
    const now = new Date();
    // Let's take last full month for stable data
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startStr = startOfMonth.toISOString().split('T')[0];
    const endStr = endOfMonth.toISOString().split('T')[0];

    const [{ data: monthReceitas }, { data: monthDespesas }, { data: categorias }] = await Promise.all([
      supabase.from('contas_receber').select('valor_original').eq('company_id', company_id).gte('data_emissao', startStr).lte('data_emissao', endStr),
      supabase.from('contas_pagar').select('valor_original, categoria_id').eq('company_id', company_id).gte('data_emissao', startStr).lte('data_emissao', endStr),
      supabase.from('categorias').select('id, grupo_dre').eq('company_id', company_id),
    ]);

    // Custo variável = categorias classificadas como "Custo dos Serviços" (categorias.grupo_dre),
    // já que esse é o custo que escala com o volume vendido. O resto entra como custo fixo.
    const variableCatIds = (categorias || []).filter(c => c.grupo_dre === 'custo_servico').map(c => c.id);

    const revenue = (monthReceitas || []).reduce((acc, curr) => acc + parseFloat(curr.valor_original || 0), 0);
    let variableCost = 0;
    let fixedCost = 0;

    (monthDespesas || []).forEach(d => {
        const val = parseFloat(d.valor_original || 0);
        if (variableCatIds.includes(d.categoria_id)) {
            variableCost += val;
        } else {
            fixedCost += val;
        }
    });

    const hasData = revenue > 0 || variableCost > 0 || fixedCost > 0;
    setHasRealData(hasData);

    setBaseValues({ revenue, variableCost, fixedCost });

    // Init simulation
    setSimValues({
        revenue,
        variableCostPct: revenue > 0 ? (variableCost / revenue) * 100 : 0,
        fixedCost
    });
  };

  // Calculations
  const calculatePE = (rev, varPct, fix) => {
    const marginPct = 1 - (varPct / 100);
    // PE = Custo Fixo / Margem Contribuicao %
    if (marginPct <= 0) return 0;
    return fix / marginPct;
  };

  const peValue = calculatePE(simValues.revenue, simValues.variableCostPct, simValues.fixedCost);
  const marginValue = simValues.revenue * (1 - simValues.variableCostPct / 100);
  const profit = marginValue - simValues.fixedCost;
  const pePercent = simValues.revenue > 0 ? (peValue / simValues.revenue) * 100 : 0;

  // Chart Data Generation
  const generateChartData = () => {
    const data = [];
    const steps = 5;
    const maxRev = Math.max(simValues.revenue * 1.5, peValue * 1.5);
    const stepSize = maxRev / steps;

    for (let i = 0; i <= steps; i++) {
        const rev = i * stepSize;
        const varCost = rev * (simValues.variableCostPct / 100);
        const totalCost = simValues.fixedCost + varCost;
        data.push({
            revenue: rev, // x-axis sort of
            Receita: rev,
            CustoTotal: totalCost,
            CustoFixo: simValues.fixedCost
        });
    }
    return data;
  };

  const chartData = generateChartData();

  return (
    <>
      <Helmet>
        <title>Ponto de Equilíbrio - ERP Platform</title>
      </Helmet>

      <PageHeader
        title="Cálculo do Ponto de Equilíbrio"
        description="Simule cenários para encontrar seu Break-even Point (PE)"
        action={
            <Button onClick={loadBaseData} variant="outline" className="gap-2">
                <RefreshCcw className="h-4 w-4" /> Resetar para Dados Reais (Mês Anterior)
            </Button>
        }
      />

      {!hasRealData && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sem dado real do mês anterior</AlertTitle>
          <AlertDescription>
            Não há contas a receber/pagar lançadas no mês anterior para esta empresa. Os valores abaixo começam zerados — digite manualmente para simular um cenário.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Inputs Simulation */}
        <Card className="lg:col-span-1">
            <CardHeader><CardTitle>Simulador de Cenários</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Receita Projetada (R$)</Label>
                    <Input 
                        type="number" 
                        value={simValues.revenue} 
                        onChange={e => setSimValues({...simValues, revenue: parseFloat(e.target.value) || 0})}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Custos Fixos Totais (R$)</Label>
                    <Input 
                        type="number" 
                        value={simValues.fixedCost} 
                        onChange={e => setSimValues({...simValues, fixedCost: parseFloat(e.target.value) || 0})}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Custo Variável sobre Venda (%)</Label>
                    <div className="flex items-center gap-2">
                        <Input 
                            type="number" 
                            value={simValues.variableCostPct} 
                            onChange={e => setSimValues({...simValues, variableCostPct: parseFloat(e.target.value) || 0})}
                        />
                        <span className="text-muted-foreground">%</span>
                    </div>
                </div>
                
                <div className="pt-4 border-t">
                    <div className="flex justify-between text-sm mb-1">
                        <span>Margem de Contribuição:</span>
                        <span className="font-bold">{(100 - simValues.variableCostPct).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Lucro Projetado:</span>
                        <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {profit.toFixed(2)}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Resultados do Ponto de Equilíbrio</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900 flex flex-col items-center justify-center text-center">
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium uppercase">PE Financeiro (Valor)</span>
                    <span className="text-3xl font-bold text-blue-800 dark:text-blue-400 mt-2">R$ {peValue.toFixed(2)}</span>
                    <span className="text-xs text-blue-500 dark:text-blue-400 mt-1">Necessário faturar para zerar</span>
                </div>
                <div className="bg-muted p-4 rounded-lg border border-border flex flex-col items-center justify-center text-center">
                    <span className="text-sm text-muted-foreground font-medium uppercase">% da Receita Atual</span>
                    <span className={`text-3xl font-bold mt-2 ${pePercent > 100 ? 'text-red-600' : 'text-green-600'}`}>
                        {pePercent.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">Capacidade utilizada</span>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 dark:bg-purple-950/30 dark:border-purple-900 flex flex-col items-center justify-center text-center">
                    <span className="text-sm text-purple-600 dark:text-purple-400 font-medium uppercase">PE (Unidades*)</span>
                    <span className="text-3xl font-bold text-purple-800 dark:text-purple-400 mt-2">
                        {(peValue / (simValues.revenue > 0 ? (simValues.revenue / 1000) : 1)).toFixed(0)} u
                    </span>
                    <span className="text-xs text-purple-500 dark:text-purple-400 mt-1">*Estimado (Tkt Médio R$ {(simValues.revenue/1000).toFixed(0)})</span>
                </div>
            </CardContent>
            <CardContent className="h-[300px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="revenue" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(val) => `R$ ${val/1000}k`} />
                        <YAxis tickFormatter={(val) => `R$ ${val/1000}k`} />
                        <Tooltip formatter={(val) => `R$ ${val.toFixed(2)}`} labelFormatter={(val) => `Receita: R$ ${val.toFixed(2)}`} />
                        <Legend />
                        <Line type="monotone" dataKey="Receita" stroke="#22c55e" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="CustoTotal" stroke="#ef4444" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="CustoFixo" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                        <ReferenceLine x={peValue} stroke="orange" label="PE" />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
    </>
  );
}

export default PontoEquilibrio;
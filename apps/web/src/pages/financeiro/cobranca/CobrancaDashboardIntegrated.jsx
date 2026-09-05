import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCobrancaIntegrated } from '@/hooks/useCobrancaIntegrated';
import { formatCurrency } from '@/lib/cobrancaService';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';
import { TrendingDown, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import { differenceInDays } from 'date-fns';

const CobrancaDashboardIntegrated = () => {
  const { fetchContasReceberForCobranca, calculateDiasAteVencimento } = useCobrancaIntegrated();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetchContasReceberForCobranca({});
      setData(res || []);
      setLoading(false);
    };
    load();
  }, [fetchContasReceberForCobranca]);

  const active = data.filter(i => i.status_cobranca === 'em_cobranca');
  const recovered = data.filter(i => i.status_cobranca === 'recuperado');

  const totalInCollection = active.reduce((acc, curr) => acc + parseFloat(curr.valor_original || 0), 0);
  const totalRecovered = recovered.reduce((acc, curr) => acc + parseFloat(curr.valor_recebido || 0), 0);

  // Recovery Rate
  const totalCount = active.length + recovered.length;
  const recoveryRate = totalCount > 0 ? (recovered.length / totalCount) * 100 : 0;

  // Average Days to Recover
  const recoveryTimes = recovered
    .filter(i => i.data_baixa && i.data_emissao)
    .map(i => differenceInDays(new Date(i.data_baixa), new Date(i.data_emissao)));
  const avgRecoveryDays = recoveryTimes.length > 0 
    ? (recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length).toFixed(0) 
    : 0;

  const pieData = [
    { name: 'Em Cobrança', value: active.length },
    { name: 'Recuperado', value: recovered.length }
  ].filter(d => d.value > 0);

  const COLORS = ['#eab308', '#10b981'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div><p className="text-sm text-slate-400">Em Cobrança</p><h3 className="text-2xl font-bold text-yellow-500">{formatCurrency(totalInCollection)}</h3></div>
              <AlertTriangle className="text-yellow-500"/>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div><p className="text-sm text-slate-400">Total Recuperado</p><h3 className="text-2xl font-bold text-emerald-500">{formatCurrency(totalRecovered)}</h3></div>
              <CheckCircle className="text-emerald-500"/>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div><p className="text-sm text-slate-400">Taxa de Recuperação</p><h3 className="text-2xl font-bold text-blue-500">{recoveryRate.toFixed(1)}%</h3></div>
              <BarChart3 className="text-blue-500"/>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div><p className="text-sm text-slate-400">Tempo Médio (Dias)</p><h3 className="text-2xl font-bold text-slate-200">{avgRecoveryDays} dias</h3></div>
              <TrendingDown className="text-slate-400"/>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader><CardTitle className="text-slate-200">Volume de Títulos</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label>
                            {pieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none'}} />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CobrancaDashboardIntegrated;
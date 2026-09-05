import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import PageHeader from '@/components/PageHeader';
import GlassCard from '@/components/GlassCard';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { storage } from '@/lib/storage';
import AnimatedCounter from '@/components/AnimatedCounter';
import AnimatedProgressRing from '@/components/AnimatedProgressRing';
import { Wallet, Building2 } from 'lucide-react';

function DashboardFinanceiro() {
  const [data, setData] = useState({
    pagarTotal: 0,
    receberTotal: 0,
    projection: [],
    costCenterData: [],
    bancos: [],
    totalBancos: 0
  });

  useEffect(() => {
    const pagar = storage.get('CONTAS_PAGAR');
    const receber = storage.get('CONTAS_RECEBER');
    const centroCustos = storage.get('CENTRO_CUSTOS');
    const bancosData = storage.get('BANCOS') || [];

    // Calculate Bank Totals
    const totalBancos = bancosData.reduce((acc, b) => acc + parseFloat(b.saldo || 0), 0);

    const pagarTotal = pagar.reduce((acc, curr) => acc + parseFloat(curr.valorTotal), 0);
    const receberTotal = receber.reduce((acc, curr) => acc + parseFloat(curr.valorTotal), 0);

    const getProjection = (days) => {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() + days);
        
        const p = pagar.filter(i => new Date(i.dataEmissao) <= dateLimit && (!i.conciliado)).reduce((acc, i) => acc + parseFloat(i.valorTotal), 0);
        const r = receber.filter(i => new Date(i.dataEmissao) <= dateLimit && (!i.conciliado)).reduce((acc, i) => acc + parseFloat(i.valorTotal), 0);
        return { p, r };
    };

    const proj30 = getProjection(30);
    const proj60 = getProjection(60);
    const proj90 = getProjection(90);

    const costCenterMap = {};
    pagar.forEach(p => {
        if (p.centroCustosId) {
            const ccName = centroCustos.find(c => c.id === p.centroCustosId)?.nome || 'Outros';
            costCenterMap[ccName] = (costCenterMap[ccName] || 0) + parseFloat(p.valorTotal);
        }
    });
    const ccData = Object.keys(costCenterMap).map(key => ({ name: key, value: costCenterMap[key] }));

    setData({
      pagarTotal,
      receberTotal,
      projection: [
          { name: '30 Dias', Pagar: proj30.p, Receber: proj30.r },
          { name: '60 Dias', Pagar: proj60.p, Receber: proj60.r },
          { name: '90 Dias', Pagar: proj90.p, Receber: proj90.r },
      ],
      costCenterData: ccData,
      bancos: bancosData,
      totalBancos
    });
  }, []);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

  // Calculate health score based on ratio
  const healthScore = data.receberTotal > 0 ? Math.min(100, (data.receberTotal / (data.pagarTotal || 1)) * 100) : 0;

  return (
    <>
      <Helmet>
        <title>Dashboard Financeiro - ERP Platform</title>
      </Helmet>

      <PageHeader
        title="Dashboard Financeiro"
        description="Visão geral das finanças e fluxo de caixa"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <GlassCard gradient="from-red-500/40 to-orange-500/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-400">Total a Pagar</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-red-500"><AnimatedCounter value={data.pagarTotal} duration={1.5} isCurrency /></div></CardContent>
        </GlassCard>
        <GlassCard gradient="from-emerald-500/40 to-green-500/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-400">Total a Receber</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-emerald-500"><AnimatedCounter value={data.receberTotal} duration={1.5} isCurrency /></div></CardContent>
        </GlassCard>
        <GlassCard gradient="from-blue-500/40 to-indigo-500/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-400">Saldo em Bancos</CardTitle></CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-blue-500"><AnimatedCounter value={data.totalBancos} duration={1.5} isCurrency /></div>
                <p className="text-xs text-slate-400 mt-1">Soma de todas as contas</p>
            </CardContent>
        </GlassCard>
        <GlassCard gradient="from-blue-500/40 to-purple-500/40" className="flex flex-row items-center justify-between pr-8">
            <div>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-400">Saúde Financeira</CardTitle></CardHeader>
                <CardContent><div className="text-sm text-muted-foreground">Indicador de solvência</div></CardContent>
            </div>
            <AnimatedProgressRing progress={healthScore} size={80} strokeWidth={6} color={healthScore > 100 ? "#10b981" : "#3b82f6"} />
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN CHART - 2/3 WIDTH */}
        <div className="lg:col-span-2 space-y-6">
            <GlassCard className="min-h-[400px]">
                <CardHeader><CardTitle>Fluxo de Caixa Projetado</CardTitle></CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.projection}>
                                <defs>
                                    <linearGradient id="colorPagar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
                                    </linearGradient>
                                    <linearGradient id="colorReceber" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                                <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                                <YAxis stroke="var(--muted-foreground)" />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--popover-foreground)' }}
                                />
                                <Legend />
                                <Bar dataKey="Pagar" fill="url(#colorPagar)" radius={[4, 4, 0, 0]} animationDuration={1500} />
                                <Bar dataKey="Receber" fill="url(#colorReceber)" radius={[4, 4, 0, 0]} animationDuration={1500} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </GlassCard>
            
            <GlassCard className="min-h-[300px]">
                <CardHeader><CardTitle>Despesas por Centro de Custo</CardTitle></CardHeader>
                <CardContent>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.costCenterData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    animationDuration={1500}
                                >
                                    {data.costCenterData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--popover-foreground)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </GlassCard>
        </div>

        {/* RIGHT COLUMN - BANK DETAILS */}
        <div className="space-y-6">
            <GlassCard className="h-full">
                <CardHeader className="border-b border-slate-800/50 pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-400" /> Saldos Bancários
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    {data.bancos.length > 0 ? (
                        data.bancos.map(b => (
                            <div key={b.id} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-800/50 hover:bg-slate-900/50 transition-colors">
                                <div>
                                    <p className="font-medium text-sm text-slate-200">{b.nome}</p>
                                    <p className="text-xs text-slate-500">{b.conta || 'Conta Principal'}</p>
                                </div>
                                <span className={`font-mono font-bold ${(parseFloat(b.saldo) || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    R$ {parseFloat(b.saldo || 0).toFixed(2)}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            Nenhum banco cadastrado.
                        </div>
                    )}
                </CardContent>
            </GlassCard>
        </div>
      </div>
    </>
  );
}

export default DashboardFinanceiro;
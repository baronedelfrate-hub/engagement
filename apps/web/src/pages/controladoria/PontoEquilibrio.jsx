import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Loader2, AlertCircle, Building2 } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FiltrosGerenciais from '@/components/controladoria/FiltrosGerenciais';
import { useDadosGerenciais } from '@/hooks/useDadosGerenciais';
import { montarDRE, calcularPE, MESES } from '@/lib/dreGerencial';

const fmt = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v) => `${(v * 100).toFixed(1).replace('.', ',')}%`;

function PontoEquilibrio() {
  const dados = useDadosGerenciais();
  const { authLoading, empresaId, isSuperAdmin, ano, movs, categorias, subcategorias, loading, error } = dados;
  const [base, setBase] = useState('media');
  const [sim, setSim] = useState({ revenue: 0, variableCostPct: 0, fixedCost: 0 });

  const dre = useMemo(() => (ano ? montarDRE(movs, { ano, categorias, subcategorias }) : null), [movs, ano, categorias, subcategorias]);
  const pe = useMemo(() => (dre ? calcularPE(dre) : null), [dre]);
  const mesesComDado = pe ? pe.meses.map((m, i) => ({ ...m, i })).filter((m) => m.receita !== 0 || m.fixos !== 0 || m.variaveis !== 0) : [];

  // base da simulação: média mensal dos meses com movimento, ou um mês específico
  const baseValores = useMemo(() => {
    if (!pe || mesesComDado.length === 0) return { revenue: 0, variableCostPct: 0, fixedCost: 0 };
    const fonte = base === 'media'
      ? { receita: pe.total.receita / mesesComDado.length, variaveis: pe.total.variaveis / mesesComDado.length, fixos: pe.total.fixos / mesesComDado.length }
      : pe.meses[Number(base)];
    return { revenue: fonte.receita, variableCostPct: fonte.receita > 0 ? (fonte.variaveis / fonte.receita) * 100 : 0, fixedCost: fonte.fixos };
  }, [pe, base, mesesComDado.length]);

  useEffect(() => { setSim(baseValores); }, [baseValores]);

  const marginPct = 1 - sim.variableCostPct / 100;
  const peValue = marginPct > 0 ? sim.fixedCost / marginPct : 0;
  const profit = sim.revenue * marginPct - sim.fixedCost;
  const pePercent = sim.revenue > 0 ? (peValue / sim.revenue) * 100 : 0;
  const chartData = useMemo(() => {
    const max = Math.max(sim.revenue * 1.5, peValue * 1.5, 1);
    return Array.from({ length: 6 }, (_, i) => {
      const rev = (max / 5) * i;
      return { revenue: rev, Receita: rev, CustoTotal: sim.fixedCost + rev * (sim.variableCostPct / 100), CustoFixo: sim.fixedCost };
    });
  }, [sim, peValue]);

  if (authLoading) return <div className="flex h-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const linhasTabela = pe ? [
    ['Receita bruta', (m) => fmt(m.receita), ''],
    ['Custos variáveis (mão de obra + ferramentas + mídia + deduções)', (m) => fmt(m.variaveis), ''],
    ['Custos fixos (adm + comercial + estrutura + gerais + financeiras)', (m) => fmt(m.fixos), ''],
    ['Margem de contribuição (R$)', (m) => fmt(m.mc), 'font-semibold'],
    ['Margem de contribuição (%)', (m) => pct(m.mcPct), ''],
    ['PONTO DE EQUILÍBRIO (R$)', (m) => fmt(m.pe), 'font-bold bg-muted']
  ] : [];

  return (
    <>
      <Helmet><title>Ponto de Equilíbrio - ERP Platform</title></Helmet>
      <PageHeader title="Ponto de Equilíbrio" description="Quanto precisa faturar no mês para cobrir os custos, calculado a partir da DRE gerencial." />
      <FiltrosGerenciais dados={dados} />

      {!empresaId ? (
        <Card className="flex flex-col items-center py-16 text-center"><Building2 className="h-14 w-14 text-muted-foreground mb-4 opacity-20" /><CardTitle className="text-xl text-muted-foreground">Nenhuma empresa selecionada</CardTitle><CardDescription className="mt-2">{isSuperAdmin ? 'Selecione uma empresa no filtro acima.' : 'Seu usuário não está ligado a uma empresa.'}</CardDescription></Card>
      ) : error ? (
        <Card className="border-destructive bg-destructive/10"><CardHeader className="text-center"><AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" /><CardTitle className="text-destructive">Falha ao carregar</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>
      ) : loading || !pe ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : mesesComDado.length === 0 ? (
        <Card className="py-12 text-center"><CardTitle className="text-lg">Sem lançamentos em {ano}</CardTitle><CardDescription className="mt-2">Importe o extrato em Financeiro &gt; Importar Extrato.</CardDescription></Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader><CardTitle>Ponto de equilíbrio por mês — {ano}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right min-w-[1000px]">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-3 py-2 text-left min-w-[280px]">Conta</th>
                      {MESES.map((m) => <th key={m} className="px-3 py-2">{m}</th>)}
                      <th className="px-3 py-2 font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhasTabela.map(([rotulo, f, classe]) => (
                      <tr key={rotulo} className={`border-b border-border ${classe}`}>
                        <td className="px-3 py-2 text-left">{rotulo}</td>
                        {pe.meses.map((m, i) => <td key={i} className="px-3 py-2">{m.receita === 0 && m.fixos === 0 && m.variaveis === 0 ? '—' : f(m)}</td>)}
                        <td className="px-3 py-2 font-semibold">{f(pe.total)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="px-3 py-2 text-left">Situação (receita x PE)</td>
                      {pe.meses.map((m, i) => (
                        <td key={i} className="px-2 py-2">
                          {m.situacao ? <Badge variant="outline" className={m.situacao === 'Acima do PE' ? 'border-green-500/40 text-green-600' : 'border-red-500/40 text-red-600'}>{m.situacao === 'Acima do PE' ? 'Acima' : 'Abaixo'}</Badge> : ''}
                        </td>
                      ))}
                      <td className="px-2 py-2">{pe.total.situacao && <Badge variant="outline" className={pe.total.situacao === 'Acima do PE' ? 'border-green-500/40 text-green-600' : 'border-red-500/40 text-red-600'}>{pe.total.situacao === 'Acima do PE' ? 'Acima' : 'Abaixo'}</Badge>}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">PE = custos fixos ÷ margem de contribuição (%). A coluna Total usa os totais do período. Lançamentos ainda não classificados ficam de fora do cálculo.</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle>Simulador de cenários</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Partir de</Label>
                  <Select value={base} onValueChange={setBase}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="media">Média mensal do período</SelectItem>
                      {mesesComDado.map((m) => <SelectItem key={m.i} value={String(m.i)}>{MESES[m.i]}/{ano}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Receita projetada (R$)</Label><Input type="number" value={Math.round(sim.revenue * 100) / 100} onChange={(e) => setSim({ ...sim, revenue: parseFloat(e.target.value) || 0 })} /></div>
                <div className="space-y-2"><Label>Custos fixos (R$)</Label><Input type="number" value={Math.round(sim.fixedCost * 100) / 100} onChange={(e) => setSim({ ...sim, fixedCost: parseFloat(e.target.value) || 0 })} /></div>
                <div className="space-y-2"><Label>Custo variável sobre a receita (%)</Label><Input type="number" value={Math.round(sim.variableCostPct * 100) / 100} onChange={(e) => setSim({ ...sim, variableCostPct: parseFloat(e.target.value) || 0 })} /></div>
                <div className="pt-4 border-t text-sm space-y-1">
                  <div className="flex justify-between"><span>Margem de contribuição:</span><span className="font-bold">{(100 - sim.variableCostPct).toFixed(2)}%</span></div>
                  <div className="flex justify-between"><span>Lucro projetado:</span><span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {fmt(profit)}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Resultado do cenário</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900 text-center">
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium uppercase">Ponto de equilíbrio</span>
                  <div className="text-3xl font-bold text-blue-800 dark:text-blue-400 mt-2">R$ {fmt(peValue)}</div>
                  <span className="text-xs text-blue-500">Faturamento mensal necessário para zerar</span>
                </div>
                <div className="bg-muted p-4 rounded-lg border border-border text-center">
                  <span className="text-sm text-muted-foreground font-medium uppercase">PE como % da receita</span>
                  <div className={`text-3xl font-bold mt-2 ${pePercent > 100 ? 'text-red-600' : 'text-green-600'}`}>{pePercent.toFixed(1)}%</div>
                  <span className="text-xs text-muted-foreground">Abaixo de 100% = receita cobre os custos</span>
                </div>
              </CardContent>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="revenue" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v) => `R$ ${fmt(v)}`} labelFormatter={(v) => `Receita: R$ ${fmt(v)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="Receita" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="CustoTotal" name="Custo total" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="CustoFixo" name="Custo fixo" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                    <ReferenceLine x={peValue} stroke="orange" label="PE" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

export default PontoEquilibrio;

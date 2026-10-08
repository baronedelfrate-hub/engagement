import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FiltrosGerenciais from '@/components/controladoria/FiltrosGerenciais';
import { useDadosGerenciais } from '@/hooks/useDadosGerenciais';
import { agregarDashboard, MESES } from '@/lib/dreGerencial';

const fmt = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DIAS_NO_MES = (ano, m) => new Date(ano, m, 0).getDate();

function DashboardGerencial() {
  const dados = useDadosGerenciais();
  const { authLoading, empresaId, isSuperAdmin, ano, movs, categorias, subcategorias, loading, error } = dados;
  const [mes, setMes] = useState('todos');

  const periodo = useMemo(() => {
    if (!ano) return {};
    if (mes === 'todos') return { de: `${ano}-01-01`, ate: `${ano}-12-31` };
    const m = Number(mes);
    return { de: `${ano}-${String(m).padStart(2, '0')}-01`, ate: `${ano}-${String(m).padStart(2, '0')}-${DIAS_NO_MES(ano, m)}` };
  }, [ano, mes]);

  const d = useMemo(() => agregarDashboard(movs, { categorias, subcategorias, ...periodo }), [movs, categorias, subcategorias, periodo]);
  const pendente = d.despesasPorCategoria.find((c) => c.nome === 'A CLASSIFICAR')?.total || 0;
  const topClientes = d.receitaPorCliente.slice(0, 12);

  if (authLoading) return <div className="flex h-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <>
      <Helmet><title>Dashboard Gerencial - ERP Platform</title></Helmet>
      <PageHeader title="Dashboard Gerencial" description="Para onde foi o dinheiro e de quem ele veio, no regime de caixa (extrato classificado)." />
      <FiltrosGerenciais dados={dados}>
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-40 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Ano todo</SelectItem>
            {MESES.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </FiltrosGerenciais>

      {!empresaId ? (
        <Card className="flex flex-col items-center py-16 text-center"><Building2 className="h-14 w-14 text-muted-foreground mb-4 opacity-20" /><CardTitle className="text-xl text-muted-foreground">Nenhuma empresa selecionada</CardTitle><CardDescription className="mt-2">{isSuperAdmin ? 'Selecione uma empresa no filtro acima.' : 'Seu usuário não está ligado a uma empresa.'}</CardDescription></Card>
      ) : error ? (
        <Card className="border-destructive bg-destructive/10"><CardHeader className="text-center"><AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" /><CardTitle className="text-destructive">Falha ao carregar</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>
      ) : loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : movs.length === 0 ? (
        <Card className="py-12 text-center"><CardTitle className="text-lg">Sem lançamentos em {ano}</CardTitle><CardDescription className="mt-2">Importe o extrato em Financeiro &gt; Importar Extrato.</CardDescription></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-blue-600">Receita recebida</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {fmt(d.receita)}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-red-600">Despesas pagas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {fmt(d.despesa)}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-green-600">Resultado do caixa</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${d.receita - d.despesa < 0 ? 'text-red-600' : ''}`}>R$ {fmt(d.receita - d.despesa)}</div></CardContent></Card>
            <Card className={pendente > 0 ? 'border-amber-500/50' : ''}>
              <CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-amber-600">A classificar</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {fmt(pendente)}</div>
                {pendente > 0 && <Link to="/financeiro/classificar-extrato" className="text-xs text-blue-600 underline">Classificar agora</Link>}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Despesas por categoria</CardTitle><CardDescription>Total pago no período, incluindo impostos sobre a receita e movimentações de sócios.</CardDescription></CardHeader>
              <CardContent>
                {d.despesasPorCategoria.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma despesa no período.</p> : (
                  <>
                    <div style={{ height: Math.max(220, d.despesasPorCategoria.length * 34) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={d.despesasPorCategoria} layout="vertical" margin={{ left: 10, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                          <YAxis type="category" dataKey="nome" width={190} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => `R$ ${fmt(v)}`} />
                          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                            {d.despesasPorCategoria.map((c) => <Cell key={c.nome} fill={c.nome === 'A CLASSIFICAR' ? '#f59e0b' : '#ef4444'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <table className="w-full text-sm mt-4">
                      <tbody>
                        {d.despesasPorCategoria.map((c) => (
                          <tr key={c.nome} className="border-b border-border"><td className="py-1.5">{c.nome}</td><td className="py-1.5 text-right">R$ {fmt(c.total)}</td><td className="py-1.5 text-right text-muted-foreground w-16">{d.despesa > 0 ? ((c.total / d.despesa) * 100).toFixed(1) : '0,0'}%</td></tr>
                        ))}
                        <tr className="font-bold"><td className="py-2">TOTAL</td><td className="py-2 text-right">R$ {fmt(d.despesa)}</td><td /></tr>
                      </tbody>
                    </table>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Receita recebida por cliente</CardTitle><CardDescription>Cobranças recebidas no período, por cliente.</CardDescription></CardHeader>
              <CardContent>
                {d.receitaPorCliente.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma receita no período.</p> : (
                  <>
                    <div style={{ height: Math.max(220, topClientes.length * 34) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topClientes} layout="vertical" margin={{ left: 10, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                          <YAxis type="category" dataKey="nome" width={190} tick={{ fontSize: 11 }} tickFormatter={(n) => (n.length > 28 ? `${n.slice(0, 27)}…` : n)} />
                          <Tooltip formatter={(v) => `R$ ${fmt(v)}`} />
                          <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto mt-4">
                      <table className="w-full text-sm">
                        <tbody>
                          {d.receitaPorCliente.map((c) => (
                            <tr key={c.nome} className="border-b border-border"><td className="py-1.5 pr-2">{c.nome}</td><td className="py-1.5 text-right whitespace-nowrap">R$ {fmt(c.total)}</td><td className="py-1.5 text-right text-muted-foreground w-16">{((c.total / d.receitaPorCliente.reduce((s, x) => s + x.total, 0)) * 100).toFixed(1)}%</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

export default DashboardGerencial;

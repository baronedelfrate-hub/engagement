import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle, Percent, CalendarCheck, Clock, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/cobrancaService';
import { carregarCobranca, resumoDashboard } from '@/lib/cobrancaMovService';

const CORES_FASE = { 'd-3': '#3b82f6', 'd+1': '#06b6d4', 'd+5': '#eab308', 'd+10': '#f97316', 'd+15': '#ef4444', 'd+30': '#881337' };

const Indicador = ({ titulo, valor, detalhe, icone: Icone, cor }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{titulo}</p>
          <h3 className={`text-2xl font-bold ${cor}`}>{valor}</h3>
          {detalhe && <p className="text-xs text-muted-foreground mt-1">{detalhe}</p>}
        </div>
        <Icone className={cor} />
      </div>
    </CardContent>
  </Card>
);

const CobrancaDashboardMov = () => {
  const navigate = useNavigate();
  const { company_id, loading: authLoading } = useAuthContext();
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!company_id) { setLoading(false); return; }
    setLoading(true);
    carregarCobranca(company_id).then(setItens).catch((e) => setErro(e.message)).finally(() => setLoading(false));
  }, [authLoading, company_id]);

  const r = useMemo(() => resumoDashboard(itens), [itens]);

  return (
    <>
      <Helmet><title>Dashboard de Cobrança | Financeiro</title></Helmet>
      <PageHeader
        title="Dashboard de Cobrança"
        description="Inadimplência, aging por fase da régua, promessas de pagamento e maiores devedores."
        action={<Button variant="outline" size="sm" onClick={() => navigate('/financeiro/cobranca')}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Kanban</Button>}
      />

      {!company_id ? (
        <p className="text-sm text-muted-foreground">Entre com o usuário de uma empresa para ver o dashboard dela.</p>
      ) : erro ? (
        <p className="text-sm text-destructive">{erro}</p>
      ) : loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Indicador titulo="Vencido em aberto" valor={formatCurrency(r.totalVencido)} detalhe={`${r.qtdVencido} título(s)`} icone={AlertTriangle} cor="text-red-500" />
            <Indicador titulo="Inadimplência" valor={`${r.inadimplencia.toFixed(1).replace('.', ',')}%`} detalhe={`${formatCurrency(r.totalAberto)} em aberto no total`} icone={Percent} cor="text-orange-500" />
            <Indicador titulo="A vencer em 7 dias" valor={formatCurrency(r.aVencer7.valor)} detalhe={`${r.aVencer7.qtd} título(s)`} icone={Clock} cor="text-blue-500" />
            <Indicador titulo="Recuperado (60 dias)" valor={formatCurrency(r.recuperado.valor)} detalhe={`${r.recuperado.qtd} título(s)${r.diasMediosParaReceber ? ` · recebidos em média ${r.diasMediosParaReceber} dias após o vencimento` : ''}`} icone={CheckCircle} cor="text-emerald-500" />
            <Indicador titulo="Promessas de pagamento" valor={formatCurrency(r.promessasAtivas.valor)} detalhe={`${r.promessasAtivas.qtd} no prazo`} icone={CalendarCheck} cor="text-blue-500" />
            <Indicador titulo="Promessas vencidas" valor={formatCurrency(r.promessasVencidas.valor)} detalhe={`${r.promessasVencidas.qtd} sem pagamento`} icone={TrendingDown} cor="text-red-500" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Aging por fase da régua</CardTitle><CardDescription>Valor em aberto em cada fase, pelo vencimento.</CardDescription></CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={r.fases}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="rotulo" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v, n, p) => [`${formatCurrency(v)} (${p.payload.qtd} título(s))`, 'Em aberto']} />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      {r.fases.map((f) => <Cell key={f.fase} fill={CORES_FASE[f.fase]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Maiores devedores</CardTitle><CardDescription>Clientes com mais valor vencido.</CardDescription></CardHeader>
              <CardContent>
                {r.devedores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum cliente com título vencido.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr><th className="text-left py-2">Cliente</th><th className="text-right">Títulos</th><th className="text-right">Maior atraso</th><th className="text-right">Vencido</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {r.devedores.map((d) => (
                        <tr key={d.nome}>
                          <td className="py-2 pr-2">{d.nome}</td>
                          <td className="text-right">{d.titulos}</td>
                          <td className="text-right">{d.maiorAtraso}d</td>
                          <td className="text-right font-medium text-red-600">{formatCurrency(d.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
};

export default CobrancaDashboardMov;

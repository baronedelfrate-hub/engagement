import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, Target, TrendingUp, Trophy, Percent, Receipt } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { hojeISO, moeda, variacaoPct, montarPainelCrm, listarOportunidades, listarAtividades, listarPropostas, STATUS_PROPOSTA } from '@/lib/crmService';

const Indicador = ({ titulo, valor, detalhe, icone: Icone, cor }) => (
  <Card><CardContent className="p-5 flex justify-between"><div><p className="text-sm text-muted-foreground">{titulo}</p><h3 className={`text-2xl font-bold ${cor}`}>{valor}</h3>{detalhe && <p className="text-xs text-muted-foreground mt-1">{detalhe}</p>}</div><Icone className={`h-6 w-6 ${cor}`} /></CardContent></Card>
);
const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

const CRMDashboard = () => {
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const hoje = hojeISO();

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [oportunidades, atividades, propostas] = await Promise.all([listarOportunidades(companyId), listarAtividades(companyId), listarPropostas(companyId)]);
      setDados({ oportunidades, atividades, propostas });
    } catch (e) { toast({ title: 'Erro ao carregar o painel', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const p = useMemo(() => (dados ? montarPainelCrm(dados, hoje) : null), [dados, hoje]);

  if (authLoading || (loading && !p)) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver o CRM dela.</p>;
  if (!p) return null;

  return (
    <>
      <Helmet><title>Painel | CRM</title></Helmet>
      <PageHeader title="Painel comercial" description="Funil, previsão de vendas, atividades e propostas em andamento." action={<Button variant="outline" size="sm" onClick={carregar} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar</Button>} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <Indicador titulo="No funil" valor={moeda(p.valorAberto)} detalhe={`${p.abertas} oportunidade(s) em aberto`} icone={Target} cor="text-foreground" />
        <Indicador titulo="Previsão ponderada" valor={moeda(p.ponderado)} detalhe="valor × probabilidade da etapa" icone={TrendingUp} cor="text-blue-600" />
        <Indicador titulo="Vendas do mês" valor={moeda(p.vendas.mes.valor)} detalhe={`${p.vendas.mes.ganhas} venda(s)${variacaoPct(p.vendas.mes.valor, p.vendas.anterior.valor) === null ? '' : ` · ${variacaoPct(p.vendas.mes.valor, p.vendas.anterior.valor) >= 0 ? '▲' : '▼'} ${Math.abs(variacaoPct(p.vendas.mes.valor, p.vendas.anterior.valor))}% vs mês anterior`}`} icone={Trophy} cor="text-emerald-600" />
        <Indicador titulo="Ticket médio" valor={p.vendas.mes.ticket === null ? '—' : moeda(p.vendas.mes.ticket)} detalhe={p.vendas.ano.ticket === null ? 'valor ÷ nº de vendas' : `no ano: ${moeda(p.vendas.ano.ticket)} (${p.vendas.ano.ganhas} vendas)`} icone={Receipt} cor="text-blue-600" />
        <Indicador titulo="Taxa de conversão" valor={p.vendas.mes.conversao === null ? '—' : `${p.vendas.mes.conversao}%`} detalhe={p.vendas.ano.conversao === null ? 'ganhas ÷ (ganhas + perdidas)' : `no ano: ${p.vendas.ano.conversao}% (${p.vendas.ano.ganhas} de ${p.vendas.ano.ganhas + p.vendas.ano.perdidas})`} icone={Percent} cor="text-orange-600" />      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="text-base">Funil por etapa</CardTitle><CardDescription>Valor das oportunidades em aberto em cada etapa.</CardDescription></CardHeader>
          <CardContent className="h-[280px]">
            {p.abertas === 0 ? <p className="text-sm text-muted-foreground py-10 text-center">Nenhuma oportunidade em aberto. Crie a primeira no Funil.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={p.porEtapa} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="etapa" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip formatter={(v, n, x) => [`${moeda(v)} (${x.payload.qtd} oportunidade(s))`, 'No funil']} />
                  <Bar dataKey="valor" fill="#FE6102" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Propostas enviadas</CardTitle><CardDescription>Aguardando resposta do cliente.</CardDescription></CardHeader>
          <CardContent>
            {p.propostasAbertas.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma proposta aguardando resposta.</p> : (
              <div className="divide-y divide-border">
                {p.propostasAbertas.slice(0, 8).map((x) => (
                  <div key={x.id} className="py-2 cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/crm/propostas/${x.id}`)}>
                    <div className="flex justify-between text-sm"><span className="font-medium">{x.numero}</span><span>{moeda(x.valor_total)}</span></div>
                    <div className="text-xs text-muted-foreground truncate">{x.conta?.nome} · enviada {x.enviada_em ? fmt(x.enviada_em.slice(0, 10)) : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base text-red-600">Atividades atrasadas e de hoje</CardTitle><CardDescription>{p.atrasadas.length} atrasada(s) · {p.atividadesHoje.length} para hoje.</CardDescription></CardHeader>
          <CardContent>
            {p.atrasadas.length + p.atividadesHoje.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma atividade pendente para hoje. 🎯</p> : (
              <div className="divide-y divide-border">
                {[...p.atrasadas, ...p.atividadesHoje].slice(0, 10).map((a) => (
                  <div key={a.id} className="py-2 flex items-center justify-between gap-2 text-sm cursor-pointer hover:bg-muted/30" onClick={() => navigate('/crm/atividades')}>
                    <div className="min-w-0"><div className="font-medium truncate">{a.titulo}</div><div className="text-xs text-muted-foreground truncate">{[a.conta?.nome, a.oportunidade?.titulo].filter(Boolean).join(' · ')}</div></div>
                    <Badge variant={a.data_prevista < hoje ? 'destructive' : 'warning'}>{a.data_prevista < hoje ? fmt(a.data_prevista) : 'hoje'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Oportunidades paradas</CardTitle><CardDescription>Sem movimentação há 14 dias ou mais.</CardDescription></CardHeader>
          <CardContent>
            {p.paradas.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma oportunidade parada.</p> : (
              <div className="divide-y divide-border">
                {p.paradas.slice(0, 10).map((o) => (
                  <div key={o.id} className="py-2 flex items-center justify-between gap-2 text-sm cursor-pointer hover:bg-muted/30" onClick={() => navigate('/crm/funil')}>
                    <div className="min-w-0"><div className="font-medium truncate">{o.titulo}</div><div className="text-xs text-muted-foreground truncate">{o.conta?.nome} · {moeda(o.valor)}</div></div>
                    <Badge variant="outline">{o.dias} dias</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default CRMDashboard;

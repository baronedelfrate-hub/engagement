import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, Users, CheckCircle2, AlertTriangle, AlertOctagon, CalendarClock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { formatarData, hojeISO, diaDaSemana } from '@/lib/engService';
import { montarPainel, SITUACOES } from '@/lib/engDashboard';
import { SERVICOS } from './ClientesEngagement';

const buscar = async (consulta) => {
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return data || [];
};

const CORES_SIT = { em_dia: 'success', atencao: 'warning', atrasado: 'destructive', sem_dados: 'outline' };

const Indicador = ({ titulo, valor, detalhe, icone: Icone, cor }) => (
  <Card>
    <CardContent className="p-5 flex justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{titulo}</p>
        <h3 className={`text-3xl font-bold ${cor}`}>{valor}</h3>
        {detalhe && <p className="text-xs text-muted-foreground mt-1">{detalhe}</p>}
      </div>
      <Icone className={`h-6 w-6 ${cor}`} />
    </CardContent>
  </Card>
);

// Painel do serviço (BPO E5 ou Consultoria F5): clientes por fase e situação (em dia, atenção, atrasado).
const DashboardEngagement = ({ servico = 'bpo' }) => {
  const cfg = SERVICOS[servico] || SERVICOS.bpo;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const hoje = hojeISO();

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [clientes, tarefas, agenda, entregaveis, implantacao] = await Promise.all([
        buscar(supabase.from('clientes_bpo').select('id, nome, servicos, status_contrato, plano')),
        buscar(supabase.from('eng_tarefas').select('id, cliente_id, origem, fase, dia_plano, atividade, status, data_prevista').in('origem', ['b1', 'f5'])),
        buscar(supabase.from('eng_agenda').select('id, cliente_id, data, hora_inicio, titulo, status, tipo')),
        buscar(supabase.from('eng_entregaveis').select('id, cliente_id, status')),
        buscar(supabase.from('bpo_implantacao_itens').select('id, cliente_id, status'))
      ]);
      setDados({ clientes, tarefas, agenda, entregaveis, implantacao });
    } catch (e) {
      toast({ title: 'Erro ao carregar o painel', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const painel = useMemo(() => (dados ? montarPainel(servico, dados, hoje) : null), [dados, servico, hoje]);

  if (loading && !painel) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!painel) return null;

  const n = (k) => painel.porSituacao[k] || 0;
  const dadosSit = Object.entries(SITUACOES).map(([k, v]) => ({ nome: v.rotulo, valor: n(k), cor: v.cor })).filter((x) => x.valor > 0);
  const proximaSemana = painel.proximosCompromissos.filter((a) => a.data <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)).length;

  return (
    <>
      <Helmet><title>Painel {cfg.rotulo}</title></Helmet>
      <PageHeader
        title={`Painel — ${cfg.rotulo}`}
        description="Em que fase está cada cliente e o que está em dia, pedindo atenção ou atrasado."
        action={<Button variant="outline" size="sm" onClick={carregar} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Indicador titulo="Clientes ativos" valor={painel.total} detalhe={servico === 'bpo' ? 'em onboarding ou em operação' : 'com projeto em andamento'} icone={Users} cor="text-foreground" />
        <Indicador titulo="Em dia" valor={n('em_dia')} detalhe="sem nada vencido" icone={CheckCircle2} cor="text-emerald-600" />
        <Indicador titulo="Atenção" valor={n('atencao')} detalhe="vence nos próximos 3 dias" icone={AlertTriangle} cor="text-amber-600" />
        <Indicador titulo="Atrasados" valor={n('atrasado')} detalhe={`${painel.atrasos.length} pendência(s) vencida(s)`} icone={AlertOctagon} cor="text-red-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="text-base">Clientes por fase</CardTitle><CardDescription>{servico === 'bpo' ? 'Etapa do onboarding B1 em que cada cliente está.' : 'Fase do projeto em que cada cliente está (primeira com atividade pendente).'}</CardDescription></CardHeader>
          <CardContent className="h-[300px]">
            {painel.total === 0 ? <p className="text-sm text-muted-foreground py-10 text-center">Nenhum cliente ainda.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={painel.porFase} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="fase" width={230} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v} cliente(s)`, '']} />
                  <Bar dataKey="qtd" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Situação dos clientes</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {dadosSit.length === 0 ? <p className="text-sm text-muted-foreground py-10 text-center">Sem dados.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dadosSit} dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={90} label={({ nome, valor }) => `${nome}: ${valor}`}>
                    {dadosSit.map((d) => <Cell key={d.nome} fill={d.cor} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Clientes</CardTitle><CardDescription>Clique em um cliente para abrir a ficha.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          {painel.linhas.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Nenhum cliente de {cfg.rotulo} ativo.</p> : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-2">Cliente</th><th className="text-left p-2">Fase atual</th><th className="text-left p-2 w-44">Andamento</th>
                  {servico === 'bpo' ? <th className="text-left p-2">Implantação</th> : <th className="text-left p-2">Entregas</th>}
                  <th className="text-left p-2">Próximo compromisso</th><th className="text-left p-2">Atrasos</th><th className="text-left p-2">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {painel.linhas.map((l) => (
                  <tr key={l.cliente.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(cfg.rotaFicha(l.cliente.id))}>
                    <td className="p-2 font-medium">{l.cliente.nome}</td>
                    <td className="p-2 text-xs max-w-[220px]">{l.fase}</td>
                    <td className="p-2">{l.progresso.total ? <div className="flex items-center gap-2"><Progress value={l.progresso.pct} className="h-2" /><span className="text-xs text-muted-foreground w-14">{l.progresso.feitas}/{l.progresso.total}</span></div> : <span className="text-xs text-muted-foreground">—</span>}</td>
                    <td className="p-2 text-xs">
                      {servico === 'bpo'
                        ? (l.implantacao.total ? `${l.implantacao.ok}/${l.implantacao.total} itens OK` : '—')
                        : (l.entregas.total ? `${l.entregas.feitas}/${l.entregas.total} concluídas` : '—')}
                    </td>
                    <td className="p-2 text-xs whitespace-nowrap">
                      {l.proxima ? <>{formatarData(l.proxima.data)} <span className="text-muted-foreground">{diaDaSemana(l.proxima.data)}</span></> : (l.proxPrazo ? <span className="text-muted-foreground">prazo {formatarData(l.proxPrazo.data_prevista)}</span> : '—')}
                    </td>
                    <td className="p-2">{l.atrasadas.length + l.visitasSemAtualizar.length > 0 ? <Badge variant="destructive">{l.atrasadas.length + l.visitasSemAtualizar.length}</Badge> : <span className="text-xs text-muted-foreground">0</span>}</td>
                    <td className="p-2"><Badge variant={CORES_SIT[l.situacao]}>{SITUACOES[l.situacao].rotulo}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base text-red-600">Em atraso</CardTitle><CardDescription>Atividades com prazo vencido{servico === 'consultoria' ? ' e visitas que passaram sem ser marcadas como realizadas' : ''}.</CardDescription></CardHeader>
          <CardContent>
            {painel.atrasos.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Nada em atraso.</p> : (
              <div className="divide-y divide-border">
                {painel.atrasos.slice(0, 15).map((a, i) => (
                  <div key={i} className="py-2 cursor-pointer hover:bg-muted/30" onClick={() => navigate(cfg.rotaFicha(a.cliente.id))}>
                    <div className="flex justify-between gap-2 text-sm"><span className="font-medium">{a.cliente.nome}</span><Badge variant="destructive">{a.dias}d de atraso</Badge></div>
                    <div className="text-xs text-muted-foreground truncate">{a.titulo}</div>
                    <div className="text-xs text-muted-foreground">previsto para {formatarData(a.prazo)}{a.tipo === 'Visita sem atualização' ? ' · atualize a agenda' : ''}</div>
                  </div>
                ))}
                {painel.atrasos.length > 15 && <p className="text-xs text-muted-foreground pt-2">e mais {painel.atrasos.length - 15}…</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Próximos compromissos</CardTitle><CardDescription>Agenda dos próximos 14 dias{proximaSemana ? ` · ${proximaSemana} nesta semana` : ''}.</CardDescription></CardHeader>
          <CardContent>
            {painel.proximosCompromissos.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Nenhum compromisso agendado.</p> : (
              <div className="divide-y divide-border">
                {painel.proximosCompromissos.slice(0, 15).map((a) => (
                  <div key={a.id} className="py-2 flex gap-3 cursor-pointer hover:bg-muted/30" onClick={() => navigate(cfg.rotaFicha(a.cliente.id))}>
                    <div className="w-24 shrink-0 text-sm"><div className="font-medium">{formatarData(a.data)}</div><div className="text-xs text-muted-foreground">{diaDaSemana(a.data)}{a.hora_inicio ? ` · ${a.hora_inicio.slice(0, 5)}` : ''}</div></div>
                    <div className="min-w-0"><div className="text-sm font-medium">{a.cliente.nome}</div><div className="text-xs text-muted-foreground truncate">{a.titulo}</div></div>
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

export default DashboardEngagement;

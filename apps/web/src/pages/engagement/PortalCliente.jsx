import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Loader2, LogOut, FileDown, CalendarDays, CheckCircle2, CircleDashed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { STATUS_VISITA, STATUS_ENTREGA, formatarData, hojeISO, diaDaSemana } from '@/lib/engService';

const buscar = async (consulta) => {
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return data || [];
};

const COR_ENTREGA = { pendente: 'outline', em_andamento: 'warning', concluido: 'success', na: 'secondary' };

// Tela do cliente da Engagement: acompanha as fases, as entregas, a agenda e as OS publicadas. Somente leitura.
const PortalCliente = () => {
  const { clienteBpoId, loading: authLoading, logout } = useAuthContext();
  const { toast } = useToast();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [gerando, setGerando] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!clienteBpoId) { setDados({ cliente: null }); return; }
    (async () => {
      try {
        const [cliente, projetos, tarefas, entregas, agenda, ordens] = await Promise.all([
          buscar(supabase.from('clientes_bpo').select('id, nome').eq('id', clienteBpoId)),
          buscar(supabase.from('eng_projetos').select('*').eq('cliente_id', clienteBpoId).order('created_at')),
          buscar(supabase.from('eng_tarefas').select('id, projeto_id, fase, dia_plano, atividade, status, data_prevista, data_realizada').eq('cliente_id', clienteBpoId).order('dia_plano', { nullsFirst: false })),
          buscar(supabase.from('eng_entregaveis').select('*').eq('cliente_id', clienteBpoId).order('ordem')),
          buscar(supabase.from('eng_agenda').select('*').eq('cliente_id', clienteBpoId).order('data')),
          buscar(supabase.from('eng_os').select('*').eq('cliente_id', clienteBpoId).order('numero', { ascending: false }))
        ]);
        setDados({ cliente: cliente[0] || null, projetos, tarefas, entregas, agenda, ordens });
      } catch (e) {
        setErro(e.message);
      }
    })();
  }, [authLoading, clienteBpoId]);

  const fases = useMemo(() => {
    if (!dados?.tarefas) return [];
    const mapa = new Map();
    dados.tarefas.filter((t) => t.status !== 'na').forEach((t) => {
      const f = mapa.get(t.fase || 'Atividades') || { nome: t.fase || 'Atividades', total: 0, feitas: 0, ordem: t.dia_plano ?? 999 };
      f.total += 1;
      if (t.status === 'concluido') f.feitas += 1;
      f.ordem = Math.min(f.ordem, t.dia_plano ?? 999);
      mapa.set(f.nome, f);
    });
    return [...mapa.values()].sort((a, b) => a.ordem - b.ordem);
  }, [dados]);

  const baixarOS = async (os) => {
    setGerando(os.id);
    try {
      const { gerarOsPdf } = await import('@/lib/engOsPdf');
      const projeto = dados.projetos.find((p) => p.id === os.projeto_id);
      await gerarOsPdf({ cliente: dados.cliente, projeto, os, consultorNome: 'Consultor' });
    } catch (e) {
      toast({ title: 'Não foi possível gerar o PDF', description: e.message, variant: 'destructive' });
    } finally {
      setGerando(null);
    }
  };

  const cabecalho = (
    <header className="bg-[#1e3a8a] text-white">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs tracking-widest opacity-80">ENGAGEMENT SOLUÇÕES</div>
          <div className="text-lg font-semibold">Acompanhamento do projeto</div>
        </div>
        <Button variant="secondary" size="sm" onClick={logout}><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
      </div>
    </header>
  );

  if (authLoading || (!dados && !erro)) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (erro || !dados?.cliente) {
    return (
      <div className="min-h-screen bg-background">
        {cabecalho}
        <p className="max-w-xl mx-auto mt-16 text-center text-sm text-muted-foreground px-4">
          {erro ? `Não foi possível carregar o projeto: ${erro}` : 'Não há projeto liberado para este acesso. Fale com a Engagement.'}
        </p>
      </div>
    );
  }

  const hoje = hojeISO();
  const tarefasAplic = dados.tarefas.filter((t) => t.status !== 'na');
  const feitas = tarefasAplic.filter((t) => t.status === 'concluido').length;
  const progresso = tarefasAplic.length ? Math.round((feitas / tarefasAplic.length) * 100) : 0;
  const entAplic = dados.entregas.filter((e) => e.status !== 'na');
  const entFeitas = entAplic.filter((e) => e.status === 'concluido').length;
  const proximas = dados.agenda.filter((a) => a.data >= hoje && !['cancelada'].includes(a.status));
  const passadas = dados.agenda.filter((a) => a.data < hoje || a.status === 'realizada').filter((a) => !proximas.includes(a)).reverse();

  return (
    <div className="min-h-screen bg-muted/30">
      <Helmet><title>{dados.cliente.nome} | Acompanhamento</title></Helmet>
      {cabecalho}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{dados.cliente.nome}</h1>
          <p className="text-sm text-muted-foreground">{dados.projetos.map((p) => p.nome).join(' · ')}</p>
        </div>

        <Card>
          <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Andamento geral</div>
              <div className="text-3xl font-bold">{progresso}%</div>
              <Progress value={progresso} className="h-2 mt-2" />
              <div className="text-xs text-muted-foreground mt-1">{feitas} de {tarefasAplic.length} atividades concluídas</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Entregas</div>
              <div className="text-3xl font-bold">{entFeitas}<span className="text-lg text-muted-foreground">/{entAplic.length}</span></div>
              <Progress value={entAplic.length ? (entFeitas / entAplic.length) * 100 : 0} className="h-2 mt-2" />
              <div className="text-xs text-muted-foreground mt-1">concluídas</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Próxima visita</div>
              {proximas[0] ? (
                <>
                  <div className="text-xl font-bold">{formatarData(proximas[0].data)}</div>
                  <div className="text-sm text-muted-foreground">{diaDaSemana(proximas[0].data)}{proximas[0].hora_inicio ? ` · ${proximas[0].hora_inicio.slice(0, 5)}` : ''}</div>
                  <div className="text-xs text-muted-foreground mt-1">{proximas[0].titulo}</div>
                </>
              ) : <div className="text-sm text-muted-foreground mt-2">Nenhuma visita agendada.</div>}
            </div>
          </CardContent>
        </Card>

        {fases.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Fases do projeto</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {fases.map((f) => {
                const pct = Math.round((f.feitas / f.total) * 100);
                return (
                  <div key={f.nome}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{f.nome}</span>
                      <span className="text-muted-foreground">{f.feitas}/{f.total} · {pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {dados.entregas.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Entregas</CardTitle><CardDescription>O que está sendo construído para você.</CardDescription></CardHeader>
            <CardContent className="divide-y divide-border">
              {dados.entregas.map((e) => (
                <div key={e.id} className="py-2.5 flex items-start gap-3">
                  {e.status === 'concluido' ? <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" /> : <CircleDashed className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{e.titulo}</div>
                    <div className="text-xs text-muted-foreground">{[e.frente, e.fase].filter(Boolean).join(' · ')}</div>
                    {e.observacao && <div className="text-xs text-muted-foreground mt-0.5">{e.observacao}</div>}
                  </div>
                  <Badge variant={COR_ENTREGA[e.status]}>{STATUS_ENTREGA[e.status]}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Agenda</CardTitle></CardHeader>
          <CardContent>
            {dados.agenda.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum compromisso por enquanto.</p> : (
              <div className="space-y-4">
                {proximas.length > 0 && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1">Próximos</div>
                    <div className="divide-y divide-border">
                      {proximas.map((a) => (
                        <div key={a.id} className="py-2 flex items-center gap-3 text-sm">
                          <div className="w-28 shrink-0"><div className="font-medium">{formatarData(a.data)}</div><div className="text-xs text-muted-foreground">{diaDaSemana(a.data)}{a.hora_inicio ? ` · ${a.hora_inicio.slice(0, 5)}` : ''}</div></div>
                          <div className="flex-1">{a.titulo}</div>
                          <Badge variant="outline">{STATUS_VISITA[a.status]}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {passadas.length > 0 && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1">Anteriores</div>
                    <div className="divide-y divide-border opacity-80">
                      {passadas.map((a) => (
                        <div key={a.id} className="py-2 flex items-center gap-3 text-sm">
                          <div className="w-28 shrink-0 font-medium">{formatarData(a.data)}</div>
                          <div className="flex-1">{a.titulo}</div>
                          <Badge variant={a.status === 'realizada' ? 'success' : 'outline'}>{STATUS_VISITA[a.status]}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {dados.ordens.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Ordens de serviço das visitas</CardTitle><CardDescription>O registro de cada visita: o que foi feito, entregas, pendências e próximos passos.</CardDescription></CardHeader>
            <CardContent className="divide-y divide-border">
              {dados.ordens.map((o) => (
                <div key={o.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">OS Nº {o.numero} · {formatarData(o.data)}{o.fase ? ` · ${o.fase}` : ''}</div>
                    <Button variant="outline" size="sm" onClick={() => baixarOS(o)} disabled={gerando === o.id}>{gerando === o.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}PDF</Button>
                  </div>
                  {o.objetivo && <div className="text-sm text-muted-foreground mt-1">{o.objetivo}</div>}
                  {o.entregas && <div className="text-xs mt-1"><span className="font-medium">Entregas e avanços:</span> {o.entregas}</div>}
                  {o.proximos_passos && <div className="text-xs mt-1"><span className="font-medium">Próximos passos:</span> {o.proximos_passos}</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PortalCliente;

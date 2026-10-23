import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, CalendarPlus, Trash2, CheckSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import { titulosAbertos, movimentoDoMes, resumoVencimentos, hojeISO, somaDias, resumoExecutivo, listarEventos, criarEvento, atualizarEvento, excluirEvento, linkGoogleEvento, TIPOS_EVENTO } from '@/lib/dashboardData';
import { listarOportunidades, listarPropostas, ETAPAS, moeda } from '@/lib/crmService';
import { listarContratos, valorMensal } from '@/lib/crmContratos';
import { tarefasAbertas, listarUsuarios, PRIORIDADES, linkGoogleAgenda } from '@/lib/tarefasService';

// Cada bloco busca os próprios dados. Uma busca igual feita por dois blocos na mesma tela é reaproveitada por 30 segundos.
const cache = new Map();
const comCache = (chave, fn) => {
  const agora = Date.now();
  const e = cache.get(chave);
  if (e && agora - e.t < 30000) return e.p;
  const p = fn();
  cache.set(chave, { t: agora, p });
  p.catch(() => cache.delete(chave));
  return p;
};

const useCarga = (chave, fn) => {
  const { company_id: companyId } = useAuthContext();
  const [estado, setEstado] = useState({ carregando: true, dados: null, erro: null });
  useEffect(() => {
    let vivo = true;
    if (!companyId) return undefined;
    comCache(`${chave}|${companyId}`, () => fn(companyId))
      .then((dados) => vivo && setEstado({ carregando: false, dados, erro: null }))
      .catch((e) => vivo && setEstado({ carregando: false, dados: null, erro: e.message }));
    return () => { vivo = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, chave]);
  return estado;
};

const Moldura = ({ titulo, descricao, children, estado, vazio }) => (
  <Card className="h-full">
    <CardHeader className="pb-2"><CardTitle className="text-base">{titulo}</CardTitle>{descricao && <CardDescription>{descricao}</CardDescription>}</CardHeader>
    <CardContent>
      {estado.carregando ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        : estado.erro ? <p className="text-xs text-muted-foreground py-4">Não foi possível carregar este bloco.</p>
        : vazio ? <p className="text-sm text-muted-foreground py-4 text-center">{vazio}</p> : children}
    </CardContent>
  </Card>
);

const Pilula = ({ rotulo, valor, qtd, cor = '', onClick }) => (
  <button type="button" onClick={onClick} className="text-left rounded-md border border-border p-3 hover:bg-muted/40 transition-colors">
    <div className="text-xs text-muted-foreground">{rotulo}</div>
    <div className={`text-lg font-bold ${cor}`}>{moeda(valor)}</div>
    <div className="text-[11px] text-muted-foreground">{qtd} título(s)</div>
  </button>
);

const fmt = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '');

// ---------- Financeiro ----------
const FinPagarReceber = () => {
  const navigate = useNavigate();
  const e = useCarga('titulos', titulosAbertos);
  const r = e.dados ? resumoVencimentos(e.dados) : null;
  return (
    <Moldura titulo="A pagar e a receber" descricao="Saldo em aberto por vencimento." estado={e}>
      {r && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Pilula rotulo="Pagar vencidos" valor={r.pagarVencidos.valor} qtd={r.pagarVencidos.qtd} cor={r.pagarVencidos.qtd ? 'text-red-600' : ''} onClick={() => navigate('/financeiro/contas-pagar')} />
            <Pilula rotulo="Pagar hoje" valor={r.pagarHoje.valor} qtd={r.pagarHoje.qtd} cor="text-orange-600" onClick={() => navigate('/financeiro/contas-pagar')} />
            <Pilula rotulo="Pagar em 7 dias" valor={r.pagarSemana.valor} qtd={r.pagarSemana.qtd} onClick={() => navigate('/financeiro/contas-pagar')} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Pilula rotulo="Receber vencidos" valor={r.receberVencidos.valor} qtd={r.receberVencidos.qtd} cor={r.receberVencidos.qtd ? 'text-red-600' : ''} onClick={() => navigate('/financeiro/contas-receber')} />
            <Pilula rotulo="Receber hoje" valor={r.receberHoje.valor} qtd={r.receberHoje.qtd} cor="text-emerald-600" onClick={() => navigate('/financeiro/contas-receber')} />
            <Pilula rotulo="Receber em 7 dias" valor={r.receberSemana.valor} qtd={r.receberSemana.qtd} cor="text-emerald-600" onClick={() => navigate('/financeiro/contas-receber')} />
          </div>
        </div>
      )}
    </Moldura>
  );
};

const FinFluxoMes = () => {
  const e = useCarga('movimento', (id) => movimentoDoMes(id));
  const d = e.dados;
  const maior = d ? Math.max(d.entradas, d.saidas, 1) : 1;
  return (
    <Moldura titulo="Movimento do mês" descricao="Entradas e saídas já realizadas (baixas)." estado={e} vazio={d && !d.entradas && !d.saidas ? 'Nenhuma baixa neste mês ainda.' : null}>
      {d && (
        <div className="space-y-3">
          {[['Entradas', d.entradas, 'bg-emerald-500'], ['Saídas', d.saidas, 'bg-red-500']].map(([r, v, c]) => (
            <div key={r}><div className="flex justify-between text-sm mb-1"><span>{r}</span><span className="font-medium">{moeda(v)}</span></div><div className="h-2.5 rounded bg-muted"><div className={`h-2.5 rounded ${c}`} style={{ width: `${(v / maior) * 100}%` }} /></div></div>
          ))}
          <div className="flex justify-between border-t border-border pt-2 text-sm"><span className="text-muted-foreground">Resultado do mês</span><span className={`font-bold ${d.entradas - d.saidas >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{moeda(d.entradas - d.saidas)}</span></div>
        </div>
      )}
    </Moldura>
  );
};

const FinProximos = () => {
  const navigate = useNavigate();
  const e = useCarga('titulos', titulosAbertos);
  const lista = (e.dados || []).slice(0, 8);
  const hoje = hojeISO();
  return (
    <Moldura titulo="Próximos vencimentos" descricao="Os títulos em aberto mais próximos (vencidos primeiro)." estado={e} vazio={e.dados && !e.dados.length ? 'Nenhum título em aberto. 🎉' : null}>
      <div className="divide-y divide-border">
        {lista.map((t) => (
          <div key={t.id} className="py-1.5 flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30" onClick={() => navigate(t.tipo === 'pagar' ? '/financeiro/contas-pagar' : '/financeiro/contas-receber')}>
            <Badge variant={t.tipo === 'pagar' ? 'destructive' : 'success'} className="shrink-0">{t.tipo === 'pagar' ? 'pagar' : 'receber'}</Badge>
            <span className="flex-1 truncate">{t.nome || t.numero_titulo}</span>
            <span className={`text-xs ${t.data_vencimento < hoje ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>{fmt(t.data_vencimento)}</span>
            <span className="font-medium whitespace-nowrap">{moeda(t.saldo)}</span>
          </div>
        ))}
      </div>
    </Moldura>
  );
};

// ---------- Comercial ----------
const ComFunil = () => {
  const navigate = useNavigate();
  const e = useCarga('oportunidades', listarOportunidades);
  const abertas = (e.dados || []).filter((o) => !['ganho', 'perdido'].includes(o.etapa));
  const total = abertas.reduce((s, o) => s + Number(o.valor || 0), 0);
  return (
    <Moldura titulo="Funil comercial" descricao={abertas.length ? `${abertas.length} oportunidade(s) · ${moeda(total)}` : null} estado={e} vazio={e.dados && !abertas.length ? 'Nenhuma oportunidade em aberto.' : null}>
      <div className="space-y-1.5 cursor-pointer" onClick={() => navigate('/crm/funil')}>
        {ETAPAS.filter((x) => !['ganho', 'perdido'].includes(x.id)).map((et) => {
          const l = abertas.filter((o) => o.etapa === et.id);
          const v = l.reduce((s, o) => s + Number(o.valor || 0), 0);
          return (
            <div key={et.id}><div className="flex justify-between text-xs mb-0.5"><span>{et.rotulo} <span className="text-muted-foreground">({l.length})</span></span><span className="font-medium">{moeda(v)}</span></div><div className="h-2 rounded bg-muted"><div className="h-2 rounded" style={{ width: `${total ? (v / total) * 100 : 0}%`, background: '#FE6102' }} /></div></div>
          );
        })}
      </div>
    </Moldura>
  );
};

const ComPropostas = () => {
  const navigate = useNavigate();
  const e = useCarga('propostas', listarPropostas);
  const enviadas = (e.dados || []).filter((p) => p.status === 'enviada');
  const aceitas = (e.dados || []).filter((p) => p.status === 'aceita');
  return (
    <Moldura titulo="Propostas" estado={e} vazio={e.dados && !e.dados.length ? 'Nenhuma proposta ainda.' : null}>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">Aguardando resposta</div><div className="text-lg font-bold">{enviadas.length}</div><div className="text-[11px] text-muted-foreground">{moeda(enviadas.reduce((s, p) => s + Number(p.valor_total || 0), 0))}</div></div>
        <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">Aceitas</div><div className="text-lg font-bold text-emerald-600">{aceitas.length}</div><div className="text-[11px] text-muted-foreground">{moeda(aceitas.reduce((s, p) => s + Number(p.valor_total || 0), 0))}</div></div>
      </div>
      <div className="divide-y divide-border">
        {enviadas.slice(0, 4).map((p) => (
          <div key={p.id} className="py-1.5 flex justify-between text-sm cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/crm/propostas/${p.id}`)}><span className="truncate">{p.numero} · {p.conta?.nome}</span><span className="font-medium whitespace-nowrap">{moeda(p.valor_total)}</span></div>
        ))}
      </div>
    </Moldura>
  );
};

const ComRecorrente = () => {
  const navigate = useNavigate();
  const e = useCarga('contratos', listarContratos);
  const ativos = (e.dados || []).filter((c) => c.status === 'ativo');
  const mrr = ativos.reduce((s, c) => s + valorMensal(c.itens), 0);
  return (
    <Moldura titulo="Receita recorrente" estado={e} vazio={e.dados && !ativos.length ? 'Nenhum contrato recorrente ativo.' : null}>
      <div className="cursor-pointer" onClick={() => navigate('/vendas/contratos')}>
        <div className="text-3xl font-bold text-emerald-600">{moeda(mrr)}</div>
        <div className="text-xs text-muted-foreground mt-1">por mês · {ativos.length} contrato(s) ativo(s)</div>
      </div>
    </Moldura>
  );
};

// ---------- Tarefas ----------
const usaTarefas = () => {
  const { user } = useAuthContext();
  const e = useCarga('tarefas', async (id) => ({ tarefas: await tarefasAbertas(id), usuarios: await listarUsuarios().catch(() => []) }));
  return { e, userId: user?.id };
};

const TarListaBase = ({ titulo, descricao, filtro, vazio }) => {
  const navigate = useNavigate();
  const { e, userId } = usaTarefas();
  const hoje = hojeISO();
  const todas = (e.dados?.tarefas || []).filter((t) => filtro(t, userId, hoje));
  const nomeDe = (id) => e.dados?.usuarios.find((u) => u.id === id)?.nome;
  return (
    <Moldura titulo={titulo} descricao={descricao} estado={e} vazio={e.dados && !todas.length ? vazio : null}>
      <div className="divide-y divide-border">
        {todas.slice(0, 8).map((t) => {
          const atrasada = t.prazo && t.prazo < hoje;
          return (
            <div key={t.id} className="py-1.5 flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/tarefas/${t.quadro_id}`)}>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${PRIORIDADES[t.prioridade].cor}`}>{PRIORIDADES[t.prioridade].rotulo}</span>
              <span className="flex-1 truncate">{t.titulo}{filtro.mostraResp && nomeDe(t.responsavel_id) ? <span className="text-muted-foreground"> · {nomeDe(t.responsavel_id)}</span> : null}</span>
              <span className={`text-xs whitespace-nowrap ${atrasada ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>{t.prazo ? fmt(t.prazo) : 'sem prazo'}</span>
            </div>
          );
        })}
      </div>
      {todas.length > 8 && <p className="text-xs text-muted-foreground pt-2">e mais {todas.length - 8}…</p>}
    </Moldura>
  );
};

const minhasFiltro = (t, uid) => t.responsavel_id === uid;
const atrasadasFiltro = (t, uid, hoje) => t.prazo && t.prazo < hoje;
atrasadasFiltro.mostraResp = true;

const TarMinhas = () => <TarListaBase titulo="Minhas tarefas" descricao="Em aberto, atribuídas a você." filtro={minhasFiltro} vazio="Você não tem tarefas em aberto. 🎯" />;
const TarAtrasadas = () => <TarListaBase titulo="Tarefas atrasadas" descricao="De toda a equipe." filtro={atrasadasFiltro} vazio="Nada atrasado." />;

// ---------- Painel executivo: indicadores, gráfico e agenda ----------
const Indicador = ({ rotulo, valor, sub, estado, alerta }) => (
  <Card className="h-full bg-slate-900 text-white border-slate-800 dark:bg-slate-800">
    <CardContent className="p-4">
      <div className="text-xs text-slate-300">{rotulo}</div>
      {estado.carregando ? <div className="h-8 flex items-center"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div> : (
        <>
          <div className="text-2xl font-bold mt-1" style={{ color: alerta ? '#fca5a5' : '#FFB27A' }}>{estado.erro ? '—' : valor}</div>
          <div className="mt-2 h-1.5 rounded bg-slate-700"><div className="h-1.5 rounded" style={{ width: '100%', background: '#FE6102', opacity: 0.85 }} /></div>
          <div className="text-[11px] text-slate-400 mt-1.5 min-h-[1rem]">{sub}</div>
        </>
      )}
    </CardContent>
  </Card>
);

const useExecutivo = () => useCarga('executivo', resumoExecutivo);
const SEM_DADOS = 'sem movimento no extrato';

const KpiCaixa = () => { const e = useExecutivo(); const d = e.dados; return <Indicador rotulo="Caixa" estado={e} valor={d?.caixa === null || d?.caixa === undefined ? '—' : moeda(d.caixa)} sub={d?.caixa === null || d?.caixa === undefined ? 'sem saldo no extrato' : 'saldo do último extrato importado'} />; };
const KpiReceitas = () => { const e = useExecutivo(); const d = e.dados; return <Indicador rotulo="Receitas" estado={e} valor={d?.temDados ? moeda(d.receitas) : '—'} sub={d?.temDados ? `recebido em ${d.mesRotulo}` : SEM_DADOS} />; };
const KpiDespesas = () => { const e = useExecutivo(); const d = e.dados; return <Indicador rotulo="Despesas" estado={e} valor={d?.temDados ? moeda(d.despesas) : '—'} sub={d?.temDados ? `pago em ${d.mesRotulo}` : SEM_DADOS} />; };
const KpiPE = () => {
  const e = useExecutivo(); const d = e.dados; const pe = d?.pe;
  const ok = d?.temDados && pe?.temDado && !pe.peImpossivel;
  return <Indicador rotulo="Ponto de equilíbrio" estado={e} alerta={ok && !pe.acima} valor={ok ? moeda(pe.pe) : '—'} sub={!d?.temDados ? SEM_DADOS : (pe?.peImpossivel ? 'margem negativa neste mês' : (ok ? `${pe.acima ? 'acima' : 'abaixo'} do ponto em ${moeda(Math.abs(pe.folga))}` : ''))} />;
};

const GrafEvolucao = () => {
  const e = useExecutivo();
  const serie = e.dados?.serie || [];
  return (
    <Moldura titulo="Receitas x despesas" descricao="Últimos meses do ano (regime de caixa)." estado={e} vazio={e.dados && !e.dados.temDados ? 'Sem movimento no extrato neste ano.' : null}>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={serie} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v, n) => [moeda(v), n]} />
            <Legend />
            <Bar dataKey="receitas" name="Receitas" fill="#FE6102" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesas" name="Despesas" fill="#FFB27A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Moldura>
  );
};

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm w-full';
const vazioEvento = (data) => ({ titulo: '', tipo: 'compromisso', data_inicio: data, hora_inicio: '', hora_fim: '', dia_inteiro: false, local: '', descricao: '', responsavel_id: '' });

const AgendaBloco = () => {
  const { company_id: companyId, user } = useAuthContext();
  const { toast } = useToast();
  const [itens, setItens] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const hoje = hojeISO();

  const carregar = useCallback(async () => {
    if (!companyId) return;
    try {
      const ate = somaDias(hoje, 14);
      const [ev, tar, us] = await Promise.all([listarEventos(companyId, hoje, ate), tarefasAbertas(companyId), listarUsuarios().catch(() => [])]);
      setUsuarios(us);
      const lista = [
        ...ev.map((x) => ({ chave: `e${x.id}`, tipo: 'evento', data: x.data_inicio, hora: x.dia_inteiro ? null : (x.hora_inicio ? x.hora_inicio.slice(0, 5) : null), titulo: x.titulo, sub: [TIPOS_EVENTO[x.tipo], x.local].filter(Boolean).join(' · '), original: x, link: linkGoogleEvento(x) })),
        ...tar.filter((t) => t.prazo && t.prazo <= ate).map((t) => ({ chave: `t${t.id}`, tipo: 'tarefa', data: t.prazo < hoje ? hoje : t.prazo, atrasada: t.prazo < hoje, hora: null, titulo: t.titulo, sub: `Tarefa${t.quadro?.nome ? ` · ${t.quadro.nome}` : ''}${t.prazo < hoje ? ' · atrasada' : ''}`, link: linkGoogleAgenda(t, t.quadro?.nome), quadroId: t.quadro_id }))
      ].sort((a, b) => a.data.localeCompare(b.data) || String(a.hora || '').localeCompare(String(b.hora || '')));
      setItens(lista);
    } catch (e) { setItens([]); toast({ title: 'Não foi possível carregar a agenda', description: e.message, variant: 'destructive' }); }
  }, [companyId, hoje, toast]);
  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    if (!form.titulo.trim()) { toast({ title: 'Dê um título ao compromisso', variant: 'destructive' }); return; }
    setSalvando(true);
    try {
      const dados = { titulo: form.titulo.trim(), tipo: form.tipo, data_inicio: form.data_inicio, hora_inicio: form.dia_inteiro || !form.hora_inicio ? null : form.hora_inicio, hora_fim: form.dia_inteiro || !form.hora_fim ? null : form.hora_fim, dia_inteiro: !!form.dia_inteiro, local: form.local || null, descricao: form.descricao || null, responsavel_id: form.responsavel_id || null };
      if (form.id) await atualizarEvento(form.id, dados); else await criarEvento(companyId, user?.id, dados);
      setForm(null); await carregar();
    } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };

  const rotuloDia = (d) => { const dt = new Date(`${d}T12:00:00`); return { dia: d.slice(8, 10), mes: d.slice(5, 7), sem: d === hoje ? 'hoje' : DIAS_CURTOS[dt.getDay()] }; };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
        <div><CardTitle className="text-base">Agenda</CardTitle><CardDescription>Compromissos e prazos dos próximos 14 dias.</CardDescription></div>
        <Button size="sm" variant="outline" onClick={() => setForm(vazioEvento(hoje))}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </CardHeader>
      <CardContent>
        {itens === null ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : itens.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Nada agendado. Clique em "Novo" para marcar um compromisso.</p> : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {itens.map((i) => {
                const d = rotuloDia(i.data);
                const destaque = i.data === hoje;
                return (
                  <div key={i.chave} className={`rounded-md px-3 py-2 flex items-center gap-3 text-sm ${destaque ? 'text-white' : 'bg-muted/50'}`} style={destaque ? { background: '#FE6102' } : undefined}>
                    <div className="w-11 text-center shrink-0"><div className="font-bold leading-tight">{d.dia}/{d.mes}</div><div className={`text-[10px] uppercase ${destaque ? 'text-white/90' : 'text-muted-foreground'}`}>{d.sem}</div></div>
                    <button type="button" className="flex-1 min-w-0 text-left" onClick={() => (i.tipo === 'evento' ? setForm({ ...vazioEvento(hoje), ...i.original, hora_inicio: i.original.hora_inicio?.slice(0, 5) || '', hora_fim: i.original.hora_fim?.slice(0, 5) || '', responsavel_id: i.original.responsavel_id || '', local: i.original.local || '', descricao: i.original.descricao || '' }) : window.location.assign(`/tarefas/${i.quadroId}`))}>
                      <div className="font-medium truncate">{i.hora ? `${i.hora} · ` : ''}{i.titulo}</div>
                      <div className={`text-[11px] truncate ${destaque ? 'text-white/85' : 'text-muted-foreground'}`}>{i.sub}</div>
                    </button>
                    {i.tipo === 'tarefa' && <CheckSquare className={`h-4 w-4 shrink-0 ${destaque ? 'text-white/80' : 'text-muted-foreground'}`} />}
                    {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer" title="Adicionar ao Google Agenda" className={`shrink-0 ${destaque ? 'text-white/90 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}><CalendarPlus className="h-4 w-4" /></a>}
                  </div>
                );
              })}
            </div>
          )}
      </CardContent>

      <Dialog open={!!form} onOpenChange={(o) => { if (!o) setForm(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? 'Editar compromisso' : 'Novo compromisso'}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div><Label className="text-xs">Título *</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Tipo</Label><select className={sel} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{Object.entries(TIPOS_EVENTO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></div>
                <div><Label className="text-xs">Data</Label><Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.dia_inteiro} onCheckedChange={(v) => setForm({ ...form, dia_inteiro: v === true })} /> Dia inteiro</label>
              {!form.dia_inteiro && <div className="grid grid-cols-2 gap-3"><div><Label className="text-xs">Início</Label><Input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} /></div><div><Label className="text-xs">Término</Label><Input type="time" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} /></div></div>}
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Local</Label><Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} /></div>
                <div><Label className="text-xs">Responsável</Label><select className={sel} value={form.responsavel_id} onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}><option value="">—</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
              </div>
              <div><Label className="text-xs">Descrição</Label><Textarea rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {form?.id && <Button variant="ghost" className="text-destructive mr-auto" onClick={async () => { if (window.confirm('Excluir este compromisso?')) { try { await excluirEvento(form.id); setForm(null); await carregar(); } catch (e) { toast({ title: 'Não foi possível excluir', description: e.message, variant: 'destructive' }); } } }}><Trash2 className="w-4 h-4 mr-1" /> Excluir</Button>}
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
// ---------- registro ----------
export const GRUPOS = { executivo: 'Painel executivo', financeiro: 'Financeiro', comercial: 'Comercial', tarefas: 'Tarefas' };

// Larguras na grade de 12 colunas (telas grandes). Classes escritas por extenso para o Tailwind enxergá-las.
export const TAMANHOS = {
  p: { rotulo: 'Pequeno (1/4)', classe: 'md:col-span-3 lg:col-span-3' },
  q: { rotulo: 'Médio (1/3)', classe: 'md:col-span-6 lg:col-span-4' },
  m: { rotulo: 'Meia largura', classe: 'md:col-span-6 lg:col-span-6' },
  l: { rotulo: 'Grande (2/3)', classe: 'md:col-span-6 lg:col-span-8' },
  g: { rotulo: 'Largura inteira', classe: 'md:col-span-6 lg:col-span-12' }
};

export const WIDGETS = [
  { id: 'kpi_caixa', grupo: 'executivo', titulo: 'Caixa', descricao: 'Saldo atual dos bancos', tamanho: 'p', Componente: KpiCaixa },
  { id: 'kpi_receitas', grupo: 'executivo', titulo: 'Receitas', descricao: 'Recebido no mês', tamanho: 'p', Componente: KpiReceitas },
  { id: 'kpi_despesas', grupo: 'executivo', titulo: 'Despesas', descricao: 'Pago no mês', tamanho: 'p', Componente: KpiDespesas },
  { id: 'kpi_pe', grupo: 'executivo', titulo: 'Ponto de equilíbrio', descricao: 'Faturamento necessário no mês e quanto sobrou ou faltou', tamanho: 'p', Componente: KpiPE },
  { id: 'graf_evolucao', grupo: 'executivo', titulo: 'Receitas x despesas', descricao: 'Gráfico dos últimos meses', tamanho: 'l', Componente: GrafEvolucao },
  { id: 'agenda', grupo: 'executivo', titulo: 'Agenda', descricao: 'Compromissos e prazos das tarefas', tamanho: 'q', Componente: AgendaBloco },
  { id: 'fin_pagar_receber', grupo: 'financeiro', titulo: 'A pagar e a receber', descricao: 'Vencidos, hoje e próximos 7 dias', tamanho: 'g', Componente: FinPagarReceber },
  { id: 'fin_fluxo_mes', grupo: 'financeiro', titulo: 'Movimento do mês', descricao: 'Entradas, saídas e resultado realizado', tamanho: 'm', Componente: FinFluxoMes },
  { id: 'fin_proximos', grupo: 'financeiro', titulo: 'Próximos vencimentos', descricao: 'Lista dos títulos mais próximos', tamanho: 'm', Componente: FinProximos },
  { id: 'com_funil', grupo: 'comercial', titulo: 'Funil comercial', descricao: 'Oportunidades por etapa', tamanho: 'm', Componente: ComFunil },
  { id: 'com_propostas', grupo: 'comercial', titulo: 'Propostas', descricao: 'Aguardando resposta e aceitas', tamanho: 'm', Componente: ComPropostas },
  { id: 'com_recorrente', grupo: 'comercial', titulo: 'Receita recorrente', descricao: 'Contratos mensais ativos', tamanho: 'm', Componente: ComRecorrente },
  { id: 'tar_minhas', grupo: 'tarefas', titulo: 'Minhas tarefas', descricao: 'Em aberto, atribuídas a você', tamanho: 'm', Componente: TarMinhas },
  { id: 'tar_atrasadas', grupo: 'tarefas', titulo: 'Tarefas atrasadas', descricao: 'De toda a equipe', tamanho: 'm', Componente: TarAtrasadas }
];

export const WIDGET_POR_ID = Object.fromEntries(WIDGETS.map((w) => [w.id, w]));

// Modelos prontos: completo (tudo) e executivo (indicadores, gráfico e agenda, como no painel da proposta).
const EXECUTIVO = ['kpi_caixa', 'kpi_receitas', 'kpi_despesas', 'kpi_pe', 'graf_evolucao', 'agenda'];
export const layoutModelo = (modelo) => {
  const todos = WIDGETS.map((w) => ({ id: w.id, visivel: true, tamanho: w.tamanho }));
  if (modelo !== 'executivo') return todos;
  return [...EXECUTIVO.map((id) => todos.find((x) => x.id === id)), ...todos.filter((x) => !EXECUTIVO.includes(x.id)).map((x) => ({ ...x, visivel: false }))];
};
export const layoutPadrao = () => layoutModelo('completo');

// Junta o layout salvo com o catálogo: respeita ordem, visibilidade e tamanho salvos; blocos novos entram no fim, escondidos.
export const mesclarLayout = (salvo) => {
  if (!Array.isArray(salvo) || !salvo.length) return layoutPadrao();
  const vistos = new Set();
  const base = salvo.filter((x) => WIDGET_POR_ID[x.id] && !vistos.has(x.id) && vistos.add(x.id)).map((x) => ({ id: x.id, visivel: x.visivel !== false, tamanho: TAMANHOS[x.tamanho] ? x.tamanho : (WIDGET_POR_ID[x.id].tamanho || 'm') }));
  WIDGETS.forEach((w) => { if (!vistos.has(w.id)) base.push({ id: w.id, visivel: false, tamanho: w.tamanho }); });
  return base;
};

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import { titulosAbertos, movimentoDoMes, resumoVencimentos, hojeISO } from '@/lib/dashboardData';
import { listarOportunidades, listarPropostas, ETAPAS, moeda } from '@/lib/crmService';
import { listarContratos, valorMensal } from '@/lib/crmContratos';
import { tarefasAbertas, listarUsuarios, PRIORIDADES } from '@/lib/tarefasService';

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

// ---------- registro ----------
export const GRUPOS = { financeiro: 'Financeiro', comercial: 'Comercial', tarefas: 'Tarefas' };

export const WIDGETS = [
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

export const layoutPadrao = () => WIDGETS.map((w) => ({ id: w.id, visivel: true, tamanho: w.tamanho }));

// Junta o layout salvo com o catálogo: respeita ordem, visibilidade e tamanho salvos; blocos novos entram no fim, escondidos.
export const mesclarLayout = (salvo) => {
  if (!Array.isArray(salvo) || !salvo.length) return layoutPadrao();
  const vistos = new Set();
  const base = salvo.filter((x) => WIDGET_POR_ID[x.id] && !vistos.has(x.id) && vistos.add(x.id)).map((x) => ({ id: x.id, visivel: x.visivel !== false, tamanho: x.tamanho === 'g' ? 'g' : 'm' }));
  WIDGETS.forEach((w) => { if (!vistos.has(w.id)) base.push({ id: w.id, visivel: false, tamanho: w.tamanho }); });
  return base;
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, CalendarPlus, FileDown, FilePlus2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  listarProjetosF5, criarProjetoF5, listarTarefasProjeto, criarTarefa, atualizarTarefa, excluirTarefa,
  listarAgenda, criarAgenda, atualizarAgenda, excluirAgenda, listarOS, criarOS, atualizarOS,
  listarEntregaveis, criarEntregavel, atualizarEntregavel, excluirEntregavel, gerarAgendaDoCronograma,
  STATUS_TAREFA, STATUS_VISITA, STATUS_ENTREGA, TIPOS_COMPROMISSO, formatarData, hojeISO, diaDaSemana
} from '@/lib/engService';

const selectCls = 'h-8 rounded-md border border-input bg-background px-2 text-xs';
const selectGrande = 'h-9 rounded-md border border-input bg-background px-3 text-sm w-full';
const SEMANA = [[1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb']];

// ---------------- Cronograma ----------------
const Cronograma = ({ cliente, projeto, tarefas, recarregar }) => {
  const { toast } = useToast();
  const fases = useMemo(() => [...new Set(tarefas.map((t) => t.fase).filter(Boolean))], [tarefas]);
  const [novo, setNovo] = useState({ dia_plano: '', fase: '', atividade: '', carga_horas: '' });
  const [gerar, setGerar] = useState(null);
  const [trabalhando, setTrabalhando] = useState(false);
  const hoje = hojeISO();

  const salvar = async (t, campos) => {
    try { await atualizarTarefa(t.id, campos); await recarregar(); } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
  };

  const adicionar = async () => {
    if (!novo.atividade.trim()) { toast({ title: 'Descreva a atividade', variant: 'destructive' }); return; }
    try {
      const proximoDia = Math.max(0, ...tarefas.map((t) => t.dia_plano || 0)) + 1;
      await criarTarefa(cliente.id, projeto.id, {
        atividade: novo.atividade.trim(), fase: novo.fase || null,
        dia_plano: novo.dia_plano === '' ? proximoDia : Number(novo.dia_plano),
        carga_horas: novo.carga_horas === '' ? null : Number(novo.carga_horas)
      });
      setNovo({ dia_plano: '', fase: novo.fase, atividade: '', carga_horas: '' });
      await recarregar();
    } catch (e) { toast({ title: 'Não foi possível adicionar', description: e.message, variant: 'destructive' }); }
  };

  const confirmarGerar = async () => {
    if (!gerar.inicio || gerar.dias.length === 0) { toast({ title: 'Informe a data de início e ao menos um dia da semana', variant: 'destructive' }); return; }
    setTrabalhando(true);
    try {
      const r = await gerarAgendaDoCronograma(cliente.id, projeto.id, tarefas, {
        inicio: gerar.inicio, diasSemana: gerar.dias, horaInicio: gerar.hora, pausas: gerar.pausas.filter((p) => p.de && p.ate)
      });
      toast({ title: 'Agenda gerada', description: `${r.agenda} compromisso(s) criado(s) e datas previstas atualizadas.` });
      setGerar(null);
      await recarregar();
    } catch (e) { toast({ title: 'Não foi possível gerar a agenda', description: e.message, variant: 'destructive' }); }
    finally { setTrabalhando(false); }
  };

  const feitas = tarefas.filter((t) => t.status === 'concluido').length;
  const aplic = tarefas.filter((t) => t.status !== 'na').length;
  const horas = tarefas.reduce((s, t) => s + (Number(t.carga_horas) || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Cronograma do plano de trabalho</CardTitle>
            <CardDescription>{feitas} de {aplic} atividades concluídas · {horas}h previstas. Cada "dia" do plano vira um encontro na agenda.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setGerar({ inicio: projeto.data_inicio || hoje, dias: [2, 4], hora: '09:00', pausas: [{ de: '', ate: '' }] })} disabled={tarefas.length === 0}>
            <CalendarPlus className="w-4 h-4 mr-2" /> Gerar agenda a partir do cronograma
          </Button>
        </div>
        <Progress value={aplic ? (feitas / aplic) * 100 : 0} className="h-2" />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr><th className="text-left p-2">Dia</th><th className="text-left p-2">Fase</th><th className="text-left p-2">Atividade</th><th className="text-left p-2">Carga</th><th className="text-left p-2">Prevista</th><th className="text-left p-2">Situação</th><th className="text-left p-2">Realizada</th><th className="p-2" /></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tarefas.map((t) => {
              const atrasada = t.data_prevista && t.data_prevista < hoje && !['concluido', 'na'].includes(t.status);
              return (
                <tr key={t.id} className={t.status === 'concluido' ? 'opacity-70' : ''}>
                  <td className="p-2">{t.dia_plano}</td>
                  <td className="p-2 text-xs max-w-[150px]">{t.fase}</td>
                  <td className="p-2 max-w-[380px]">{t.atividade}</td>
                  <td className="p-2">{t.carga_horas ? `${t.carga_horas}h` : ''}</td>
                  <td className={`p-2 whitespace-nowrap ${atrasada ? 'text-red-600 font-medium' : ''}`}>{formatarData(t.data_prevista)}</td>
                  <td className="p-2">
                    <select className={selectCls} value={t.status} onChange={(e) => salvar(t, { status: e.target.value, data_realizada: e.target.value === 'concluido' ? (t.data_realizada || hoje) : t.data_realizada })}>
                      {Object.entries(STATUS_TAREFA).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                    </select>
                  </td>
                  <td className="p-2"><Input type="date" className="h-8 text-xs w-[135px]" value={t.data_realizada || ''} onChange={(e) => salvar(t, { data_realizada: e.target.value || null })} /></td>
                  <td className="p-2"><button type="button" title="Excluir" className="text-muted-foreground hover:text-destructive" onClick={async () => { if (window.confirm('Excluir esta atividade?')) { await excluirTarefa(t.id); recarregar(); } }}><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-4 rounded-md border border-dashed border-border p-3 grid grid-cols-1 md:grid-cols-[70px_200px_1fr_80px_auto] gap-2 items-end">
          <div><Label className="text-xs">Dia</Label><Input type="number" min="1" placeholder="auto" value={novo.dia_plano} onChange={(e) => setNovo({ ...novo, dia_plano: e.target.value })} /></div>
          <div><Label className="text-xs">Fase</Label><Input list="fases-f5" value={novo.fase} onChange={(e) => setNovo({ ...novo, fase: e.target.value })} placeholder="ex.: Fase 1 — Diagnóstico" /><datalist id="fases-f5">{fases.map((f) => <option key={f} value={f} />)}</datalist></div>
          <div><Label className="text-xs">Atividade</Label><Input value={novo.atividade} onChange={(e) => setNovo({ ...novo, atividade: e.target.value })} /></div>
          <div><Label className="text-xs">Carga (h)</Label><Input type="number" min="0" step="0.5" value={novo.carga_horas} onChange={(e) => setNovo({ ...novo, carga_horas: e.target.value })} /></div>
          <Button onClick={adicionar}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
        </div>
      </CardContent>

      <Dialog open={!!gerar} onOpenChange={(o) => { if (!o) setGerar(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gerar agenda a partir do cronograma</DialogTitle></DialogHeader>
          {gerar && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Cada dia do plano recebe uma data nos dias da semana escolhidos. Compromissos que já estão na agenda não são duplicados.</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Primeiro encontro (a partir de)</Label><Input type="date" value={gerar.inicio} onChange={(e) => setGerar({ ...gerar, inicio: e.target.value })} /></div>
                <div><Label>Horário de início</Label><Input type="time" value={gerar.hora} onChange={(e) => setGerar({ ...gerar, hora: e.target.value })} /></div>
              </div>
              <div>
                <Label>Dias da semana</Label>
                <div className="flex gap-3 mt-1">
                  {SEMANA.map(([n, r]) => (
                    <label key={n} className="flex items-center gap-1.5 text-sm"><Checkbox checked={gerar.dias.includes(n)} onCheckedChange={(v) => setGerar({ ...gerar, dias: v === true ? [...gerar.dias, n] : gerar.dias.filter((x) => x !== n) })} />{r}</label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Pausas (ex.: férias, fim de ano)</Label>
                {gerar.pausas.map((p, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 mt-1">
                    <Input type="date" value={p.de} onChange={(e) => setGerar({ ...gerar, pausas: gerar.pausas.map((x, k) => (k === i ? { ...x, de: e.target.value } : x)) })} />
                    <Input type="date" value={p.ate} onChange={(e) => setGerar({ ...gerar, pausas: gerar.pausas.map((x, k) => (k === i ? { ...x, ate: e.target.value } : x)) })} />
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="mt-1" onClick={() => setGerar({ ...gerar, pausas: [...gerar.pausas, { de: '', ate: '' }] })}>+ outra pausa</Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGerar(null)}>Cancelar</Button>
            <Button onClick={confirmarGerar} disabled={trabalhando}>{trabalhando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Gerar agenda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// ---------------- Agenda ----------------
const Agenda = ({ cliente, projeto, tarefas, agenda, recarregar, onAbrirOS }) => {
  const { toast } = useToast();
  const [form, setForm] = useState(null);

  const salvar = async () => {
    if (!form.titulo.trim() || !form.data) { toast({ title: 'Informe a data e o título', variant: 'destructive' }); return; }
    try {
      const dados = { data: form.data, hora_inicio: form.hora_inicio || null, hora_fim: form.hora_fim || null, tipo: form.tipo, titulo: form.titulo.trim(), dia_plano: form.dia_plano === '' || form.dia_plano === null ? null : Number(form.dia_plano), observacoes: form.observacoes || null };
      if (form.id) await atualizarAgenda(form.id, dados); else await criarAgenda(cliente.id, projeto.id, dados);
      setForm(null);
      await recarregar();
    } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
  };

  const mudar = async (a, campos) => {
    try { await atualizarAgenda(a.id, campos); await recarregar(); } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
  };

  const hoje = hojeISO();
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle className="text-base">Agenda</CardTitle><CardDescription>Visitas e reuniões do projeto. O cliente enxerga os compromissos marcados como visíveis.</CardDescription></div>
          <Button size="sm" onClick={() => setForm({ data: hoje, hora_inicio: '', hora_fim: '', tipo: 'Visita', titulo: '', dia_plano: '', observacoes: '' })}><Plus className="w-4 h-4 mr-1" /> Novo compromisso</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {agenda.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum compromisso. Crie um, ou use "Gerar agenda a partir do cronograma" na aba Cronograma.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-2">Data</th><th className="text-left p-2">Horário</th><th className="text-left p-2">Tipo</th><th className="text-left p-2">Compromisso</th><th className="text-left p-2">Dia</th><th className="text-left p-2">Situação</th><th className="p-2" /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agenda.map((a) => (
                <tr key={a.id} className={a.data < hoje && a.status === 'agendada' ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                  <td className="p-2 whitespace-nowrap">{formatarData(a.data)} <span className="text-xs text-muted-foreground">{diaDaSemana(a.data)}</span></td>
                  <td className="p-2 whitespace-nowrap">{a.hora_inicio ? a.hora_inicio.slice(0, 5) : '—'}{a.hora_fim ? `–${a.hora_fim.slice(0, 5)}` : ''}</td>
                  <td className="p-2 text-xs">{a.tipo}</td>
                  <td className="p-2 max-w-[360px]"><button type="button" className="text-left hover:underline" onClick={() => setForm({ ...a, hora_inicio: a.hora_inicio?.slice(0, 5) || '', hora_fim: a.hora_fim?.slice(0, 5) || '', dia_plano: a.dia_plano ?? '' })}>{a.titulo}</button></td>
                  <td className="p-2">{a.dia_plano || ''}</td>
                  <td className="p-2">
                    <select className={selectCls} value={a.status} onChange={(e) => mudar(a, { status: e.target.value })}>
                      {Object.entries(STATUS_VISITA).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                    </select>
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <button type="button" title={a.visivel_cliente ? 'Visível ao cliente' : 'Oculto do cliente'} className="text-muted-foreground hover:text-foreground mr-2" onClick={() => mudar(a, { visivel_cliente: !a.visivel_cliente })}>{a.visivel_cliente ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                    <Button variant="outline" size="sm" className="h-7 text-xs mr-2" onClick={() => onAbrirOS(a)}><FilePlus2 className="w-3 h-3 mr-1" />{a.os_id ? 'Abrir OS' : 'Criar OS'}</Button>
                    <button type="button" title="Excluir" className="text-muted-foreground hover:text-destructive" onClick={async () => { if (window.confirm('Excluir este compromisso?')) { await excluirAgenda(a.id); recarregar(); } }}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <Dialog open={!!form} onOpenChange={(o) => { if (!o) setForm(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? 'Editar compromisso' : 'Novo compromisso'}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                <div><Label>Início</Label><Input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} /></div>
                <div><Label>Término</Label><Input type="time" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-[1fr_90px] gap-3">
                <div><Label>Tipo</Label><select className={selectGrande} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{TIPOS_COMPROMISSO.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><Label>Dia do plano</Label><Input type="number" min="1" value={form.dia_plano} onChange={(e) => setForm({ ...form, dia_plano: e.target.value })} list="dias-plano" /><datalist id="dias-plano">{[...new Set(tarefas.map((t) => t.dia_plano).filter(Boolean))].map((n) => <option key={n} value={n} />)}</datalist></div>
              </div>
              <div><Label>Título / próximo passo</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
              <div><Label>Observações</Label><Textarea rows={2} value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// ---------------- OS de visita ----------------
const CAMPOS_OS = [
  ['objetivo', 'Objetivo da visita'], ['atividades', 'Atividades realizadas'], ['pessoas', 'Pessoas envolvidas'],
  ['documentos', 'Documentos / informações coletadas'], ['entregas', 'Entregas e avanços'], ['pendencias', 'Pendências (e responsável)'],
  ['riscos', 'Pontos de atenção / riscos'], ['proximos_passos', 'Próximos passos']
];

const OrdensServico = ({ cliente, projeto, ordens, recarregar, osAberta, setOsAberta, consultorNome }) => {
  const { toast } = useToast();
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);

  const salvar = async (publicar) => {
    setSalvando(true);
    try {
      const { id, numero, cliente_id, created_at, updated_at, projeto_id, agenda_id, ...resto } = osAberta; // eslint-disable-line no-unused-vars
      const dados = { ...resto, inicio: resto.inicio || null, termino: resto.termino || null, data: resto.data || null, proxima_visita: resto.proxima_visita || null, ...(publicar !== undefined ? { publicada: publicar } : {}) };
      const salva = id ? await atualizarOS(id, dados) : await criarOS(cliente.id, projeto.id, dados);
      if (!id && osAberta.agenda_id) await atualizarAgenda(osAberta.agenda_id, { os_id: salva.id });
      setOsAberta({ ...salva, agenda_id: osAberta.agenda_id });
      await recarregar();
      toast({ title: publicar === true ? 'OS publicada para o cliente' : 'OS salva' });
    } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };

  const pdf = async () => {
    setGerando(true);
    try {
      const { gerarOsPdf } = await import('@/lib/engOsPdf');
      await gerarOsPdf({ cliente, projeto, os: osAberta, consultorNome });
    } catch (e) { toast({ title: 'Não foi possível gerar o PDF', description: e.message, variant: 'destructive' }); }
    finally { setGerando(false); }
  };

  if (osAberta) {
    const o = osAberta;
    const muda = (k, v) => setOsAberta({ ...o, [k]: v });
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><CardTitle className="text-base">Ordem de Serviço {o.numero ? `Nº ${o.numero}` : '(nova)'}</CardTitle><CardDescription>Preencha durante ou logo após a visita. Ao publicar, o cliente passa a ver esta OS.</CardDescription></div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setOsAberta(null)}>Voltar à lista</Button>
              <Button variant="outline" size="sm" onClick={pdf} disabled={gerando || !o.numero}>{gerando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}PDF</Button>
              <Button variant="outline" size="sm" onClick={() => salvar()} disabled={salvando}>Salvar</Button>
              <Button size="sm" onClick={() => salvar(!o.publicada)} disabled={salvando}>{o.publicada ? 'Despublicar' : 'Salvar e publicar ao cliente'}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><Label>Data</Label><Input type="date" value={o.data || ''} onChange={(e) => muda('data', e.target.value)} /></div>
            <div><Label>Início</Label><Input type="time" value={o.inicio?.slice(0, 5) || ''} onChange={(e) => muda('inicio', e.target.value)} /></div>
            <div><Label>Término</Label><Input type="time" value={o.termino?.slice(0, 5) || ''} onChange={(e) => muda('termino', e.target.value)} /></div>
            <div><Label>Fase</Label><Input value={o.fase || ''} onChange={(e) => muda('fase', e.target.value)} /></div>
            <div><Label>Situação</Label><select className={selectGrande} value={o.status} onChange={(e) => muda('status', e.target.value)}>{Object.entries(STATUS_VISITA).map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></div>
          </div>
          {CAMPOS_OS.map(([k, r]) => (<div key={k}><Label>{r}</Label><Textarea rows={k === 'atividades' || k === 'entregas' ? 4 : 2} value={o[k] || ''} onChange={(e) => muda(k, e.target.value)} /></div>))}
          <div className="max-w-[220px]"><Label>Próxima visita prevista</Label><Input type="date" value={o.proxima_visita || ''} onChange={(e) => muda('proxima_visita', e.target.value)} /></div>
          {o.publicada && <Badge variant="success">Publicada — o cliente vê esta OS</Badge>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle className="text-base">Ordens de serviço das visitas</CardTitle><CardDescription>Uma OS por visita. Crie pela agenda (já vem preenchida) ou direto aqui.</CardDescription></div>
          <Button size="sm" onClick={() => setOsAberta({ data: hojeISO(), status: 'realizada', publicada: false })}><Plus className="w-4 h-4 mr-1" /> Nova OS</Button>
        </div>
      </CardHeader>
      <CardContent>
        {ordens.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma OS ainda.</p> : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr><th className="text-left p-2">Nº</th><th className="text-left p-2">Data</th><th className="text-left p-2">Fase</th><th className="text-left p-2">Objetivo</th><th className="text-left p-2">Situação</th><th className="text-left p-2">Cliente vê</th></tr></thead>
            <tbody className="divide-y divide-border">
              {ordens.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setOsAberta(o)}>
                  <td className="p-2 font-medium">{o.numero}</td><td className="p-2">{formatarData(o.data)}</td><td className="p-2 text-xs">{o.fase}</td>
                  <td className="p-2 max-w-[360px] truncate">{o.objetivo}</td><td className="p-2">{STATUS_VISITA[o.status]}</td>
                  <td className="p-2">{o.publicada ? <Badge variant="success">Publicada</Badge> : <Badge variant="outline">Rascunho</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
};

// ---------------- Entregas ----------------
const Entregas = ({ cliente, projeto, entregas, recarregar }) => {
  const { toast } = useToast();
  const frentes = useMemo(() => [...new Set(entregas.map((e) => e.frente).filter(Boolean))], [entregas]);
  const [novo, setNovo] = useState({ titulo: '', frente: '', fase: '' });
  const feitas = entregas.filter((e) => e.status === 'concluido').length;
  const aplic = entregas.filter((e) => e.status !== 'na').length;

  const mudar = async (e, campos) => { try { await atualizarEntregavel(e.id, campos); await recarregar(); } catch (err) { toast({ title: 'Não foi possível salvar', description: err.message, variant: 'destructive' }); } };
  const adicionar = async () => {
    if (!novo.titulo.trim()) { toast({ title: 'Descreva a entrega', variant: 'destructive' }); return; }
    try {
      await criarEntregavel(cliente.id, projeto.id, { titulo: novo.titulo.trim(), frente: novo.frente || null, fase: novo.fase || null, ordem: entregas.length + 1 });
      setNovo({ titulo: '', frente: novo.frente, fase: novo.fase });
      await recarregar();
    } catch (err) { toast({ title: 'Não foi possível adicionar', description: err.message, variant: 'destructive' }); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Entregas do escopo</CardTitle>
        <CardDescription>{feitas} de {aplic} entregas concluídas. O cliente acompanha o andamento de cada uma.</CardDescription>
        <Progress value={aplic ? (feitas / aplic) * 100 : 0} className="h-2" />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground"><tr><th className="text-left p-2">#</th><th className="text-left p-2">Entrega</th><th className="text-left p-2">Frente</th><th className="text-left p-2">Fase</th><th className="text-left p-2">Situação</th><th className="text-left p-2">Observações</th><th className="p-2" /></tr></thead>
          <tbody className="divide-y divide-border">
            {entregas.map((e, i) => (
              <tr key={e.id} className={e.status === 'concluido' ? 'opacity-70' : ''}>
                <td className="p-2">{i + 1}</td><td className="p-2 max-w-[340px]">{e.titulo}</td><td className="p-2 text-xs">{e.frente}</td><td className="p-2 text-xs">{e.fase}</td>
                <td className="p-2"><select className={selectCls} value={e.status} onChange={(ev) => mudar(e, { status: ev.target.value })}>{Object.entries(STATUS_ENTREGA).map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></td>
                <td className="p-2"><Input className="h-8 text-xs min-w-[160px]" defaultValue={e.observacao || ''} onBlur={(ev) => { if (ev.target.value !== (e.observacao || '')) mudar(e, { observacao: ev.target.value }); }} /></td>
                <td className="p-2 whitespace-nowrap">
                  <button type="button" title={e.visivel_cliente ? 'Visível ao cliente' : 'Oculto do cliente'} className="text-muted-foreground hover:text-foreground mr-2" onClick={() => mudar(e, { visivel_cliente: !e.visivel_cliente })}>{e.visivel_cliente ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                  <button type="button" title="Excluir" className="text-muted-foreground hover:text-destructive" onClick={async () => { if (window.confirm('Excluir esta entrega?')) { await excluirEntregavel(e.id); recarregar(); } }}><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 rounded-md border border-dashed border-border p-3 grid grid-cols-1 md:grid-cols-[1fr_170px_200px_auto] gap-2 items-end">
          <div><Label className="text-xs">Entrega</Label><Input value={novo.titulo} onChange={(e) => setNovo({ ...novo, titulo: e.target.value })} /></div>
          <div><Label className="text-xs">Frente</Label><Input list="frentes-f5" value={novo.frente} onChange={(e) => setNovo({ ...novo, frente: e.target.value })} /><datalist id="frentes-f5">{frentes.map((f) => <option key={f} value={f} />)}</datalist></div>
          <div><Label className="text-xs">Fase</Label><Input value={novo.fase} onChange={(e) => setNovo({ ...novo, fase: e.target.value })} /></div>
          <Button onClick={adicionar}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ---------------- Aba ----------------
const ConsultoriaTab = ({ cliente, consultorNome }) => {
  const { toast } = useToast();
  const [projetos, setProjetos] = useState(null);
  const [projetoId, setProjetoId] = useState(null);
  const [tarefas, setTarefas] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [osAberta, setOsAberta] = useState(null);
  const [sub, setSub] = useState('cronograma');
  const [novoProj, setNovoProj] = useState({ nome: `Estruturação — ${cliente.nome}`, data_inicio: hojeISO(), horas_previstas: '' });
  const [criando, setCriando] = useState(false);

  const projeto = projetos?.find((p) => p.id === projetoId) || null;

  const carregarProjetos = useCallback(async () => {
    try {
      const ps = await listarProjetosF5(cliente.id);
      setProjetos(ps);
      setProjetoId((atual) => atual || ps[0]?.id || null);
    } catch (e) { toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' }); setProjetos([]); }
  }, [cliente.id, toast]);

  const carregarDados = useCallback(async () => {
    if (!projetoId) return;
    try {
      const [t, a, o, e] = await Promise.all([listarTarefasProjeto(projetoId), listarAgenda(cliente.id, projetoId), listarOS(cliente.id), listarEntregaveis(projetoId)]);
      setTarefas(t); setAgenda(a); setOrdens(o); setEntregas(e);
    } catch (err) { toast({ title: 'Erro ao carregar', description: err.message, variant: 'destructive' }); }
  }, [cliente.id, projetoId, toast]);

  useEffect(() => { carregarProjetos(); }, [carregarProjetos]);
  useEffect(() => { carregarDados(); }, [carregarDados]);

  const criarProjeto = async () => {
    if (!novoProj.nome.trim()) { toast({ title: 'Dê um nome ao projeto', variant: 'destructive' }); return; }
    setCriando(true);
    try {
      const p = await criarProjetoF5(cliente.id, { nome: novoProj.nome.trim(), data_inicio: novoProj.data_inicio || null, horas_previstas: novoProj.horas_previstas === '' ? null : Number(novoProj.horas_previstas) });
      setProjetos([p]); setProjetoId(p.id);
    } catch (e) { toast({ title: 'Não foi possível criar o projeto', description: e.message, variant: 'destructive' }); }
    finally { setCriando(false); }
  };

  // abre (ou cria já preenchida) a OS de um compromisso da agenda
  const abrirOSdaAgenda = (a) => {
    setSub('os');
    const existente = a.os_id ? ordens.find((o) => o.id === a.os_id) : null;
    if (existente) { setOsAberta({ ...existente, agenda_id: a.id }); return; }
    const doDia = tarefas.filter((t) => t.dia_plano && t.dia_plano === a.dia_plano);
    setOsAberta({
      agenda_id: a.id, data: a.data, inicio: a.hora_inicio?.slice(0, 5) || '', termino: a.hora_fim?.slice(0, 5) || '',
      fase: doDia[0]?.fase || '', objetivo: a.titulo, status: 'realizada', publicada: false
    });
  };

  if (projetos === null) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!projeto) {
    return (
      <Card className="max-w-xl">
        <CardHeader><CardTitle className="text-base">Novo projeto de Consultoria F5</CardTitle><CardDescription>Crie o projeto e monte o cronograma, a agenda de visitas e as entregas.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nome do projeto</Label><Input value={novoProj.nome} onChange={(e) => setNovoProj({ ...novoProj, nome: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Início</Label><Input type="date" value={novoProj.data_inicio} onChange={(e) => setNovoProj({ ...novoProj, data_inicio: e.target.value })} /></div>
            <div><Label>Horas previstas</Label><Input type="number" min="0" value={novoProj.horas_previstas} onChange={(e) => setNovoProj({ ...novoProj, horas_previstas: e.target.value })} /></div>
          </div>
          <Button onClick={criarProjeto} disabled={criando}>{criando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar projeto</Button>
        </CardContent>
      </Card>
    );
  }

  const feitas = tarefas.filter((t) => t.status === 'concluido').length;
  const aplic = tarefas.filter((t) => t.status !== 'na').length;
  const entFeitas = entregas.filter((e) => e.status === 'concluido').length;
  const entAplic = entregas.filter((e) => e.status !== 'na').length;
  const proxima = agenda.find((a) => a.data >= hojeISO() && a.status === 'agendada');

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><div className="text-xs uppercase text-muted-foreground">Projeto</div><div className="font-medium">{projeto.nome}</div><div className="text-xs text-muted-foreground">início {formatarData(projeto.data_inicio)}{projeto.horas_previstas ? ` · ${projeto.horas_previstas}h` : ''}</div></div>
          <div><div className="text-xs uppercase text-muted-foreground">Atividades</div><div className="font-medium">{feitas}/{aplic}</div><Progress value={aplic ? (feitas / aplic) * 100 : 0} className="h-1.5 mt-1" /></div>
          <div><div className="text-xs uppercase text-muted-foreground">Entregas</div><div className="font-medium">{entFeitas}/{entAplic}</div><Progress value={entAplic ? (entFeitas / entAplic) * 100 : 0} className="h-1.5 mt-1" /></div>
          <div><div className="text-xs uppercase text-muted-foreground">Próxima visita</div><div className="font-medium">{proxima ? `${formatarData(proxima.data)} ${diaDaSemana(proxima.data)}` : '—'}</div><div className="text-xs text-muted-foreground truncate">{proxima?.titulo}</div></div>
        </CardContent>
      </Card>

      <Tabs value={sub} onValueChange={(v) => { setSub(v); if (v !== 'os') setOsAberta(null); }}>
        <TabsList>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="os">OS de visita</TabsTrigger>
          <TabsTrigger value="entregas">Entregas</TabsTrigger>
        </TabsList>
        <TabsContent value="cronograma" className="mt-4"><Cronograma cliente={cliente} projeto={projeto} tarefas={tarefas} recarregar={carregarDados} /></TabsContent>
        <TabsContent value="agenda" className="mt-4"><Agenda cliente={cliente} projeto={projeto} tarefas={tarefas} agenda={agenda} recarregar={carregarDados} onAbrirOS={abrirOSdaAgenda} /></TabsContent>
        <TabsContent value="os" className="mt-4"><OrdensServico cliente={cliente} projeto={projeto} ordens={ordens} recarregar={carregarDados} osAberta={osAberta} setOsAberta={setOsAberta} consultorNome={consultorNome} /></TabsContent>
        <TabsContent value="entregas" className="mt-4"><Entregas cliente={cliente} projeto={projeto} entregas={entregas} recarregar={carregarDados} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default ConsultoriaTab;

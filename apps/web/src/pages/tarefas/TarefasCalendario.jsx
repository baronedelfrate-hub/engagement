import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, CheckSquare, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { tarefasAbertas, listarUsuarios, linkGoogleAgenda, hojeISO } from '@/lib/tarefasService';
import { listarEventos, criarEvento, atualizarEvento, excluirEvento, linkGoogleEvento, somaDias, TIPOS_EVENTO } from '@/lib/dashboardData';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm w-full';
const vazio = (data) => ({ titulo: '', tipo: 'compromisso', data_inicio: data, hora_inicio: '', hora_fim: '', dia_inteiro: false, local: '', descricao: '', responsavel_id: '' });

// Dias exibidos: do domingo da semana do dia 1 até o sábado da semana do último dia do mês.
const diasDoMes = (ano, mes) => {
  const primeiro = new Date(Date.UTC(ano, mes, 1));
  const ultimo = new Date(Date.UTC(ano, mes + 1, 0));
  const ini = new Date(primeiro); ini.setUTCDate(1 - primeiro.getUTCDay());
  const fim = new Date(ultimo); fim.setUTCDate(ultimo.getUTCDate() + (6 - ultimo.getUTCDay()));
  const dias = [];
  for (const d = new Date(ini); d <= fim; d.setUTCDate(d.getUTCDate() + 1)) dias.push(d.toISOString().slice(0, 10));
  return dias;
};

const TarefasCalendario = () => {
  const { company_id: companyId, user, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const hoje = hojeISO();
  const [ref, setRef] = useState({ ano: Number(hoje.slice(0, 4)), mes: Number(hoje.slice(5, 7)) - 1 });
  const [eventos, setEventos] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [soMinhas, setSoMinhas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const dias = useMemo(() => diasDoMes(ref.ano, ref.mes), [ref]);

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [ev, tar, us] = await Promise.all([listarEventos(companyId, dias[0], dias[dias.length - 1]), tarefasAbertas(companyId), listarUsuarios().catch(() => [])]);
      setEventos(ev); setTarefas(tar.filter((t) => t.prazo && t.prazo >= dias[0] && t.prazo <= dias[dias.length - 1])); setUsuarios(us);
    } catch (e) { toast({ title: 'Erro ao carregar o calendário', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, dias, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const porDia = useMemo(() => {
    const m = {};
    const poe = (d, i) => { (m[d] = m[d] || []).push(i); };
    eventos.filter((e) => !soMinhas || !e.responsavel_id || e.responsavel_id === user?.id).forEach((e) => poe(e.data_inicio, { chave: `e${e.id}`, tipo: 'evento', hora: e.dia_inteiro || !e.hora_inicio ? '' : e.hora_inicio.slice(0, 5), titulo: e.titulo, original: e }));
    tarefas.filter((t) => !soMinhas || t.responsavel_id === user?.id).forEach((t) => poe(t.prazo, { chave: `t${t.id}`, tipo: 'tarefa', hora: '', titulo: t.titulo, original: t, atrasada: t.prazo < hoje }));
    Object.values(m).forEach((l) => l.sort((a, b) => (a.tipo === b.tipo ? a.hora.localeCompare(b.hora) : a.tipo === 'evento' ? -1 : 1)));
    return m;
  }, [eventos, tarefas, soMinhas, user, hoje]);

  const mover = (n) => setRef((r) => { const t = r.ano * 12 + r.mes + n; return { ano: Math.floor(t / 12), mes: t % 12 }; });

  const abrir = (i) => {
    if (i.tipo === 'tarefa') { navigate(`/tarefas/${i.original.quadro_id}`); return; }
    const o = i.original;
    setForm({ ...vazio(hoje), ...o, hora_inicio: o.hora_inicio?.slice(0, 5) || '', hora_fim: o.hora_fim?.slice(0, 5) || '', responsavel_id: o.responsavel_id || '', local: o.local || '', descricao: o.descricao || '' });
  };

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

  const excluir = async () => {
    if (!window.confirm('Excluir este compromisso?')) return;
    try { await excluirEvento(form.id); setForm(null); await carregar(); }
    catch (e) { toast({ title: 'Não foi possível excluir', description: e.message, variant: 'destructive' }); }
  };

  if (!authLoading && !companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver o calendário dela.</p>;

  return (
    <>
      <Helmet><title>Calendário | Tarefas</title></Helmet>
      <PageHeader title="Calendário" description="Compromissos, reuniões, eventos e prazos das tarefas no mesmo lugar." action={<Button onClick={() => setForm(vazio(hoje))}><Plus className="w-4 h-4 mr-2" /> Novo compromisso</Button>} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => mover(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => mover(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setRef({ ano: Number(hoje.slice(0, 4)), mes: Number(hoje.slice(5, 7)) - 1 })}>Hoje</Button>
        </div>
        <h2 className="text-lg font-semibold">{MESES[ref.mes]} de {ref.ano}</h2>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <label className="flex items-center gap-2 text-sm ml-auto"><Checkbox checked={soMinhas} onCheckedChange={(v) => setSoMinhas(v === true)} /> Só o meu</label>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
            {SEMANA.map((s) => <div key={s} className="px-2 py-2">{s}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {dias.map((d) => {
              const fora = Number(d.slice(5, 7)) - 1 !== ref.mes;
              const itens = porDia[d] || [];
              return (
                <div key={d} className={`min-h-[110px] border-b border-r p-1.5 cursor-pointer hover:bg-muted/20 ${fora ? 'bg-muted/30' : ''}`} onClick={() => setForm(vazio(d))}>
                  <div className={`text-xs mb-1 w-6 h-6 flex items-center justify-center rounded-full ${d === hoje ? 'text-white font-bold' : fora ? 'text-muted-foreground' : ''}`} style={d === hoje ? { background: '#FE6102' } : undefined}>{Number(d.slice(8, 10))}</div>
                  <div className="space-y-1">
                    {itens.slice(0, 3).map((i) => (
                      <button key={i.chave} type="button" onClick={(e) => { e.stopPropagation(); abrir(i); }}
                        className={`w-full text-left text-[11px] leading-tight rounded px-1.5 py-1 truncate flex items-center gap-1 ${i.tipo === 'tarefa' ? (i.atrasada ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300') : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'}`}>
                        {i.tipo === 'tarefa' && <CheckSquare className="h-3 w-3 shrink-0" />}
                        <span className="truncate">{i.hora ? `${i.hora} ` : ''}{i.titulo}</span>
                      </button>
                    ))}
                    {itens.length > 3 && <div className="text-[11px] text-muted-foreground px-1">+{itens.length - 3} mais</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent></Card>
      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-orange-200" /> Compromisso</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blue-200" /> Prazo de tarefa</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-200" /> Tarefa atrasada</span>
      </div>

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
              {form.titulo && form.data_inicio && <a href={linkGoogleEvento(form)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><CalendarPlus className="h-4 w-4" /> Adicionar ao Google Agenda</a>}
            </div>
          )}
          <DialogFooter className="gap-2">
            {form?.id && <Button variant="ghost" className="text-destructive mr-auto" onClick={excluir}><Trash2 className="w-4 h-4 mr-1" /> Excluir</Button>}
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TarefasCalendario;

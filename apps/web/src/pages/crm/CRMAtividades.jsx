import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Loader2, Plus, Check, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { TIPOS_ATIVIDADE, hojeISO, listarAtividades, criarAtividade, atualizarAtividade, excluirAtividade, listarOportunidades } from '@/lib/crmService';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm w-full';
const FILTROS = [['atrasadas', 'Atrasadas'], ['hoje', 'Hoje'], ['proximas', 'Próximas'], ['concluidas', 'Concluídas']];
const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : 'sem data');

const CRMAtividades = () => {
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const [atividades, setAtividades] = useState([]);
  const [ops, setOps] = useState([]);
  const [filtro, setFiltro] = useState('atrasadas');
  const [loading, setLoading] = useState(true);
  const [nova, setNova] = useState(null);
  const hoje = hojeISO();

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try { const [a, o] = await Promise.all([listarAtividades(companyId), listarOportunidades(companyId)]); setAtividades(a); setOps(o); }
    catch (e) { toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, toast]);

  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const pend = atividades.filter((a) => !a.concluida_em);
  const grupos = {
    atrasadas: pend.filter((a) => a.data_prevista && a.data_prevista < hoje),
    hoje: pend.filter((a) => a.data_prevista === hoje),
    proximas: pend.filter((a) => !a.data_prevista || a.data_prevista > hoje),
    concluidas: atividades.filter((a) => a.concluida_em).sort((a, b) => b.concluida_em.localeCompare(a.concluida_em))
  };
  const lista = grupos[filtro];

  const salvar = async () => {
    if (!nova.titulo.trim()) { toast({ title: 'Descreva a atividade', variant: 'destructive' }); return; }
    try {
      const op = ops.find((o) => o.id === nova.oportunidade_id);
      await criarAtividade(companyId, { tipo: nova.tipo, titulo: nova.titulo.trim(), data_prevista: nova.data_prevista || null, oportunidade_id: nova.oportunidade_id || null, conta_id: op?.conta_id || null });
      setNova(null); carregar();
    } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
  };

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver o CRM dela.</p>;

  return (
    <>
      <Helmet><title>Atividades | CRM</title></Helmet>
      <PageHeader title="Atividades" description="Tarefas e follow-ups das suas oportunidades. O que está atrasado aparece primeiro." action={<Button onClick={() => setNova({ tipo: 'tarefa', titulo: '', data_prevista: hoje, oportunidade_id: '' })}><Plus className="w-4 h-4 mr-2" /> Nova atividade</Button>} />
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTROS.map(([id, r]) => (
          <button key={id} type="button" onClick={() => setFiltro(id)} className={`px-3 py-1.5 rounded-md border text-sm ${filtro === id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}>
            {r} <span className="opacity-80">({grupos[id].length})</span>
          </button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : lista.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Nada por aqui.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {lista.map((a) => (
            <div key={a.id} className="p-3 flex items-center gap-3 text-sm">
              <button type="button" onClick={async () => { await atualizarAtividade(a.id, { concluida_em: a.concluida_em ? null : new Date().toISOString() }); carregar(); }} className={`h-5 w-5 shrink-0 rounded border flex items-center justify-center ${a.concluida_em ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-border'}`}>{a.concluida_em && <Check className="h-3 w-3" />}</button>
              <Badge variant="secondary" className="shrink-0">{TIPOS_ATIVIDADE[a.tipo]}</Badge>
              <div className="flex-1 min-w-0"><div className={a.concluida_em ? 'line-through text-muted-foreground' : 'font-medium'}>{a.titulo}</div><div className="text-xs text-muted-foreground truncate">{[a.conta?.nome, a.oportunidade?.titulo].filter(Boolean).join(' · ')}</div></div>
              <span className={`text-xs whitespace-nowrap ${filtro === 'atrasadas' ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>{fmt(a.data_prevista)}</span>
              <button type="button" className="text-muted-foreground hover:text-destructive" onClick={async () => { await excluirAtividade(a.id); carregar(); }}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!nova} onOpenChange={(o) => { if (!o) setNova(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova atividade</DialogTitle></DialogHeader>
          {nova && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo</Label><select className={sel} value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value })}>{Object.entries(TIPOS_ATIVIDADE).map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></div>
                <div><Label>Data</Label><Input type="date" value={nova.data_prevista} onChange={(e) => setNova({ ...nova, data_prevista: e.target.value })} /></div>
              </div>
              <div><Label>O que fazer</Label><Input value={nova.titulo} onChange={(e) => setNova({ ...nova, titulo: e.target.value })} /></div>
              <div><Label>Oportunidade (opcional)</Label><select className={sel} value={nova.oportunidade_id} onChange={(e) => setNova({ ...nova, oportunidade_id: e.target.value })}><option value="">—</option>{ops.filter((o) => !['ganho', 'perdido'].includes(o.etapa)).map((o) => <option key={o.id} value={o.id}>{o.titulo} — {o.conta?.nome}</option>)}</select></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setNova(null)}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CRMAtividades;

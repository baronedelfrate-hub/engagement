import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2, FilePlus2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  ETAPAS, TIPOS_ATIVIDADE, STATUS_PROPOSTA, hojeISO, moeda, listarContatos, criarConta, criarOportunidade, atualizarOportunidade,
  moverEtapa, excluirOportunidade, listarAtividades, criarAtividade, atualizarAtividade, excluirAtividade, listarPropostas
} from '@/lib/crmService';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm w-full';
const SERVICOS = [['', '—'], ['bpo', 'BPO E5'], ['consultoria', 'Consultoria F5'], ['outro', 'Outro']];

// Oportunidade: dados, etapa, atividades (histórico e follow-up) e propostas. `op` nulo = nova.
const OportunidadeDialog = ({ aberto, op, contas, companyId, onFechar, onMudou, contaInicial }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState(null);
  const [contatos, setContatos] = useState([]);
  const [novaConta, setNovaConta] = useState('');
  const [atividades, setAtividades] = useState([]);
  const [propostas, setPropostas] = useState([]);
  const [nova, setNova] = useState({ tipo: 'tarefa', titulo: '', data_prevista: hojeISO() });
  const [salvando, setSalvando] = useState(false);

  const carregarFilhos = useCallback(async (o) => {
    if (!o?.id) { setAtividades([]); setPropostas([]); return; }
    try {
      const [a, p] = await Promise.all([listarAtividades(companyId, { oportunidadeId: o.id }), listarPropostas(companyId)]);
      setAtividades(a);
      setPropostas(p.filter((x) => x.oportunidade?.id === o.id));
    } catch (e) { toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' }); }
  }, [companyId, toast]);

  useEffect(() => {
    if (!aberto) return;
    const base = op || { titulo: '', conta_id: contaInicial || '', contato_id: '', etapa: 'lead', valor: '', probabilidade: 10, previsao_fechamento: '', origem: '', servico: '', motivo_perda: '' };
    setF({ ...base, conta_id: base.conta_id || '', contato_id: base.contato_id || '', previsao_fechamento: base.previsao_fechamento || '', servico: base.servico || '', origem: base.origem || '', motivo_perda: base.motivo_perda || '', valor: base.valor ?? '' });
    setNovaConta('');
    carregarFilhos(op);
  }, [aberto, op, contaInicial, carregarFilhos]);

  useEffect(() => {
    if (!aberto || !f?.conta_id) { setContatos([]); return; }
    listarContatos(companyId, f.conta_id).then(setContatos).catch(() => setContatos([]));
  }, [aberto, f?.conta_id, companyId]);

  if (!f) return null;
  const muda = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const salvar = async () => {
    if (!f.titulo.trim()) { toast({ title: 'Dê um título à oportunidade', variant: 'destructive' }); return; }
    setSalvando(true);
    try {
      let contaId = f.conta_id;
      if (!contaId && novaConta.trim()) contaId = (await criarConta(companyId, { nome: novaConta.trim() })).id;
      if (!contaId) { toast({ title: 'Escolha ou crie a conta (empresa)', variant: 'destructive' }); setSalvando(false); return; }
      const dados = {
        titulo: f.titulo.trim(), conta_id: contaId, contato_id: f.contato_id || null, valor: Number(f.valor) || 0,
        previsao_fechamento: f.previsao_fechamento || null, origem: f.origem || null, servico: f.servico || null,
        probabilidade: Number(f.probabilidade) || 0, motivo_perda: f.motivo_perda || null
      };
      if (op?.id) {
        if (f.etapa !== op.etapa) await moverEtapa(op.id, f.etapa, { ...dados, probabilidade: Number(f.probabilidade) || ETAPAS.find((e) => e.id === f.etapa).prob });
        else await atualizarOportunidade(op.id, dados);
      } else {
        await criarOportunidade(companyId, { ...dados, etapa: f.etapa, probabilidade: ETAPAS.find((e) => e.id === f.etapa).prob });
      }
      toast({ title: 'Oportunidade salva' });
      onMudou();
      onFechar();
    } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };

  const addAtividade = async () => {
    if (!nova.titulo.trim() || !op?.id) return;
    try {
      await criarAtividade(companyId, { oportunidade_id: op.id, conta_id: op.conta_id, tipo: nova.tipo, titulo: nova.titulo.trim(), data_prevista: nova.data_prevista || null, ...(nova.tipo === 'nota' ? { concluida_em: new Date().toISOString() } : {}) });
      setNova({ tipo: 'tarefa', titulo: '', data_prevista: hojeISO() });
      await carregarFilhos(op);
      onMudou();
    } catch (e) { toast({ title: 'Não foi possível adicionar', description: e.message, variant: 'destructive' }); }
  };

  const concluir = async (a) => {
    try { await atualizarAtividade(a.id, { concluida_em: a.concluida_em ? null : new Date().toISOString() }); await carregarFilhos(op); onMudou(); }
    catch (e) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  const hoje = hojeISO();
  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) onFechar(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{op?.id ? 'Oportunidade' : 'Nova oportunidade'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título *</Label><Input value={f.titulo} onChange={(e) => muda('titulo', e.target.value)} placeholder="ex.: BPO Financeiro — Clínica Exemplo" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Conta (empresa) *</Label>
              <select className={sel} value={f.conta_id} onChange={(e) => { muda('conta_id', e.target.value); muda('contato_id', ''); }}>
                <option value="">— nova conta abaixo —</option>
                {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              {!f.conta_id && <Input className="mt-2" placeholder="Nome da nova empresa" value={novaConta} onChange={(e) => setNovaConta(e.target.value)} />}
            </div>
            <div>
              <Label>Contato</Label>
              <select className={sel} value={f.contato_id} onChange={(e) => muda('contato_id', e.target.value)} disabled={!f.conta_id}>
                <option value="">—</option>
                {contatos.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.cargo ? ` — ${c.cargo}` : ''}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label>Valor (R$)</Label><Input type="number" min="0" step="0.01" value={f.valor} onChange={(e) => muda('valor', e.target.value)} /></div>
            <div><Label>Probabilidade (%)</Label><Input type="number" min="0" max="100" value={f.probabilidade} onChange={(e) => muda('probabilidade', e.target.value)} /></div>
            <div><Label>Previsão de fechamento</Label><Input type="date" value={f.previsao_fechamento} onChange={(e) => muda('previsao_fechamento', e.target.value)} /></div>
            <div><Label>Serviço</Label><select className={sel} value={f.servico} onChange={(e) => muda('servico', e.target.value)}>{SERVICOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Etapa do funil</Label><select className={sel} value={f.etapa} onChange={(e) => { muda('etapa', e.target.value); muda('probabilidade', ETAPAS.find((x) => x.id === e.target.value).prob); }}>{ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.rotulo}</option>)}</select></div>
            <div><Label>Origem do contato</Label><Input value={f.origem} onChange={(e) => muda('origem', e.target.value)} placeholder="indicação, site, evento, Instagram..." /></div>
          </div>
          {f.etapa === 'perdido' && <div><Label>Motivo da perda</Label><Textarea rows={2} value={f.motivo_perda} onChange={(e) => muda('motivo_perda', e.target.value)} /></div>}
        </div>

        {op?.id && (
          <>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Propostas</div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/crm/propostas/nova?oportunidade=${op.id}`)}><FilePlus2 className="w-4 h-4 mr-1" /> Nova proposta</Button>
              </div>
              {propostas.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma proposta para esta oportunidade.</p> : (
                <div className="divide-y divide-border">
                  {propostas.map((p) => (
                    <div key={p.id} className="py-2 flex items-center justify-between text-sm cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/crm/propostas/${p.id}`)}>
                      <span className="font-medium">{p.numero}{p.versao > 1 ? ` v${p.versao}` : ''} <span className="text-muted-foreground font-normal">· {p.titulo}</span></span>
                      <span className="flex items-center gap-2"><span className="text-muted-foreground">{moeda(p.valor_total)}</span><Badge variant="outline">{STATUS_PROPOSTA[p.status]}</Badge></span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-3">
              <div className="text-sm font-semibold mb-2">Atividades e histórico</div>
              <div className="grid grid-cols-1 md:grid-cols-[130px_1fr_150px_auto] gap-2 mb-3">
                <select className={sel} value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value })}>{Object.entries(TIPOS_ATIVIDADE).map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select>
                <Input placeholder="O que fazer ou o que aconteceu" value={nova.titulo} onChange={(e) => setNova({ ...nova, titulo: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') addAtividade(); }} />
                <Input type="date" value={nova.data_prevista} onChange={(e) => setNova({ ...nova, data_prevista: e.target.value })} />
                <Button onClick={addAtividade}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
              </div>
              {atividades.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma atividade registrada.</p> : (
                <div className="divide-y divide-border">
                  {atividades.map((a) => {
                    const atrasada = !a.concluida_em && a.data_prevista && a.data_prevista < hoje;
                    return (
                      <div key={a.id} className="py-2 flex items-center gap-3 text-sm">
                        <button type="button" onClick={() => concluir(a)} className={`h-5 w-5 shrink-0 rounded border flex items-center justify-center ${a.concluida_em ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-border'}`}>{a.concluida_em && <Check className="h-3 w-3" />}</button>
                        <Badge variant="secondary" className="shrink-0">{TIPOS_ATIVIDADE[a.tipo]}</Badge>
                        <span className={`flex-1 ${a.concluida_em ? 'line-through text-muted-foreground' : ''}`}>{a.titulo}</span>
                        <span className={`text-xs whitespace-nowrap ${atrasada ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>{a.data_prevista ? a.data_prevista.split('-').reverse().join('/') : ''}</span>
                        <button type="button" className="text-muted-foreground hover:text-destructive" onClick={async () => { await excluirAtividade(a.id); carregarFilhos(op); onMudou(); }}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        <DialogFooter className="gap-2">
          {op?.id && <Button variant="ghost" className="text-destructive mr-auto" onClick={async () => { if (window.confirm('Excluir esta oportunidade e seu histórico?')) { try { await excluirOportunidade(op.id); onMudou(); onFechar(); } catch (e) { toast({ title: 'Não foi possível excluir', description: e.message, variant: 'destructive' }); } } }}>Excluir</Button>}
          <Button variant="outline" onClick={onFechar}>Fechar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OportunidadeDialog;

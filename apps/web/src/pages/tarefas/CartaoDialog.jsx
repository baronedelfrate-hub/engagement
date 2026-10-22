import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, CalendarPlus, Check, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  PRIORIDADES, atualizarCartao, excluirCartao, moverCartao, ordemEntre, listarComentarios, criarComentario, linkGoogleAgenda, iniciais
} from '@/lib/tarefasService';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm w-full';
const fmtHora = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const CartaoDialog = ({ aberto, cartao, colunas, cartoes, usuarios, quadro, companyId, userId, onFechar, onMudou }) => {
  const { toast } = useToast();
  const [f, setF] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [novoItem, setNovoItem] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto || !cartao) return;
    setF({ ...cartao, descricao: cartao.descricao || '', responsavel_id: cartao.responsavel_id || '', prazo: cartao.prazo || '', checklist: cartao.checklist || [] });
    setNovoComentario(''); setNovoItem('');
    listarComentarios(cartao.id).then(setComentarios).catch(() => setComentarios([]));
  }, [aberto, cartao]);

  if (!f) return null;
  const muda = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const nomeDe = (id) => usuarios.find((u) => u.id === id)?.nome || '';
  const feitos = f.checklist.filter((i) => i.feito).length;
  const colunaDone = colunas.find((c) => c.concluida);
  const colunaAtual = colunas.find((c) => c.id === f.coluna_id);

  const salvar = async (extra = {}) => {
    if (!f.titulo.trim()) { toast({ title: 'Dê um título à tarefa', variant: 'destructive' }); return false; }
    setSalvando(true);
    try {
      await atualizarCartao(f.id, {
        titulo: f.titulo.trim(), descricao: f.descricao || null, responsavel_id: f.responsavel_id || null, prazo: f.prazo || null,
        prioridade: f.prioridade, checklist: f.checklist, ...extra
      });
      onMudou();
      return true;
    } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); return false; }
    finally { setSalvando(false); }
  };

  const concluir = async () => {
    if (!colunaDone) { toast({ title: 'Marque uma coluna do quadro como "concluída" para usar este botão', variant: 'destructive' }); return; }
    if (!(await salvar())) return;
    const naColuna = cartoes.filter((c) => c.coluna_id === colunaDone.id && c.id !== f.id);
    try { await moverCartao(f, colunaDone, ordemEntre(naColuna[naColuna.length - 1]?.ordem, undefined)); onMudou(); onFechar(); }
    catch (e) { toast({ title: 'Não foi possível concluir', description: e.message, variant: 'destructive' }); }
  };

  const comentar = async () => {
    if (!novoComentario.trim()) return;
    try { await criarComentario(companyId, userId, f.id, novoComentario.trim()); setNovoComentario(''); setComentarios(await listarComentarios(f.id)); }
    catch (e) { toast({ title: 'Não foi possível comentar', description: e.message, variant: 'destructive' }); }
  };

  const agenda = linkGoogleAgenda({ ...f, descricao: f.descricao }, quadro?.nome);

  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) onFechar(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Tarefa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Título</Label><Input value={f.titulo} onChange={(e) => muda('titulo', e.target.value)} /></div>
          <div><Label className="text-xs">Descrição</Label><Textarea rows={3} value={f.descricao} onChange={(e) => muda('descricao', e.target.value)} placeholder="Detalhes, links, o que precisa ser feito…" /></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label className="text-xs">Responsável</Label>
              <select className={sel} value={f.responsavel_id} onChange={(e) => muda('responsavel_id', e.target.value)}><option value="">— ninguém —</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
            <div><Label className="text-xs">Prazo</Label><Input type="date" value={f.prazo} onChange={(e) => muda('prazo', e.target.value)} /></div>
            <div><Label className="text-xs">Prioridade</Label>
              <select className={sel} value={f.prioridade} onChange={(e) => muda('prioridade', e.target.value)}>{Object.entries(PRIORIDADES).map(([v, p]) => <option key={v} value={v}>{p.rotulo}</option>)}</select></div>
          </div>
          <div className="text-xs text-muted-foreground">Coluna atual: <span className="font-medium">{colunaAtual?.nome}</span>{f.concluido_em ? ` · concluída em ${fmtHora(f.concluido_em)}` : ''}</div>

          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2"><Label className="text-xs">Checklist{f.checklist.length ? ` (${feitos}/${f.checklist.length})` : ''}</Label></div>
            {f.checklist.map((i, idx) => (
              <div key={idx} className="flex items-center gap-2 py-1 text-sm">
                <button type="button" onClick={() => muda('checklist', f.checklist.map((x, k) => (k === idx ? { ...x, feito: !x.feito } : x)))} className={`h-5 w-5 shrink-0 rounded border flex items-center justify-center ${i.feito ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-border'}`}>{i.feito && <Check className="h-3 w-3" />}</button>
                <span className={`flex-1 ${i.feito ? 'line-through text-muted-foreground' : ''}`}>{i.texto}</span>
                <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => muda('checklist', f.checklist.filter((_, k) => k !== idx))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="flex gap-2 mt-1"><Input placeholder="Novo item" value={novoItem} onChange={(e) => setNovoItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && novoItem.trim()) { muda('checklist', [...f.checklist, { texto: novoItem.trim(), feito: false }]); setNovoItem(''); } }} /><Button variant="outline" size="sm" onClick={() => { if (novoItem.trim()) { muda('checklist', [...f.checklist, { texto: novoItem.trim(), feito: false }]); setNovoItem(''); } }}><Plus className="w-4 h-4" /></Button></div>
          </div>

          <div className="border-t border-border pt-3">
            <Label className="text-xs">Comentários</Label>
            <div className="space-y-2 my-2">
              {comentarios.length === 0 && <p className="text-xs text-muted-foreground">Nenhum comentário.</p>}
              {comentarios.map((c) => (
                <div key={c.id} className="rounded-md bg-muted/40 p-2 text-sm"><div className="text-xs text-muted-foreground mb-0.5">{nomeDe(c.autor_id) || 'Alguém'} · {fmtHora(c.created_at)}</div>{c.texto}</div>
              ))}
            </div>
            <div className="flex gap-2"><Input placeholder="Escreva um comentário…" value={novoComentario} onChange={(e) => setNovoComentario(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') comentar(); }} /><Button variant="outline" size="sm" onClick={comentar}><Send className="w-4 h-4" /></Button></div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap sm:justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" className="text-destructive" onClick={async () => { if (window.confirm('Excluir esta tarefa?')) { try { await excluirCartao(f.id); onMudou(); onFechar(); } catch (e) { toast({ title: 'Não foi possível excluir', description: e.message, variant: 'destructive' }); } } }}>Excluir</Button>
            {agenda ? <Button variant="outline" asChild><a href={agenda} target="_blank" rel="noopener noreferrer"><CalendarPlus className="w-4 h-4 mr-2" /> Adicionar ao Google Agenda</a></Button> : <Button variant="outline" disabled title="Defina um prazo para poder adicionar à agenda"><CalendarPlus className="w-4 h-4 mr-2" /> Google Agenda</Button>}
          </div>
          <div className="flex gap-2">
            {!f.concluido_em && <Button variant="outline" onClick={concluir}><Check className="w-4 h-4 mr-2" /> Concluir</Button>}
            <Button variant="outline" onClick={onFechar}>Fechar</Button>
            <Button onClick={async () => { if (await salvar()) onFechar(); }} disabled={salvando}>{salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CartaoDialog;

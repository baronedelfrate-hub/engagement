import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Loader2, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { listarCatalogo, criarCatalogo, atualizarCatalogo, excluirCatalogo, moeda } from '@/lib/crmService';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm w-full';
const TIPOS = { bpo: 'BPO E5', consultoria: 'Consultoria F5', outro: 'Outro' };

const CRMCatalogo = () => {
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try { setLista(await listarCatalogo(companyId)); } catch (e) { toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' }); } finally { setLoading(false); }
  }, [companyId, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const salvar = async () => {
    if (!item.nome.trim()) { toast({ title: 'Informe o nome', variant: 'destructive' }); return; }
    try {
      const dados = { nome: item.nome.trim(), tipo: item.tipo, descricao: item.descricao || null, preco: Number(item.preco) || 0, recorrente: !!item.recorrente, ativo: !!item.ativo };
      if (item.id) await atualizarCatalogo(item.id, dados); else await criarCatalogo(companyId, dados);
      setItem(null); carregar();
    } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
  };

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver o CRM dela.</p>;

  return (
    <>
      <Helmet><title>Catálogo | CRM</title></Helmet>
      <PageHeader title="Catálogo de serviços" description="Os serviços e planos que você vende, com preço. Eles entram nas propostas com um clique." action={<Button onClick={() => setItem({ nome: '', tipo: 'outro', descricao: '', preco: '', recorrente: false, ativo: true })}><Plus className="w-4 h-4 mr-2" /> Novo item</Button>} />
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Serviço</th><th className="text-left p-3">Tipo</th><th className="text-right p-3">Preço</th><th className="text-left p-3">Cobrança</th><th className="text-left p-3">Situação</th></tr></thead>
            <tbody className="divide-y divide-border">
              {lista.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setItem({ ...c, preco: c.preco ?? '' })}>
                  <td className="p-3"><div className="font-medium">{c.nome}</div><div className="text-xs text-muted-foreground max-w-[520px] truncate">{c.descricao}</div></td>
                  <td className="p-3">{TIPOS[c.tipo]}</td>
                  <td className="p-3 text-right">{Number(c.preco) ? moeda(c.preco) : <span className="text-muted-foreground">sob proposta</span>}</td>
                  <td className="p-3 text-xs">{c.recorrente ? 'mensal' : 'projeto'}</td>
                  <td className="p-3">{c.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</td>
                </tr>
              ))}
              {lista.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum item. Cadastre os serviços que você vende.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!item} onOpenChange={(o) => { if (!o) setItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{item?.id ? 'Editar item' : 'Novo item'}</DialogTitle></DialogHeader>
          {item && (
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={item.nome} onChange={(e) => setItem({ ...item, nome: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea rows={3} value={item.descricao || ''} onChange={(e) => setItem({ ...item, descricao: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo</Label><select className={sel} value={item.tipo} onChange={(e) => setItem({ ...item, tipo: e.target.value })}>{Object.entries(TIPOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></div>
                <div><Label>Preço (R$)</Label><Input type="number" min="0" step="0.01" value={item.preco} onChange={(e) => setItem({ ...item, preco: e.target.value })} /></div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!item.recorrente} onCheckedChange={(v) => setItem({ ...item, recorrente: v === true })} /> cobrança mensal (recorrente)</label>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!item.ativo} onCheckedChange={(v) => setItem({ ...item, ativo: v === true })} /> ativo</label>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {item?.id && <Button variant="ghost" className="text-destructive mr-auto" onClick={async () => { if (window.confirm('Excluir este item?')) { try { await excluirCatalogo(item.id); setItem(null); carregar(); } catch (e) { toast({ title: 'Não foi possível excluir', description: e.message, variant: 'destructive' }); } } }}>Excluir</Button>}
            <Button variant="outline" onClick={() => setItem(null)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CRMCatalogo;

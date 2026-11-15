import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { Loader2, Coins } from 'lucide-react';

const hoje = () => new Date().toISOString().split('T')[0];
const vazia = () => ({ tipo: 'pagar', entidadeId: 'none', valor: '', data: hoje(), categoriaId: 'none', subcategoriaId: 'none', centroCustoId: 'none', observacoes: '' });
const nulo = (v) => (v === 'none' ? null : v);

// Cria o título do adiantamento; depois é só dar a baixa normal (Baixar) para registrar o dinheiro que saiu/entrou.
const AdiantamentoDialog = ({ open, onOpenChange, onSaved }) => {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const dropdowns = useFinanceiroDropdowns();
  const [form, setForm] = useState(vazia());
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm(vazia()); }, [open]);
  const set = (c) => (v) => setForm((f) => ({ ...f, [c]: v }));
  const entidades = form.tipo === 'receber' ? dropdowns.clientes : dropdowns.fornecedores;
  const subs = dropdowns.subcategorias.filter((s) => form.categoriaId !== 'none' && s.categoria_id === form.categoriaId);

  const salvar = async () => {
    if (form.entidadeId === 'none') return toast({ title: 'Atenção', description: `Escolha o ${form.tipo === 'receber' ? 'cliente' : 'fornecedor'}: é por ele que a nota será encontrada depois.`, variant: 'destructive' });
    if (!(Number(form.valor) > 0)) return toast({ title: 'Atenção', description: 'Informe o valor do adiantamento.', variant: 'destructive' });
    setSaving(true);
    try {
      const { error } = await insertWithCompanyId('movimentacao_financeira', {
        tipo: form.tipo, adiantamento: true, status: 'pendente',
        numero_titulo: `ADIANT-${form.data.replaceAll('-', '')}`,
        ...(form.tipo === 'receber' ? { cliente_id: form.entidadeId } : { fornecedor_id: form.entidadeId }),
        valor_total: Number(form.valor), data_emissao: form.data, data_vencimento: form.data,
        categoria_id: nulo(form.categoriaId), subcategoria_id: nulo(form.subcategoriaId), centro_custo_id: nulo(form.centroCustoId),
        parcela_atual: 1, total_parcelas: 1,
        observacoes: form.observacoes || (form.tipo === 'receber' ? 'Adiantamento recebido de cliente' : 'Adiantamento pago a fornecedor'),
        created_by: user?.id
      });
      if (error) throw error;
      toast({ title: 'Adiantamento lançado', description: 'Agora use "Baixar" nele para registrar o banco e a data em que o dinheiro saiu/entrou. Depois ele aparece na hora de lançar a nota.' });
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (e) {
      toast({ title: 'Erro ao lançar o adiantamento', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Coins className="h-5 w-5" /> Novo adiantamento</DialogTitle>
          <DialogDescription>Dinheiro pago ou recebido antes de a nota existir. Quando a nota chegar, o sistema oferece vincular este adiantamento a ela.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            {[['pagar', 'Adiantamento a fornecedor (pagamento)'], ['receber', 'Adiantamento de cliente (recebimento)']].map(([v, r]) => (
              <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, tipo: v, entidadeId: 'none' }))}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${form.tipo === v ? (v === 'pagar' ? 'border-red-500 bg-red-500/10 text-red-600' : 'border-emerald-500 bg-emerald-500/10 text-emerald-600') : 'border-border text-muted-foreground'}`}>{r}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{form.tipo === 'receber' ? 'Cliente' : 'Fornecedor'} *</Label>
              <Select value={form.entidadeId} onValueChange={set('entidadeId')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione…</SelectItem>
                  {entidades.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Valor (R$) *</Label><Input type="number" step="0.01" min="0" value={form.valor} onChange={(e) => set('valor')(e.target.value)} /></div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => set('data')(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Centro de custo</Label>
              <Select value={form.centroCustoId} onValueChange={set('centroCustoId')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Nenhum</SelectItem>{dropdowns.centrosCusto.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoriaId} onValueChange={(v) => setForm((f) => ({ ...f, categoriaId: v, subcategoriaId: 'none' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{dropdowns.categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategoria</Label>
              <Select value={form.subcategoriaId} onValueChange={set('subcategoriaId')} disabled={form.categoriaId === 'none'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={(e) => set('observacoes')(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lançar adiantamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default AdiantamentoDialog;

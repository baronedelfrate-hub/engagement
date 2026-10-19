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
import { montarProvisoes, somarMeses } from '@/lib/provisoes';
import { Loader2, CalendarClock } from 'lucide-react';

const hoje = () => new Date().toISOString().split('T')[0];
const formaVazia = () => ({
  tipo: 'pagar', descricao: '', entidadeId: 'none', valor: '', dataPrevista: hoje(), repetirMeses: 1,
  categoriaId: 'none', subcategoriaId: 'none', centroCustoId: 'none', observacoes: ''
});
const nulo = (v) => (v === 'none' ? null : v);

// Lança uma provisão (a pagar ou a receber), opcionalmente repetida mês a mês.
const ProvisaoDialog = ({ open, onOpenChange, onSaved }) => {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const dropdowns = useFinanceiroDropdowns();
  const [form, setForm] = useState(formaVazia());
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(formaVazia()); }, [open]);

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const setInput = (campo) => (e) => set(campo)(e.target.value);

  const entidades = form.tipo === 'receber' ? dropdowns.clientes : dropdowns.fornecedores;
  const subs = dropdowns.subcategorias.filter((s) => form.categoriaId !== 'none' && s.categoria_id === form.categoriaId);
  const n = Math.max(1, Math.min(60, Number(form.repetirMeses) || 1));

  const salvar = async () => {
    if (!form.descricao.trim()) return toast({ title: 'Atenção', description: 'Descreva a provisão (ex.: Aluguel da sala).', variant: 'destructive' });
    if (!(Number(form.valor) > 0)) return toast({ title: 'Atenção', description: 'Informe o valor previsto.', variant: 'destructive' });
    if (!form.dataPrevista) return toast({ title: 'Atenção', description: 'Informe a data prevista.', variant: 'destructive' });

    setSaving(true);
    try {
      const linhas = montarProvisoes({
        tipo: form.tipo,
        descricao: form.descricao,
        entidadeId: nulo(form.entidadeId),
        valor: form.valor,
        dataPrevista: form.dataPrevista,
        repetirMeses: n,
        categoriaId: nulo(form.categoriaId),
        subcategoriaId: nulo(form.subcategoriaId),
        centroCustoId: nulo(form.centroCustoId),
        observacoes: form.observacoes,
        createdBy: user?.id
      });
      const { error } = await insertWithCompanyId('movimentacao_financeira', linhas);
      if (error) throw error;
      toast({ title: 'Provisão lançada', description: n > 1 ? `${n} provisões criadas, de ${form.dataPrevista.split('-').reverse().join('/')} a ${somarMeses(form.dataPrevista, n - 1).split('-').reverse().join('/')}.` : 'A provisão já entra no previsto do fluxo de caixa.' });
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (e) {
      toast({ title: 'Erro ao lançar a provisão', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" /> Nova provisão</DialogTitle>
          <DialogDescription>O que você espera pagar ou receber. Entra no previsto do fluxo de caixa e depois é substituída pelo lançamento real.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            {[['pagar', 'A pagar'], ['receber', 'A receber']].map(([v, r]) => (
              <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, tipo: v, entidadeId: 'none' }))}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${form.tipo === v ? (v === 'pagar' ? 'border-red-500 bg-red-500/10 text-red-600' : 'border-emerald-500 bg-emerald-500/10 text-emerald-600') : 'border-border text-muted-foreground'}`}>
                {r}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input value={form.descricao} onChange={setInput('descricao')} placeholder={form.tipo === 'pagar' ? 'Ex.: Aluguel da sala' : 'Ex.: Mensalidade do cliente X'} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{form.tipo === 'receber' ? 'Cliente' : 'Fornecedor'} (opcional)</Label>
              <Select value={form.entidadeId} onValueChange={set('entidadeId')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem {form.tipo === 'receber' ? 'cliente' : 'fornecedor'}</SelectItem>
                  {entidades.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor previsto (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={form.valor} onChange={setInput('valor')} />
            </div>
            <div className="space-y-2">
              <Label>Data prevista *</Label>
              <Input type="date" value={form.dataPrevista} onChange={setInput('dataPrevista')} />
            </div>
            <div className="space-y-2">
              <Label>Repetir por quantos meses?</Label>
              <Input type="number" min="1" max="60" value={form.repetirMeses} onChange={setInput('repetirMeses')} />
              <p className="text-xs text-muted-foreground">1 = só esta data. Mais de 1 cria uma provisão por mês, no mesmo dia.</p>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoriaId} onValueChange={(v) => setForm((f) => ({ ...f, categoriaId: v, subcategoriaId: 'none' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {dropdowns.categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategoria</Label>
              <Select value={form.subcategoriaId} onValueChange={set('subcategoriaId')} disabled={form.categoriaId === 'none'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Centro de custo</Label>
              <Select value={form.centroCustoId} onValueChange={set('centroCustoId')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {dropdowns.centrosCusto.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={form.observacoes} onChange={setInput('observacoes')} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {n > 1 ? `Lançar ${n} provisões` : 'Lançar provisão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProvisaoDialog;

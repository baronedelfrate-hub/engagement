import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2 } from 'lucide-react';

const hoje = () => new Date().toISOString().split('T')[0];
const num = (v) => Number(v) || 0;
const brl = (v) => num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const valorAbatido = (b) => num(b.valor_baixa) - num(b.valor_juros) + num(b.valor_desconto);

// Baixa de título: grava em movimentacao_baixas (é daí que a Conciliação Bancária lê)
// e atualiza o status do título (pago / pago_parcial).
const BaixaMovimentacaoModal = ({ open, onOpenChange, movimentacaoId, onSaved }) => {
  const { toast } = useToast();
  const { company_id, user } = useAuthContext();
  const dropdowns = useFinanceiroDropdowns();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [titulo, setTitulo] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!open || !movimentacaoId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('movimentacao_financeira')
        .select('*, cliente:clientes(nome), fornecedor:fornecedores(nome), baixas:movimentacao_baixas(valor_baixa, valor_juros, valor_desconto)')
        .eq('id', movimentacaoId)
        .single();
      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível carregar o título.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      const emAberto = Math.max(0, num(data.valor_total) - (data.baixas || []).reduce((s, b) => s + valorAbatido(b), 0));
      setTitulo(data);
      setSaldo(emAberto);
      setForm({
        data_baixa: hoje(),
        valor_titulo: emAberto.toFixed(2),
        juros: '',
        desconto: '',
        banco_id: data.banco_id || 'none',
        categoria_id: data.categoria_id || 'none',
        subcategoria_id: data.subcategoria_id || 'none',
        centro_custo_id: data.centro_custo_id || 'none',
        observacoes: ''
      });
      setLoading(false);
    })();
  }, [open, movimentacaoId]);

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const setInput = (campo) => (e) => set(campo)(e.target.value);

  const isPagar = titulo?.tipo?.toLowerCase() === 'pagar';
  const totalEfetivo = num(form.valor_titulo) + num(form.juros) - num(form.desconto);
  const subcategoriasDaCategoria = dropdowns.subcategorias.filter((s) => form.categoria_id === 'none' || s.categoria_id === form.categoria_id);

  const handleSave = async () => {
    if (!form.data_baixa) return toast({ title: 'Atenção', description: 'Informe a data da baixa.', variant: 'destructive' });
    if (num(form.valor_titulo) <= 0) return toast({ title: 'Atenção', description: 'Informe o valor a baixar do título.', variant: 'destructive' });
    if (num(form.valor_titulo) > saldo + 0.005) return toast({ title: 'Atenção', description: `O valor excede o saldo em aberto (${brl(saldo)}).`, variant: 'destructive' });
    if (num(form.juros) < 0 || num(form.desconto) < 0) return toast({ title: 'Atenção', description: 'Juros e desconto não podem ser negativos.', variant: 'destructive' });
    if (totalEfetivo <= 0) return toast({ title: 'Atenção', description: 'O desconto não pode zerar o valor da baixa.', variant: 'destructive' });
    if (form.banco_id === 'none') return toast({ title: 'Atenção', description: 'Selecione o banco da baixa.', variant: 'destructive' });

    const orNull = (v) => (v === 'none' ? null : v);
    setSaving(true);
    let baixaId = null;
    try {
      const { data: baixa, error: baixaError } = await supabase
        .from('movimentacao_baixas')
        .insert({
          movimentacao_id: titulo.id,
          company_id: titulo.company_id || company_id,
          valor_baixa: Number(totalEfetivo.toFixed(2)),
          valor_juros: num(form.juros),
          valor_desconto: num(form.desconto),
          data_baixa: form.data_baixa,
          banco_id: orNull(form.banco_id),
          categoria_id: orNull(form.categoria_id),
          subcategoria_id: orNull(form.subcategoria_id),
          centro_custo_id: orNull(form.centro_custo_id),
          observacoes: form.observacoes || null,
          created_by: user?.id || null
        })
        .select('id')
        .single();
      if (baixaError) throw baixaError;
      baixaId = baixa.id;

      const quitado = num(form.valor_titulo) >= saldo - 0.005;
      const { error: tituloError } = await supabase
        .from('movimentacao_financeira')
        .update({
          status: quitado ? 'pago' : 'pago_parcial',
          banco_id: orNull(form.banco_id),
          categoria_id: orNull(form.categoria_id),
          subcategoria_id: orNull(form.subcategoria_id),
          centro_custo_id: orNull(form.centro_custo_id),
          updated_at: new Date().toISOString()
        })
        .eq('id', titulo.id);
      if (tituloError) throw tituloError;

      toast({ title: 'Baixa registrada', description: `${isPagar ? 'Pagamento' : 'Recebimento'} de ${brl(totalEfetivo)} lançado e disponível na Conciliação Bancária.` });
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (err) {
      // não deixa uma baixa solta se o título não pôde ser atualizado
      if (baixaId) await supabase.from('movimentacao_baixas').delete().eq('id', baixaId);
      toast({ title: 'Erro ao registrar baixa', description: err.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const entidade = isPagar ? titulo?.fornecedor?.nome : titulo?.cliente?.nome;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Baixar título — {isPagar ? 'Pagamento' : 'Recebimento'}</DialogTitle>
          <DialogDescription>
            {titulo ? `${titulo.numero_titulo} · ${entidade || 'Sem ' + (isPagar ? 'fornecedor' : 'cliente')} · valor ${brl(titulo.valor_total)} · em aberto ${brl(saldo)}` : 'Carregando…'}
          </DialogDescription>
        </DialogHeader>

        {loading || !titulo ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da baixa *</Label>
                <Input type="date" value={form.data_baixa} onChange={setInput('data_baixa')} />
              </div>
              <div className="space-y-2">
                <Label>Valor a baixar do título (R$) *</Label>
                <Input type="number" step="0.01" value={form.valor_titulo} onChange={setInput('valor_titulo')} />
              </div>
              <div className="space-y-2">
                <Label>Juros / multa (R$)</Label>
                <Input type="number" step="0.01" min="0" placeholder="0,00" value={form.juros} onChange={setInput('juros')} />
              </div>
              <div className="space-y-2">
                <Label>Desconto (R$)</Label>
                <Input type="number" step="0.01" min="0" placeholder="0,00" value={form.desconto} onChange={setInput('desconto')} />
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total {isPagar ? 'pago' : 'recebido'} no banco</span>
              <span className={`text-lg font-semibold ${isPagar ? 'text-red-500' : 'text-emerald-500'}`}>{brl(totalEfetivo)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Banco *</Label>
                <Select value={form.banco_id} onValueChange={set('banco_id')}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione…</SelectItem>
                    {dropdowns.bancos.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Centro de custo</Label>
                <Select value={form.centro_custo_id} onValueChange={set('centro_custo_id')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {dropdowns.centrosCusto.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoria_id} onValueChange={(v) => setForm((f) => ({ ...f, categoria_id: v, subcategoria_id: 'none' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {dropdowns.categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subcategoria</Label>
                <Select value={form.subcategoria_id} onValueChange={set('subcategoria_id')} disabled={form.categoria_id === 'none'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {subcategoriasDaCategoria.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes} onChange={setInput('observacoes')} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading || !titulo}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Confirmar baixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BaixaMovimentacaoModal;

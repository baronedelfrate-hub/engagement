import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { somarMeses } from '@/lib/provisoes';
import { formatDateOnly } from '@/lib/dateUtils';
import { Loader2, Replace } from 'lucide-react';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hoje = () => new Date().toISOString().split('T')[0];
const nulo = (v) => (v === 'none' || v === '' ? null : v);
const ou = (v) => v || 'none';

// Substitui uma provisão por lançamento(s) real(is): cria um lançamento a partir dela ou vincula lançamentos que já existem.
const SubstituirProvisaoDialog = ({ open, onOpenChange, provisao, onDone }) => {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const dropdowns = useFinanceiroDropdowns();
  const [saving, setSaving] = useState(false);
  const [aba, setAba] = useState('criar');
  const [form, setForm] = useState({});
  const [candidatos, setCandidatos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [marcados, setMarcados] = useState(new Set());

  const pagar = provisao?.tipo === 'pagar';

  useEffect(() => {
    if (!open || !provisao) return;
    setAba('criar');
    setMarcados(new Set());
    setForm({
      numero: '',
      entidadeId: ou(pagar ? provisao.fornecedor_id : provisao.cliente_id),
      valor: String(provisao.valor_total ?? ''),
      emissao: hoje(),
      vencimento: provisao.data_vencimento || hoje(),
      categoriaId: ou(provisao.categoria_id),
      subcategoriaId: ou(provisao.subcategoria_id),
      centroCustoId: ou(provisao.centro_custo_id),
      observacoes: ''
    });

    // lançamentos reais do mesmo tipo, em torno da data prevista, ainda não ligados a outra provisão
    setCarregando(true);
    supabase
      .from('movimentacao_financeira')
      .select('id, numero_titulo, valor_total, data_vencimento, status, cliente:clientes(nome), fornecedor:fornecedores(nome)')
      .eq('company_id', provisao.company_id)
      .eq('tipo', provisao.tipo)
      .eq('provisao', false)
      .is('provisao_id', null)
      .neq('status', 'cancelado')
      .gte('data_vencimento', somarMeses(provisao.data_vencimento, -2))
      .lte('data_vencimento', somarMeses(provisao.data_vencimento, 2))
      .order('data_vencimento')
      .limit(200)
      .then(({ data }) => { setCandidatos(data || []); setCarregando(false); });
  }, [open, provisao]);

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const setInput = (campo) => (e) => set(campo)(e.target.value);
  const entidades = pagar ? dropdowns.fornecedores : dropdowns.clientes;
  const subs = dropdowns.subcategorias.filter((s) => form.categoriaId && form.categoriaId !== 'none' && s.categoria_id === form.categoriaId);

  const marcarSubstituida = async () => {
    const { error } = await supabase.from('movimentacao_financeira').update({ status: 'substituido', updated_at: new Date().toISOString() }).eq('id', provisao.id);
    if (error) throw error;
  };

  const criarLancamento = async () => {
    if (!form.numero.trim()) return toast({ title: 'Atenção', description: 'Informe o número do lançamento (ex.: número da nota ou do boleto).', variant: 'destructive' });
    if (!(Number(form.valor) > 0)) return toast({ title: 'Atenção', description: 'Informe o valor do lançamento.', variant: 'destructive' });
    if (!form.vencimento) return toast({ title: 'Atenção', description: 'Informe o vencimento.', variant: 'destructive' });
    setSaving(true);
    let novoId = null;
    try {
      const { data, error } = await insertWithCompanyId('movimentacao_financeira', {
        tipo: provisao.tipo,
        numero_titulo: form.numero.trim(),
        ...(pagar ? { fornecedor_id: nulo(form.entidadeId) } : { cliente_id: nulo(form.entidadeId) }),
        valor_total: Number(form.valor),
        data_emissao: form.emissao || null,
        data_vencimento: form.vencimento,
        categoria_id: nulo(form.categoriaId),
        subcategoria_id: nulo(form.subcategoriaId),
        centro_custo_id: nulo(form.centroCustoId),
        status: 'pendente',
        provisao: false,
        provisao_id: provisao.id,
        parcela_atual: 1,
        total_parcelas: 1,
        observacoes: form.observacoes || `Substitui a provisão "${provisao.numero_titulo}"`,
        created_by: user?.id || null
      }, { chain: (q) => q.select('id').single() });
      if (error) throw error;
      novoId = data?.id;
      await marcarSubstituida();
      toast({ title: 'Provisão substituída', description: 'O lançamento real entrou no lugar da provisão no previsto do fluxo de caixa.' });
      onOpenChange(false);
      if (onDone) onDone();
    } catch (e) {
      // não deixa um lançamento solto se a provisão não pôde ser marcada
      if (novoId) await supabase.from('movimentacao_financeira').delete().eq('id', novoId);
      toast({ title: 'Erro ao substituir', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const vincular = async () => {
    if (marcados.size === 0) return toast({ title: 'Atenção', description: 'Marque ao menos um lançamento.', variant: 'destructive' });
    setSaving(true);
    try {
      const { error } = await supabase.from('movimentacao_financeira').update({ provisao_id: provisao.id }).in('id', [...marcados]);
      if (error) throw error;
      try {
        await marcarSubstituida();
      } catch (e) {
        await supabase.from('movimentacao_financeira').update({ provisao_id: null }).in('id', [...marcados]);
        throw e;
      }
      toast({ title: 'Provisão substituída', description: `${marcados.size} lançamento(s) vinculado(s) no lugar da provisão.` });
      onOpenChange(false);
      if (onDone) onDone();
    } catch (e) {
      toast({ title: 'Erro ao vincular', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const alternar = (id) => setMarcados((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const totalMarcado = candidatos.filter((c) => marcados.has(c.id)).reduce((s, c) => s + Number(c.valor_total || 0), 0);

  if (!provisao) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Replace className="h-5 w-5" /> Substituir provisão</DialogTitle>
          <DialogDescription>
            {provisao.numero_titulo} · {pagar ? 'a pagar' : 'a receber'} · {brl(provisao.valor_total)} · previsto para {formatDateOnly(provisao.data_vencimento)}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={aba} onValueChange={setAba}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="criar">Criar o lançamento real</TabsTrigger>
            <TabsTrigger value="vincular">Vincular lançamentos existentes</TabsTrigger>
          </TabsList>

          <TabsContent value="criar" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número do lançamento *</Label>
                <Input value={form.numero || ''} onChange={setInput('numero')} placeholder="Nº da nota, boleto ou documento" />
              </div>
              <div className="space-y-2">
                <Label>{pagar ? 'Fornecedor' : 'Cliente'}</Label>
                <Select value={form.entidadeId || 'none'} onValueChange={set('entidadeId')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem {pagar ? 'fornecedor' : 'cliente'}</SelectItem>
                    {entidades.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor real (R$) *</Label>
                <Input type="number" step="0.01" min="0" value={form.valor || ''} onChange={setInput('valor')} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input type="date" value={form.vencimento || ''} onChange={setInput('vencimento')} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoriaId || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, categoriaId: v, subcategoriaId: 'none' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {dropdowns.categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subcategoria</Label>
                <Select value={form.subcategoriaId || 'none'} onValueChange={set('subcategoriaId')} disabled={!form.categoriaId || form.categoriaId === 'none'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Centro de custo</Label>
                <Select value={form.centroCustoId || 'none'} onValueChange={set('centroCustoId')}>
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
              <Textarea rows={2} value={form.observacoes || ''} onChange={setInput('observacoes')} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={criarLancamento} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar lançamento e substituir</Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="vincular" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">Lançamentos {pagar ? 'a pagar' : 'a receber'} com vencimento até 2 meses antes ou depois da data prevista. Marque o que substitui esta provisão (pode ser mais de um, como parcelas).</p>
            <div className="rounded-md border border-border max-h-[320px] overflow-y-auto">
              {carregando ? (
                <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : candidatos.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Nenhum lançamento real nessa janela. Use a outra aba para criar um.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs uppercase text-muted-foreground sticky top-0">
                    <tr><th className="p-2 w-10" /><th className="p-2 text-left">Lançamento</th><th className="p-2 text-left">{pagar ? 'Fornecedor' : 'Cliente'}</th><th className="p-2 text-left">Vencimento</th><th className="p-2 text-right">Valor</th><th className="p-2 text-left">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {candidatos.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => alternar(c.id)}>
                        <td className="p-2"><Checkbox checked={marcados.has(c.id)} onCheckedChange={() => alternar(c.id)} /></td>
                        <td className="p-2 font-mono text-xs">{c.numero_titulo}</td>
                        <td className="p-2">{(pagar ? c.fornecedor?.nome : c.cliente?.nome) || '-'}</td>
                        <td className="p-2 whitespace-nowrap">{formatDateOnly(c.data_vencimento)}</td>
                        <td className="p-2 text-right whitespace-nowrap">{brl(c.valor_total)}</td>
                        <td className="p-2 capitalize text-xs">{(c.status || '').replace('_', ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{marcados.size} marcado(s) · {brl(totalMarcado)} (provisão: {brl(provisao.valor_total)})</span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={vincular} disabled={saving || marcados.size === 0}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Vincular e substituir</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SubstituirProvisaoDialog;

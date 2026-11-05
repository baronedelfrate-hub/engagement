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
import { Loader2, Replace, Upload, X, FileText } from 'lucide-react';
import { nomePadraoAnexo } from '@/lib/nomeAnexo';
import SeletorProjeto from '@/components/SeletorProjeto';

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
  const [boletos, setBoletos] = useState([]); // arquivos do boleto a anexar ao lançamento criado

  const pagar = provisao?.tipo === 'pagar';

  useEffect(() => {
    if (!open || !provisao) return;
    setAba('criar');
    setMarcados(new Set()); setBoletos([]);
    setForm({
      codigoBarras: '',
      numero: '',
      entidadeId: ou(pagar ? provisao.fornecedor_id : provisao.cliente_id),
      valor: String(provisao.valor_total ?? ''),
      emissao: hoje(),
      vencimento: provisao.data_vencimento || hoje(),
      categoriaId: ou(provisao.categoria_id),
      subcategoriaId: ou(provisao.subcategoria_id),
      centroCustoId: ou(provisao.centro_custo_id),
      projetoId: ou(provisao.projeto_id),
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
        projeto_id: nulo(form.projetoId),
        codigo_barras: pagar && form.codigoBarras?.trim() ? form.codigoBarras.trim() : null,
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
      // boleto(s) anexado(s): se o envio falhar, o lançamento continua valendo e dá para anexar depois
      let falhouAnexo = false;
      const usados = [];
      for (const f of boletos) {
        try {
          const ext = (f.name.split('.').pop() || 'pdf').toLowerCase();
          const caminho = `${provisao.company_id}/${novoId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const up = await supabase.storage.from('movimentacao-docs').upload(caminho, f);
          if (up.error) throw up.error;
          const nome = nomePadraoAnexo({ data: form.vencimento, fornecedor: entidades.find((x) => x.id === form.entidadeId)?.nome, documento: form.numero, nomeOriginal: f.name, jaExistentes: usados });
          usados.push(nome);
          const ins = await supabase.from('movimentacao_documentos').insert({ movimentacao_id: novoId, company_id: provisao.company_id, tipo_documento: 'nota', nome_arquivo: nome, storage_path: caminho, created_by: user?.id || null });
          if (ins.error) throw ins.error;
        } catch (e) { falhouAnexo = true; }
      }
      if (falhouAnexo) toast({ title: 'Lançamento criado, mas o boleto não subiu', description: 'Anexe o boleto de novo em Detalhes da movimentação.', variant: 'destructive' });
      toast({ title: 'Provisão substituída', description: `O lançamento real entrou no lugar da provisão no previsto do fluxo de caixa.${boletos.length && !falhouAnexo ? ' Boleto anexado.' : ''}` });
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
              <div className="space-y-2">
                <Label>Centro de custo</Label>
                <Select value={form.centroCustoId || 'none'} onValueChange={set('centroCustoId')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {dropdowns.centrosCusto.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Projeto</Label>
                <SeletorProjeto value={form.projetoId || 'none'} onChange={set('projetoId')} empresaId={provisao.company_id} />
              </div>
            </div>
            {pagar && (
              <div className="rounded-md border border-blue-200 bg-blue-50/40 p-3 space-y-3">
                <div className="text-sm font-medium">Boleto</div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Código de barras / linha digitável</Label>
                  <Input className="font-mono" value={form.codigoBarras || ''} onChange={setInput('codigoBarras')} placeholder="Cole aqui o código do boleto" />
                  <p className="text-[11px] text-muted-foreground">Fica no lançamento, com o botão de copiar, na lista e no relatório enviado por WhatsApp.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Anexar o boleto (PDF ou imagem)</Label>
                  <label className="flex items-center gap-2 border-2 border-dashed border-border rounded-md px-3 py-2 text-sm text-muted-foreground cursor-pointer hover:bg-muted/30">
                    <Upload className="h-4 w-4" /> Clique para escolher o arquivo do boleto
                    <input type="file" multiple accept="application/pdf,image/*" className="hidden"
                      onChange={(e) => { const novos = Array.from(e.target.files || []).filter((f) => f.size <= 10 * 1024 * 1024); setBoletos((l) => [...l, ...novos]); e.target.value = ''; }} />
                  </label>
                  {boletos.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border border-border rounded-md bg-background">
                      <span className="flex items-center gap-2 text-sm truncate"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" />{f.name}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setBoletos((l) => l.filter((_, k) => k !== i))}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground">O arquivo é renomeado no padrão DATA - FIN - FORNECEDOR - Nº DO DOCUMENTO.</p>
                </div>
              </div>
            )}
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

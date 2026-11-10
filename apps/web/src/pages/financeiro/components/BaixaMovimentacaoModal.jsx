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
import { Loader2, CheckCircle2, Upload, X, FileText, Receipt } from 'lucide-react';
import PreviaPdfDialog from '@/components/PreviaPdfDialog';
import { gerarReciboPdf } from '@/lib/reciboPdf';
import SeletorProjeto from '@/components/SeletorProjeto';
import { nomePadraoAnexo } from '@/lib/nomeAnexo';

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
  const [comprovantes, setComprovantes] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [reciboTexto, setReciboTexto] = useState('');
  const [emitirReciboAoSalvar, setEmitirReciboAoSalvar] = useState(false);
  const [previaRecibo, setPreviaRecibo] = useState(null); // { base64, titulo, nome }
  const [gerandoRecibo, setGerandoRecibo] = useState(false);

  useEffect(() => {
    if (!open || !movimentacaoId) return;
    setComprovantes([]);
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('movimentacao_financeira')
        .select('*, cliente:clientes(nome, cnpj), fornecedor:fornecedores(nome, cnpj, cidade), baixas:movimentacao_baixas(valor_baixa, valor_juros, valor_desconto)')
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
      setEmitirReciboAoSalvar(false);
      setReciboTexto(String(data.observacoes || data.numero_titulo || '').replace(/\s*Emitir recibo na baixa\.?/i, '').replace(/\s*Pix para a chave.*$/i, '').trim());
      supabase.from('empresas').select('razao_social, nome_fantasia, cnpj, cidade').eq('id', data.company_id).maybeSingle().then(({ data: e }) => setEmpresa(e || null));
      setForm({
        data_baixa: hoje(),
        valor_titulo: emAberto.toFixed(2),
        juros: '',
        desconto: '',
        banco_id: data.banco_id || 'none',
        categoria_id: data.categoria_id || 'none',
        subcategoria_id: data.subcategoria_id || 'none',
        centro_custo_id: data.centro_custo_id || 'none',
        projeto_id: data.projeto_id || 'none',
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

  // Recibo: quem recebeu (fornecedor/cliente) assina; quem pagou é a empresa do título. Usa o valor e a data digitados na baixa.
  const montarRecibo = async (opcoes = { base64: true }) => {
    const pagador = isPagar ? { nome: empresa?.razao_social || empresa?.nome_fantasia || '', documento: empresa?.cnpj || '' } : { nome: titulo.cliente?.nome || '', documento: titulo.cliente?.cnpj || '' };
    const recebedor = isPagar ? { nome: titulo.fornecedor?.nome || '', documento: titulo.fornecedor?.cnpj || '' } : { nome: empresa?.razao_social || empresa?.nome_fantasia || '', documento: empresa?.cnpj || '' };
    return gerarReciboPdf({ pagador, recebedor, valor: Number(totalEfetivo.toFixed(2)), referente: (reciboTexto || titulo.numero_titulo || 'serviços prestados').replace(/[.\s]+$/, ''), data: form.data_baixa, local: titulo.fornecedor?.cidade || empresa?.cidade || '', forma: 'Pix / transferência bancária' }, opcoes);
  };
  const emitirRecibo = async () => {
    if (!(isPagar ? titulo?.fornecedor?.nome : titulo?.cliente?.nome)) return toast({ title: 'Atenção', description: `O título não tem ${isPagar ? 'fornecedor' : 'cliente'}; cadastre antes de emitir o recibo.`, variant: 'destructive' });
    if (totalEfetivo <= 0) return toast({ title: 'Atenção', description: 'Informe o valor da baixa para emitir o recibo.', variant: 'destructive' });
    setGerandoRecibo(true);
    try { const r = await montarRecibo({ base64: true }); setPreviaRecibo({ base64: r.base64, nome: r.nome }); }
    catch (e) { toast({ title: 'Não foi possível gerar o recibo', description: e.message, variant: 'destructive' }); }
    finally { setGerandoRecibo(false); }
  };

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
          projeto_id: orNull(form.projeto_id),
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
          projeto_id: orNull(form.projeto_id),
          updated_at: new Date().toISOString()
        })
        .eq('id', titulo.id);
      if (tituloError) throw tituloError;

      // comprovante: se o envio falhar a baixa fica valendo e o arquivo pode ser anexado depois, na movimentação
      let falhouComprovante = false;
      const nomesUsados = [];
      for (const f of comprovantes) {
        try {
          const ext = (f.name.split('.').pop() || 'pdf').toLowerCase();
          const empresaId = titulo.company_id || company_id;
          const caminho = `${empresaId}/${titulo.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const up = await supabase.storage.from('movimentacao-docs').upload(caminho, f);
          if (up.error) throw up.error;
          const nomeFinal = nomePadraoAnexo({ data: form.data_baixa, fornecedor: (isPagar ? titulo.fornecedor?.nome : titulo.cliente?.nome), documento: titulo.numero_titulo, nomeOriginal: f.name, jaExistentes: nomesUsados });
          nomesUsados.push(nomeFinal);
          const ins = await supabase.from('movimentacao_documentos').insert({ movimentacao_id: titulo.id, baixa_id: baixaId, company_id: empresaId, tipo_documento: 'comprovante', nome_arquivo: nomeFinal, storage_path: caminho, created_by: user?.id || null });
          if (ins.error) throw ins.error;
        } catch (e) { falhouComprovante = true; }
      }
      if (falhouComprovante) toast({ title: 'Baixa registrada, mas o comprovante não subiu', description: 'Anexe o comprovante de novo pela movimentação financeira.', variant: 'destructive' });
      toast({ title: 'Baixa registrada', description: `${isPagar ? 'Pagamento' : 'Recebimento'} de ${brl(totalEfetivo)} lançado e disponível na Conciliação Bancária.${comprovantes.length && !falhouComprovante ? ' Comprovante anexado.' : ''}` });
      if (emitirReciboAoSalvar) { try { const r = await montarRecibo({ base64: true }); setPreviaRecibo({ base64: r.base64, nome: r.nome }); } catch { /* o recibo pode ser emitido depois */ } }
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
              <div className="space-y-2">
                <Label>Projeto</Label>
                <SeletorProjeto value={form.projeto_id} onChange={set('projeto_id')} empresaId={titulo.company_id} className="" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes} onChange={setInput('observacoes')} />
            </div>

            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-1.5"><Receipt className="h-4 w-4" /> Recibo</Label>
                <Button type="button" variant="outline" size="sm" onClick={emitirRecibo} disabled={gerandoRecibo}>{gerandoRecibo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}Emitir recibo</Button>
              </div>
              <Textarea rows={2} value={reciboTexto} onChange={(e) => setReciboTexto(e.target.value)} placeholder="Referente a… (ex.: duas diárias de serviços prestados)" />
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={emitirReciboAoSalvar} onChange={(e) => setEmitirReciboAoSalvar(e.target.checked)} /> Abrir o recibo ao confirmar a baixa</label>
              <p className="text-xs text-muted-foreground">O recibo usa o valor ({brl(totalEfetivo)}) e a data da baixa. {isPagar ? `Quem assina é ${titulo?.fornecedor?.nome || 'o fornecedor'}.` : 'Quem assina é a empresa.'} Dá para baixar ou imprimir.</p>
            </div>

            <div className="space-y-2">
              <Label>Comprovante de pagamento (opcional)</Label>
              <label className="flex items-center gap-2 border-2 border-dashed border-border rounded-md px-3 py-3 text-sm text-muted-foreground cursor-pointer hover:bg-muted/30">
                <Upload className="h-4 w-4" /> Clique para anexar o comprovante (PDF ou imagem, até 10 MB)
                <input type="file" multiple accept="application/pdf,image/*" className="hidden"
                  onChange={(e) => { const novos = Array.from(e.target.files || []).filter((f) => f.size <= 10 * 1024 * 1024); setComprovantes((p) => [...p, ...novos]); e.target.value = ''; }} />
              </label>
              {comprovantes.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2 border border-border rounded-md">
                  <span className="flex items-center gap-2 text-sm truncate"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" />{f.name}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setComprovantes((p) => p.filter((_, k) => k !== i))}><X className="h-3 w-3" /></Button>
                </div>
              ))}
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
      <PreviaPdfDialog open={!!previaRecibo} onOpenChange={(o) => { if (!o) setPreviaRecibo(null); }} titulo="Recibo" nome={previaRecibo?.nome || 'recibo.pdf'} base64={previaRecibo?.base64} />
    </Dialog>
  );
};

export default BaixaMovimentacaoModal;

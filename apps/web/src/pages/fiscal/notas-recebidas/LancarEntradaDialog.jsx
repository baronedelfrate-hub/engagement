import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';
import { supabase } from '@/lib/customSupabaseClient';
import { listarAdiantamentosDisponiveis, vincularAdiantamentos } from '@/lib/adiantamentos';
import { entradaNFService } from '../services/entradaNFService';
import { Loader2 } from 'lucide-react';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dt = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '-');
const so = (v) => String(v || '').replace(/\D/g, '');
const nulo = (v) => (v === 'none' || v === '' ? null : v);

// Lança a nota recebida como Entrada de NF e já gera a conta a pagar: vencimento/classificação, provisão a substituir e adiantamentos a vincular.
export default function LancarEntradaDialog({ nota, onClose, onDone }) {
  const { toast } = useToast();
  const dropdowns = useFinanceiroDropdowns();
  const [empresaId, setEmpresaId] = useState(null);
  const [fornecedorId, setFornecedorId] = useState(null);
  const [provisoes, setProvisoes] = useState([]);
  const [adiantamentos, setAdiantamentos] = useState([]);
  const [provisaoId, setProvisaoId] = useState('none');
  const [selAdiant, setSelAdiant] = useState({});
  const [form, setForm] = useState({ vencimento: '', categoriaId: 'none', subcategoriaId: 'none', centroCustoId: 'none', condicaoId: 'none' });
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const set = (c) => (v) => setForm((f) => ({ ...f, [c]: v }));

  useEffect(() => {
    if (!nota) return;
    let vivo = true;
    (async () => {
      setCarregando(true);
      setProvisoes([]); setAdiantamentos([]); setProvisaoId('none'); setSelAdiant({});
      setForm({ vencimento: '', categoriaId: 'none', subcategoriaId: 'none', centroCustoId: 'none', condicaoId: 'none' });
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      const emp = perfil?.company_id; if (!vivo) return; setEmpresaId(emp);
      const cnpj = so(nota.cnpj_emitente);
      let forn = null;
      if (cnpj) {
        const { data } = await supabase.from('fornecedores').select('id, cnpj').eq('company_id', emp).limit(5000);
        forn = (data || []).find((f) => so(f.cnpj) === cnpj)?.id || null;
      }
      if (!vivo) return; setFornecedorId(forn);
      if (forn) {
        const [{ data: prov }, adi] = await Promise.all([
          supabase.from('movimentacao_financeira').select('id, numero_titulo, valor_total, data_vencimento, observacoes')
            .eq('company_id', emp).eq('tipo', 'pagar').eq('provisao', true).eq('status', 'pendente').eq('fornecedor_id', forn).order('data_vencimento'),
          listarAdiantamentosDisponiveis({ tipo: 'pagar', companyId: emp, fornecedorId: forn }).catch(() => []),
        ]);
        if (!vivo) return;
        setProvisoes(prov || []); setAdiantamentos(adi);
        const v = Number(nota.valor_total) || 0;
        const parecida = (prov || []).find((p) => v > 0 && Math.abs(Number(p.valor_total) - v) / v <= 0.1);
        if (parecida) setProvisaoId(parecida.id);
        // adiantamento do mesmo valor já vem marcado
        const exato = adi.find((a) => Math.abs(a.pago - v) < 0.01);
        if (exato) setSelAdiant({ [exato.id]: true });
      }
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [nota]); // eslint-disable-line

  if (!nota) return null;
  const valorNota = Number(nota.valor_total) || 0;
  const escolhidos = adiantamentos.filter((a) => selAdiant[a.id]);
  const totalAdiant = escolhidos.reduce((s, a) => s + a.pago, 0);
  const subs = dropdowns.subcategorias.filter((s) => form.categoriaId !== 'none' && s.categoria_id === form.categoriaId);

  const confirmar = async () => {
    if (!form.vencimento) return toast({ title: 'Informe o vencimento', variant: 'destructive' });
    if (totalAdiant > valorNota + 0.005) return toast({ title: 'Adiantamentos maiores que a nota', description: `Somam ${brl(totalAdiant)} e a nota é de ${brl(valorNota)}.`, variant: 'destructive' });
    setSalvando(true);
    let notaCriada = null;
    try {
      const cnpj = so(nota.cnpj_emitente);
      let fid = fornecedorId;
      if (!fid) {
        const { data: novo, error: eF } = await supabase.from('fornecedores')
          .insert({ company_id: empresaId, nome: nota.nome_emitente || `Fornecedor ${cnpj}`, cnpj: cnpj || null, ativo: true }).select('id').single();
        if (eF) throw new Error(`Não foi possível cadastrar o fornecedor: ${eF.message}`);
        fid = novo.id;
      }
      const { data: jaTem } = await supabase.from('notas_entrada').select('id').eq('empresa_id', empresaId).eq('chave_acesso', nota.chave).maybeSingle();
      if (jaTem) throw new Error('Esta nota já foi lançada em Entrada de NF.');
      const hoje = new Date().toISOString().slice(0, 10);
      notaCriada = await entradaNFService.saveNota({
        empresa_id: empresaId, fornecedor_id: fid,
        tipo_documento: nota.tipo === 'nfe' ? 'NF-e' : 'NFS-e',
        numero: String(nota.numero || nota.chave.slice(-9)), serie: nota.serie || null, chave_acesso: nota.chave, cnpj_fornecedor: cnpj || null,
        data_emissao: nota.data_emissao ? String(nota.data_emissao).slice(0, 10) : hoje, data_entrada: hoje, data_vencimento: form.vencimento,
        valor_total: valorNota, valor_impostos: 0, valor_liquido: valorNota,
        categoria_id: nulo(form.categoriaId), subcategoria_id: nulo(form.subcategoriaId), centro_custo_id: nulo(form.centroCustoId), condicao_pagamento_id: nulo(form.condicaoId),
        status: 'Pendente', observacoes: 'Importada da Focus NFe (notas recebidas).',
      }, false);
      const cp = await entradaNFService.createContasPagarFromNota(notaCriada, nulo(provisaoId));
      let msg = 'Conta a pagar gerada.';
      if (escolhidos.length) {
        try {
          const r = await vincularAdiantamentos(cp.id, escolhidos);
          msg = `Conta a pagar gerada e ${escolhidos.length} adiantamento(s) vinculado(s) (${brl(r.aplicado)}). Situação: ${r.status === 'pago' ? 'paga' : 'paga parcialmente'}.`;
        } catch (e) {
          toast({ title: 'Nota lançada, mas o adiantamento não foi vinculado', description: e.message, variant: 'destructive' });
          msg = 'Conta a pagar gerada (sem vincular adiantamento).';
        }
      }
      toast({ title: 'Nota lançada', description: msg });
      onDone(notaCriada.id);
    } catch (e) {
      toast({ title: 'Erro ao lançar entrada', description: e.message, variant: 'destructive' });
    }
    setSalvando(false);
  };

  return (
    <Dialog open={!!nota} onOpenChange={(o) => { if (!o && !salvando) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lançar entrada e gerar conta a pagar</DialogTitle>
          <DialogDescription>{nota.tipo === 'nfe' ? 'NF-e' : 'NFS-e'} {nota.numero} de <b>{nota.nome_emitente}</b> — {brl(valorNota)}</DialogDescription>
        </DialogHeader>
        {carregando ? <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div> : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Vencimento *</Label><Input type="date" value={form.vencimento} onChange={(e) => set('vencimento')(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Condição de pagamento</Label>
                <Select value={form.condicaoId} onValueChange={set('condicaoId')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{dropdowns.condicoesPagamento.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
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
              <div className="space-y-2 col-span-2">
                <Label>Centro de custo</Label>
                <Select value={form.centroCustoId} onValueChange={set('centroCustoId')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Nenhum</SelectItem>{dropdowns.centrosCusto.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Provisões deste fornecedor (substituir)</Label>
              {!fornecedorId ? <p className="text-sm text-muted-foreground">Fornecedor ainda não cadastrado — será cadastrado pelo CNPJ. Não há provisões nem adiantamentos para buscar.</p>
                : provisoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma provisão pendente deste fornecedor.</p> : (
                  <div className="border rounded-md divide-y">
                    <label className="flex items-center gap-3 p-2 text-sm cursor-pointer"><input type="radio" checked={provisaoId === 'none'} onChange={() => setProvisaoId('none')} /> Não substituir nenhuma provisão</label>
                    {provisoes.map((p) => (
                      <label key={p.id} className={`flex items-center gap-3 p-2 text-sm cursor-pointer ${provisaoId === p.id ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}>
                        <input type="radio" checked={provisaoId === p.id} onChange={() => setProvisaoId(p.id)} />
                        <span className="flex-1">{p.observacoes || p.numero_titulo || 'Provisão'} <span className="text-muted-foreground">· vence {dt(p.data_vencimento)}</span></span>
                        <b>{brl(p.valor_total)}</b>
                      </label>
                    ))}
                  </div>
                )}
            </div>

            <div className="space-y-2">
              <Label>Adiantamentos já pagos a este fornecedor (vincular)</Label>
              {adiantamentos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum adiantamento pago em aberto.</p> : (
                <div className="border rounded-md divide-y">
                  {adiantamentos.map((a) => (
                    <label key={a.id} className="flex items-center gap-3 p-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={!!selAdiant[a.id]} onChange={(e) => setSelAdiant((s) => ({ ...s, [a.id]: e.target.checked }))} />
                      <span className="flex-1">{a.observacoes || a.numero_titulo} <span className="text-muted-foreground">· pago em {dt(a.baixas?.[0]?.data_baixa)}</span></span>
                      <b>{brl(a.pago)}</b>
                    </label>
                  ))}
                  <div className="p-2 text-sm bg-muted/50 flex justify-between"><span>Adiantado selecionado</span><b>{brl(totalAdiant)} de {brl(valorNota)}{totalAdiant > 0 && totalAdiant < valorNota ? ` — restam ${brl(valorNota - totalAdiant)} a pagar` : ''}</b></div>
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button onClick={confirmar} disabled={salvando || carregando} className="bg-blue-600 hover:bg-blue-700 text-white">{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lançar e gerar conta a pagar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { salvarCartao } from '@/lib/cartaoService';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm w-full';
const vazio = { nome: '', final: '', bandeira: '', limite: '', dia_fechamento: '', dia_vencimento: '', emissor_fornecedor_id: '', banco_id: '', ativo: true };

// Cadastro e edição de cartão de crédito.
const CartaoFormDialog = ({ aberto, onFechar, companyId, cartao, onSalvo }) => {
  const { toast } = useToast();
  const [f, setF] = useState(vazio);
  const [fornecedores, setFornecedores] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto || !companyId) return;
    setF(cartao ? {
      nome: cartao.nome || '', final: cartao.final || '', bandeira: cartao.bandeira || '', limite: cartao.limite ?? '',
      dia_fechamento: cartao.dia_fechamento ?? '', dia_vencimento: cartao.dia_vencimento ?? '',
      emissor_fornecedor_id: cartao.emissor_fornecedor_id || '', banco_id: cartao.banco_id || '', ativo: cartao.ativo !== false
    } : vazio);
    Promise.all([
      supabase.from('fornecedores').select('id, nome').eq('company_id', companyId).order('nome'),
      supabase.from('bancos').select('id, nome, agencia, conta').eq('company_id', companyId).eq('ativo', true).order('nome')
    ]).then(([fo, ba]) => { setFornecedores(fo.data || []); setBancos(ba.data || []); });
  }, [aberto, companyId, cartao]);

  const muda = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const salvar = async () => {
    const fech = Number(f.dia_fechamento); const venc = Number(f.dia_vencimento);
    if (!f.nome.trim()) { toast({ title: 'Dê um nome ao cartão', variant: 'destructive' }); return; }
    if (!(fech >= 1 && fech <= 31) || !(venc >= 1 && venc <= 31)) { toast({ title: 'Informe os dias de fechamento e de vencimento (1 a 31)', variant: 'destructive' }); return; }
    setSalvando(true);
    try {
      // a fatura é paga na categoria "pagamento de fatura de cartão" do plano (acha pelo nome); pode ser trocada depois
      let categoria_fatura_id = cartao?.categoria_fatura_id || null; let subcategoria_fatura_id = cartao?.subcategoria_fatura_id || null;
      if (!subcategoria_fatura_id) {
        const { data: s } = await supabase.from('subcategorias').select('id, categoria_id, nome').eq('company_id', companyId).ilike('nome', '%fatura%cart%').limit(1);
        if (s?.[0]) { subcategoria_fatura_id = s[0].id; categoria_fatura_id = s[0].categoria_id; }
      }
      const salvo = await salvarCartao(companyId, {
        nome: f.nome.trim(), final: f.final.trim() || null, bandeira: f.bandeira.trim() || null, limite: Number(f.limite) || 0,
        dia_fechamento: fech, dia_vencimento: venc, emissor_fornecedor_id: f.emissor_fornecedor_id || null, banco_id: f.banco_id || null,
        categoria_fatura_id, subcategoria_fatura_id, ativo: f.ativo
      }, cartao?.id);
      toast({ title: cartao ? 'Cartão atualizado' : 'Cartão cadastrado' });
      onSalvo?.(salvo);
      onFechar();
    } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{cartao ? 'Editar cartão' : 'Novo cartão de crédito'}</DialogTitle>
          <DialogDescription>Os dias de fechamento e vencimento definem em qual fatura cada compra cai.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label className="text-xs">Nome do cartão *</Label><Input value={f.nome} onChange={(e) => muda('nome', e.target.value)} placeholder="ex.: Santander AAdvantage Black" /></div>
          <div><Label className="text-xs">Final do cartão</Label><Input value={f.final} onChange={(e) => muda('final', e.target.value)} placeholder="7383" maxLength={4} /></div>
          <div><Label className="text-xs">Bandeira</Label><Input value={f.bandeira} onChange={(e) => muda('bandeira', e.target.value)} placeholder="Mastercard, Visa…" /></div>
          <div><Label className="text-xs">Limite (R$)</Label><Input type="number" min="0" step="0.01" value={f.limite} onChange={(e) => muda('limite', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Dia do fechamento *</Label><Input type="number" min="1" max="31" value={f.dia_fechamento} onChange={(e) => muda('dia_fechamento', e.target.value)} /></div>
            <div><Label className="text-xs">Dia do vencimento *</Label><Input type="number" min="1" max="31" value={f.dia_vencimento} onChange={(e) => muda('dia_vencimento', e.target.value)} /></div>
          </div>
          <div><Label className="text-xs">Emissor (fornecedor)</Label>
            <select className={sel} value={f.emissor_fornecedor_id} onChange={(e) => muda('emissor_fornecedor_id', e.target.value)}><option value="">— nenhum —</option>{fornecedores.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></div>
          <div><Label className="text-xs">Conta de pagamento da fatura</Label>
            <select className={sel} value={f.banco_id} onChange={(e) => muda('banco_id', e.target.value)}><option value="">— nenhuma —</option>{bancos.map((x) => <option key={x.id} value={x.id}>{x.nome}{x.conta ? ` · ${x.conta}` : ''}</option>)}</select></div>
          <label className="flex items-center gap-2 text-sm md:col-span-2"><Checkbox checked={f.ativo} onCheckedChange={(v) => muda('ativo', v === true)} /> Cartão ativo</label>
        </div>
        <DialogFooter><Button variant="outline" onClick={onFechar}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CartaoFormDialog;

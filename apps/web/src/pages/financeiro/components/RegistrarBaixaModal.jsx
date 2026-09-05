import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { DollarSign, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';

const RegistrarBaixaModal = ({ isOpen, onClose, titulo, onSuccess }) => {
  const { toast } = useToast();
  const dropdowns = useFinanceiroDropdowns();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    data_baixa: new Date().toISOString().split('T')[0],
    valor_pago: '',
    banco_id: '',
    tipo_pagamento_id: '',
    observacoes: ''
  });

  useEffect(() => {
    if (isOpen && titulo) {
        setFormData(prev => ({
            ...prev,
            valor_pago: titulo.valor || '',
            banco_id: titulo.banco_id || '', // Pre-fill Banco
            tipo_pagamento_id: titulo.tipo_pagamento_id || '', // Pre-fill Tipo Pagamento
            observacoes: ''
        }));
    }
  }, [isOpen, titulo]);

  const handleSubmit = async () => {
    if (!formData.valor_pago) return toast({ title: 'Erro', description: 'Informe o valor pago.', variant: 'destructive' });
    if (!formData.data_baixa) return toast({ title: 'Erro', description: 'Informe a data.', variant: 'destructive' });
    if (!formData.banco_id) return toast({ title: 'Erro', description: 'Selecione o banco.', variant: 'destructive' });

    setLoading(true);
    try {
        const isPagar = titulo.tipo_geral === 'PAGAR';
        const statusBaixa = isPagar ? 'Pago' : 'Recebido';
        const valorField = isPagar ? 'valor_pago' : 'valor_recebido';
        const mainTable = isPagar ? 'contas_pagar' : 'contas_receber';
        const historyTable = isPagar ? 'contas_pagar_baixas' : 'contas_receber_baixas';

        // 1. Update Main Table with new values
        const { error: updateError } = await supabase
            .from(mainTable)
            .update({
                status: statusBaixa,
                [valorField]: parseFloat(formData.valor_pago),
                banco_id: formData.banco_id,
                tipo_pagamento_id: formData.tipo_pagamento_id || null
            })
            .eq('id', titulo.id);
            
        if (updateError) throw updateError;

        // 2. Insert into History Table
        const historyPayload = {
            conta_id: titulo.id,
            banco_id: formData.banco_id,
            observacoes: formData.observacoes,
            [isPagar ? 'data_pagamento' : 'data_recebimento']: formData.data_baixa,
            [isPagar ? 'valor_pago' : 'valor_recebido']: parseFloat(formData.valor_pago)
        };

        const { error: historyError } = await supabase.from(historyTable).insert([historyPayload]);
        if (historyError) throw historyError;
        
        toast({ title: 'Sucesso', description: 'Baixa registrada com sucesso.' });
        if (onSuccess) onSuccess();
        onClose();

    } catch (error) {
        console.error("Erro ao registrar baixa:", error);
        toast({ title: 'Erro', description: 'Falha ao registrar baixa: ' + error.message, variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  if (!titulo) return null;
  const isPagar = titulo.tipo_geral === 'PAGAR';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <div className={`p-2 rounded-full ${isPagar ? 'bg-red-900/20 text-red-500' : 'bg-emerald-900/20 text-emerald-500'}`}>
                  <DollarSign className="h-6 w-6" />
              </div>
              Registrar {isPagar ? 'Pagamento' : 'Recebimento'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-2 space-y-6">
           <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">{isPagar ? 'Fornecedor' : 'Cliente'}</Label>
                    <p className="font-semibold text-lg text-white truncate">{titulo.entidadeNome}</p>
                </div>
                <div>
                    <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Título</Label>
                    <p className="font-mono text-slate-300 text-base">{titulo.numeroDisplay}</p>
                </div>
                <div>
                    <Label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Valor Original</Label>
                    <p className={`font-bold text-base ${isPagar ? 'text-red-400' : 'text-emerald-400'}`}>
                        R$ {parseFloat(titulo.valor || 0).toFixed(2)}
                    </p>
                </div>
           </div>

           <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-slate-300">Data da Baixa *</Label>
                        <Input 
                            type="date" 
                            className="bg-slate-900 border-slate-700 text-slate-100 h-11"
                            value={formData.data_baixa}
                            onChange={e => setFormData({...formData, data_baixa: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300">Valor {isPagar ? 'Pago' : 'Recebido'} (R$) *</Label>
                        <Input 
                            type="number" 
                            step="0.01"
                            className="bg-slate-900 border-slate-700 font-bold text-lg h-11 text-white"
                            value={formData.valor_pago}
                            onChange={e => setFormData({...formData, valor_pago: e.target.value})}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-slate-300">Banco *</Label>
                        <Select value={formData.banco_id} onValueChange={v => setFormData({...formData, banco_id: v})}>
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100 h-11">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {dropdowns.bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300">Tipo de Pagamento</Label>
                        <Select value={formData.tipo_pagamento_id} onValueChange={v => setFormData({...formData, tipo_pagamento_id: v})}>
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100 h-11">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {dropdowns.tiposPagamento.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-300">Observações</Label>
                    <Textarea 
                        className="bg-slate-900 border-slate-700 resize-none text-slate-100"
                        rows={3}
                        placeholder="Detalhes adicionais sobre a baixa..."
                        value={formData.observacoes}
                        onChange={e => setFormData({...formData, observacoes: e.target.value})}
                    />
                </div>
           </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} className="hover:bg-slate-800 text-slate-400">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className={`${isPagar ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white shadow-lg`}>
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirmar Baixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrarBaixaModal;
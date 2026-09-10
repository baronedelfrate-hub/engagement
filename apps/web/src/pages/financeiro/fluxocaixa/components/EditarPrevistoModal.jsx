import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { useToast } from '@/components/ui/use-toast';

const EditarPrevistoModal = ({ isOpen, onClose, onSave }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    dataVencimento: new Date().toISOString().split('T')[0],
    tipo: 'SAIDA' // ENTRADA or SAIDA
  });

  const handleSubmit = async () => {
    if (!formData.descricao || !formData.valor) return;

    setSaving(true);
    try {
      const tabela = formData.tipo === 'ENTRADA' ? 'contas_receber' : 'contas_pagar';
      const { error } = await insertWithCompanyId(tabela, {
        numero: `MAN-${Date.now()}`,
        observacoes: formData.descricao,
        valor_original: parseFloat(formData.valor),
        data_emissao: new Date().toISOString().split('T')[0],
        data_vencimento: formData.dataVencimento,
        status: 'Pendente',
      });
      if (error) throw error;

      toast({ title: "Lançamento Previsto Criado", description: "O item foi adicionado ao fluxo." });
      onSave?.();
      onClose();
    } catch (error) {
      console.error('[EditarPrevistoModal] Erro ao salvar lançamento:', error);
      toast({ title: "Erro", description: "Não foi possível salvar o lançamento.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Lançamento Previsto</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={v => setFormData({...formData, tipo: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ENTRADA">Entrada (Receita)</SelectItem>
                        <SelectItem value="SAIDA">Saída (Despesa)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} />
            </div>
            <div className="space-y-2">
                <Label>Valor Previsto (R$)</Label>
                <Input type="number" step="0.01" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})} />
            </div>
            <div className="space-y-2">
                <Label>Data Prevista</Label>
                <Input type="date" value={formData.dataVencimento} onChange={e => setFormData({...formData, dataVencimento: e.target.value})} />
            </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditarPrevistoModal;
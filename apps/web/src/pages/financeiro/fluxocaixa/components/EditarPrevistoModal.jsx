import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

const EditarPrevistoModal = ({ isOpen, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    dataVencimento: new Date().toISOString().split('T')[0],
    tipo: 'SAIDA' // ENTRADA or SAIDA
  });

  const handleSubmit = () => {
    if (!formData.descricao || !formData.valor) return;

    // Create a manual Provision (Conta a Pagar/Receber)
    const collection = formData.tipo === 'ENTRADA' ? 'CONTAS_RECEBER' : 'CONTAS_PAGAR';
    const newItem = {
        id: `manual_${Date.now()}`,
        numeroTitulo: `MAN-${Date.now()}`,
        descricao: formData.descricao,
        valorTotal: parseFloat(formData.valor),
        dataVencimento: formData.dataVencimento,
        status: 'Aberto',
        categoriaNome: 'Manual',
        createdAt: new Date().toISOString()
    };

    storage.add(collection, newItem);
    toast({ title: "Lançamento Previsto Criado", description: "O item foi adicionado ao fluxo." });
    onSuccess();
    onClose();
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
            <Button onClick={handleSubmit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditarPrevistoModal;
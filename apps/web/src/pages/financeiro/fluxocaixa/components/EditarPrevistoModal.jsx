import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { useToast } from '@/components/ui/use-toast';

const EditarPrevistoModal = ({ isOpen, onClose, onSave, data, centrosCusto = [] }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    descricao: '',
    categoria: '',
    valor: '',
    data_movimentacao: new Date().toISOString().split('T')[0],
    tipo: 'Receita',
    centro_custo_id: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        descricao: '',
        categoria: '',
        valor: data?.currentValue ? String(data.currentValue) : '',
        data_movimentacao: data?.dayKey || new Date().toISOString().split('T')[0],
        tipo: 'Receita',
        centro_custo_id: data?.centroCustoId && data.centroCustoId !== 'sem-centro' ? data.centroCustoId : '',
      });
    }
  }, [isOpen, data]);

  const handleSubmit = async () => {
    if (!formData.descricao || !formData.valor) {
      toast({ title: "Preencha descrição e valor", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await insertWithCompanyId('fluxo_caixa_movimentacoes', {
        data_movimentacao: formData.data_movimentacao,
        tipo: formData.tipo,
        categoria: formData.categoria || 'Sem categoria',
        valor: parseFloat(formData.valor),
        descricao: formData.descricao,
        centro_custo_id: formData.centro_custo_id || null,
        status: 'Previsto',
      });
      if (error) throw error;

      toast({ title: "Lançamento Previsto Criado", description: "O item foi adicionado ao fluxo de caixa." });
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
                        <SelectItem value="Receita">Entrada (Receita)</SelectItem>
                        <SelectItem value="Despesa">Saída (Despesa)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Centro de Custo</Label>
                <Select value={formData.centro_custo_id} onValueChange={v => setFormData({...formData, centro_custo_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Sem centro de custo" /></SelectTrigger>
                    <SelectContent>
                        {centrosCusto.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.nome}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} placeholder="Ex: Faturamento de Vendas" />
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
                <Input type="date" value={formData.data_movimentacao} onChange={e => setFormData({...formData, data_movimentacao: e.target.value})} />
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

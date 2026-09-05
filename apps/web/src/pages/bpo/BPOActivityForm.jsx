import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { useToast } from '@/components/ui/use-toast';

const BPOActivityForm = ({ isOpen, onClose, faseId, blockId, activity }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    descricao: '',
    status: 'Pendente',
    ordem: 0
  });

  useEffect(() => {
    if (activity) {
      setFormData({ descricao: activity.descricao, status: activity.status, ordem: activity.ordem });
    } else {
      setFormData({ descricao: '', status: 'Pendente', ordem: 0 });
    }
  }, [activity, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activity) {
        await supabase.from('bpo_atividades').update(formData).eq('id', activity.id);
        toast({ title: 'Sucesso', description: 'Atividade atualizada.' });
      } else {
        await insertWithCompanyId('bpo_atividades', {
          ...formData,
          bpo_fase_id: faseId,
          bpo_bloco_id: blockId
        });
        toast({ title: 'Sucesso', description: 'Atividade criada.' });
      }
      onClose();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{activity ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={val => setFormData({...formData, status: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                        <SelectItem value="Concluído">Concluído</SelectItem>
                    </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>Ordem</Label>
                <Input type="number" value={formData.ordem} onChange={e => setFormData({...formData, ordem: parseInt(e.target.value)})} />
             </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BPOActivityForm;
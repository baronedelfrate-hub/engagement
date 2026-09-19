import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { Button } from '@/components/ui/button';
import { Trash2, Download, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import RHDocumentUploader from '@/components/RHDocumentUploader';
import { formatDateOnly } from '@/lib/dateUtils';
import { useToast } from '@/components/ui/use-toast';

const RHFeriasList = ({ funcionarioId }) => {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ data_inicio: '', data_fim: '', dias_gozados: 0, arquivo_comprovante: '' });

  useEffect(() => { fetchItems(); }, [funcionarioId]);

  const fetchItems = async () => {
    const { data } = await supabase.from('rh_ferias').select('*').eq('funcionario_id', funcionarioId).order('data_inicio', {ascending: false});
    setItems(data || []);
  };

  const handleSave = async () => {
    if (!newItem.data_inicio || !newItem.data_fim) {
      toast({ title: 'Erro', description: 'Informe as datas de início e fim.', variant: 'destructive' });
      return;
    }
    const { error } = await insertWithCompanyId('rh_ferias', {
        funcionario_id: funcionarioId,
        ...newItem,
        arquivo_comprovante: newItem.arquivo_comprovante || null,
        status: 'Concluída'
    });
    if (error) {
      toast({ title: 'Erro', description: error.message || 'Não foi possível registrar as férias.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Sucesso', description: 'Férias registradas.' });
    setModalOpen(false);
    fetchItems();
  };

  const handleDelete = async (id) => {
    await supabase.from('rh_ferias').delete().eq('id', id);
    fetchItems();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-semibold">Histórico de Férias</h3>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4"/> Registrar Férias</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Registro de Férias</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Início</Label><Input type="date" onChange={e => setNewItem({...newItem, data_inicio: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Fim</Label><Input type="date" onChange={e => setNewItem({...newItem, data_fim: e.target.value})} /></div>
                    </div>
                    <div className="space-y-2"><Label>Dias Gozados</Label><Input type="number" onChange={e => setNewItem({...newItem, dias_gozados: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Comprovante</Label><RHDocumentUploader onUploadComplete={url => setNewItem({...newItem, arquivo_comprovante: url})} /></div>
                    <Button onClick={handleSave} className="w-full">Salvar</Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-2">
        {items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded bg-background">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-medium">{formatDateOnly(item.data_inicio)} a {formatDateOnly(item.data_fim)}</p>
                        <Badge variant="outline">{item.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.dias_gozados} dias</p>
                </div>
                <div className="flex gap-2">
                    {item.arquivo_comprovante && <Button variant="ghost" size="icon" onClick={() => window.open(item.arquivo_comprovante, '_blank')}><Download className="h-4 w-4"/></Button>}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default RHFeriasList;
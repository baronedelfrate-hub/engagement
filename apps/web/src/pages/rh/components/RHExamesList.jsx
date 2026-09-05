import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { Button } from '@/components/ui/button';
import { Trash2, Download, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { calculateExamStatus, getAlertColor } from '@/lib/rhUtils';
import RHDocumentUploader from '@/components/RHDocumentUploader';

const RHExamesList = ({ funcionarioId }) => {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ tipo_exame: 'Admissional', data_exame: '', proxima_data: '', arquivo_url: '' });

  useEffect(() => { fetchItems(); }, [funcionarioId]);

  const fetchItems = async () => {
    const { data } = await supabase.from('rh_exames_ocupacionais').select('*').eq('funcionario_id', funcionarioId);
    setItems(data || []);
  };

  const handleSave = async () => {
    const status = calculateExamStatus(newItem.proxima_data);
    await insertWithCompanyId('rh_exames_ocupacionais', { funcionario_id: funcionarioId, ...newItem, status });
    setModalOpen(false);
    fetchItems();
  };

  const handleDelete = async (id) => {
    await supabase.from('rh_exames_ocupacionais').delete().eq('id', id);
    fetchItems();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-semibold">Exames Ocupacionais</h3>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4"/> Novo Exame</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Novo Exame</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select onValueChange={v => setNewItem({...newItem, tipo_exame: v})} defaultValue={newItem.tipo_exame}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Admissional">Admissional</SelectItem>
                                <SelectItem value="Periódico">Periódico</SelectItem>
                                <SelectItem value="Demissional">Demissional</SelectItem>
                                <SelectItem value="Retorno">Retorno ao Trabalho</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Data Exame</Label><Input type="date" onChange={e => setNewItem({...newItem, data_exame: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Próximo Exame</Label><Input type="date" onChange={e => setNewItem({...newItem, proxima_data: e.target.value})} /></div>
                    </div>
                    <div className="space-y-2"><Label>Arquivo</Label><RHDocumentUploader onUploadComplete={url => setNewItem({...newItem, arquivo_url: url})} /></div>
                    <Button onClick={handleSave} className="w-full">Salvar</Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-2">
        {items.map(item => {
            const status = calculateExamStatus(item.proxima_data);
            return (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded bg-white dark:bg-slate-950">
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-medium">{item.tipo_exame}</p>
                            <Badge className={getAlertColor(status)} variant="outline">{status}</Badge>
                        </div>
                        <p className="text-xs text-gray-500">Realizado: {new Date(item.data_exame).toLocaleDateString()} | Vencimento: {item.proxima_data ? new Date(item.proxima_data).toLocaleDateString() : '-'}</p>
                    </div>
                    <div className="flex gap-2">
                        {item.arquivo_url && <Button variant="ghost" size="icon" onClick={() => window.open(item.arquivo_url, '_blank')}><Download className="h-4 w-4"/></Button>}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};

export default RHExamesList;
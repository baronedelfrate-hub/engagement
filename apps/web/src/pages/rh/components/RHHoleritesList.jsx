import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { Button } from '@/components/ui/button';
import { Trash2, Download, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RHDocumentUploader from '@/components/RHDocumentUploader';

const RHHoleritesList = ({ funcionarioId }) => {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ mes_ano: '', valor_bruto: '', valor_liquido: '', arquivo_url: '' });

  useEffect(() => { fetchItems(); }, [funcionarioId]);

  const fetchItems = async () => {
    const { data } = await supabase.from('rh_holerites').select('*').eq('funcionario_id', funcionarioId).order('mes_ano', {ascending: false});
    setItems(data || []);
  };

  const handleSave = async () => {
    await insertWithCompanyId('rh_holerites', { funcionario_id: funcionarioId, ...newItem });
    setModalOpen(false);
    fetchItems();
  };

  const handleDelete = async (id) => {
    await supabase.from('rh_holerites').delete().eq('id', id);
    fetchItems();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-semibold">Holerites</h3>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4"/> Adicionar</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Novo Holerite</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label>Mês/Ano (Ex: 01/2024)</Label><Input onChange={e => setNewItem({...newItem, mes_ano: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Valor Bruto</Label><Input type="number" step="0.01" onChange={e => setNewItem({...newItem, valor_bruto: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Valor Líquido</Label><Input type="number" step="0.01" onChange={e => setNewItem({...newItem, valor_liquido: e.target.value})} /></div>
                    </div>
                    <div className="space-y-2"><Label>Arquivo</Label><RHDocumentUploader onUploadComplete={url => setNewItem({...newItem, arquivo_url: url})} /></div>
                    <Button onClick={handleSave} className="w-full">Salvar</Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-2">
        {items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded bg-white dark:bg-slate-950">
                <div>
                    <p className="font-medium">{item.mes_ano}</p>
                    <p className="text-xs text-gray-500">Líquido: R$ {Number(item.valor_liquido).toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                    {item.arquivo_url && <Button variant="ghost" size="icon" onClick={() => window.open(item.arquivo_url, '_blank')}><Download className="h-4 w-4"/></Button>}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default RHHoleritesList;
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { Button } from '@/components/ui/button';
import { Trash2, Download, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { calculateExamStatus, getAlertColor } from '@/lib/rhUtils';
import RHDocumentUploader from '@/components/RHDocumentUploader';

const RHNRList = ({ funcionarioId }) => {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ nr_numero: '', data_validade: '', arquivo_url: '' });

  useEffect(() => { fetchItems(); }, [funcionarioId]);

  const fetchItems = async () => {
    const { data } = await supabase.from('rh_nr_controle').select('*').eq('funcionario_id', funcionarioId);
    setItems(data || []);
  };

  const handleSave = async () => {
    await insertWithCompanyId('rh_nr_controle', { funcionario_id: funcionarioId, ...newItem });
    setModalOpen(false);
    fetchItems();
  };

  const handleDelete = async (id) => {
    await supabase.from('rh_nr_controle').delete().eq('id', id);
    fetchItems();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="text-lg font-semibold">Controle de NRs</h3>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4"/> Nova NR</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Registro de NR</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label>NR (Ex: NR-10)</Label><Input onChange={e => setNewItem({...newItem, nr_numero: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Validade</Label><Input type="date" onChange={e => setNewItem({...newItem, data_validade: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Certificado</Label><RHDocumentUploader onUploadComplete={url => setNewItem({...newItem, arquivo_url: url})} /></div>
                    <Button onClick={handleSave} className="w-full">Salvar</Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-2">
        {items.map(item => {
            const status = calculateExamStatus(item.data_validade);
            return (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded bg-background">
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-medium">{item.nr_numero}</p>
                            <Badge className={getAlertColor(status)} variant="outline">{status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Validade: {new Date(item.data_validade).toLocaleDateString()}</p>
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

export default RHNRList;
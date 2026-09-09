import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { Button } from '@/components/ui/button';
import { Trash2, Download, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import RHDocumentUploader from '@/components/RHDocumentUploader';

const RHDocumentosList = ({ funcionarioId, tipo }) => {
  const { toast } = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDoc, setNewDoc] = useState({ nome_arquivo: '', arquivo_url: '', descricao: '' });
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, [funcionarioId, tipo]);

  const fetchDocs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rh_documentos')
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .eq('tipo_documento', tipo);
    setDocs(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!newDoc.nome_arquivo || !newDoc.arquivo_url) return;
    
    const { error } = await insertWithCompanyId('rh_documentos', {
      funcionario_id: funcionarioId,
      tipo_documento: tipo,
      ...newDoc
    });

    if (!error) {
      toast({ title: 'Sucesso', description: 'Documento salvo.' });
      setModalOpen(false);
      setNewDoc({ nome_arquivo: '', arquivo_url: '', descricao: '' });
      fetchDocs();
    }
  };

  const handleDelete = async (id) => {
      await supabase.from('rh_documentos').delete().eq('id', id);
      fetchDocs();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Documentos de {tipo}</h3>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4"/> Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Documento</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label>Nome do Documento</Label>
                 <Input value={newDoc.nome_arquivo} onChange={e => setNewDoc({...newDoc, nome_arquivo: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <Label>Descrição</Label>
                 <Input value={newDoc.descricao} onChange={e => setNewDoc({...newDoc, descricao: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <Label>Arquivo</Label>
                 <RHDocumentUploader onUploadComplete={(url) => setNewDoc({...newDoc, arquivo_url: url})} />
               </div>
               <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2">
        {docs.map(doc => (
          <div key={doc.id} className="flex items-center justify-between p-3 border rounded bg-background">
            <div>
              <p className="font-medium">{doc.nome_arquivo}</p>
              <p className="text-xs text-muted-foreground">{new Date(doc.data_upload).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => window.open(doc.arquivo_url, '_blank')}><Download className="h-4 w-4"/></Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
            </div>
          </div>
        ))}
        {docs.length === 0 && <p className="text-muted-foreground text-sm">Nenhum documento.</p>}
      </div>
    </div>
  );
};

export default RHDocumentosList;
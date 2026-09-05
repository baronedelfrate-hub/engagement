import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { Loader2 } from 'lucide-react';

export function ActionDialog({ open, onOpenChange, title, description, actionType, documents, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const { toast } = useToast();

  const handleAction = async () => {
    if (!documents || documents.length === 0) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const docsToUpdate = Array.isArray(documents) ? documents : [documents];
      const ids = docsToUpdate.map(d => d.id);
      
      let newStatus = '';
      let updatePayload = { observacoes };

      switch (actionType) {
        case 'enviar':
          newStatus = 'Enviado';
          updatePayload = { status: newStatus, data_envio: new Date().toISOString().split('T')[0] };
          break;
        case 'conferir':
          newStatus = 'Conferido';
          updatePayload = { status: newStatus, data_conferencia: new Date().toISOString().split('T')[0] };
          break;
        case 'separar':
          newStatus = 'Separado';
          updatePayload = { status: newStatus };
          break;
        case 'ajustar':
          newStatus = 'Ajuste solicitado';
          updatePayload = { status: newStatus };
          break;
        default:
          throw new Error('Ação inválida');
      }

      // Update documents
      const { error: updateError } = await supabase
        .from('documentos_contabilidade')
        .update(updatePayload)
        .in('id', ids);

      if (updateError) throw updateError;

      // Add to history
      const historyRecords = docsToUpdate.map(doc => ({
        documento_id: doc.id,
        acao: `Status alterado para ${newStatus}`,
        status_anterior: doc.status,
        status_novo: newStatus,
        usuario_id: user?.id,
        observacoes
      }));

      const { error: historyError } = await insertWithCompanyId('documentos_historico', historyRecords);

      if (historyError) throw historyError;

      toast({ title: 'Sucesso', description: `${ids.length} documento(s) atualizado(s) com sucesso.` });
      onComplete();
      onOpenChange(false);
      setObservacoes('');

    } catch (error) {
      console.error('Error executing action:', error);
      toast({ title: 'Erro', description: 'Ocorreu um erro ao atualizar os documentos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Observações (opcional)</label>
            <Textarea 
              placeholder="Adicione uma nota sobre esta ação..." 
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleAction} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
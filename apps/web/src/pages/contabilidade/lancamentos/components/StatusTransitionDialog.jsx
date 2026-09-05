import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { getStatusColor } from '../utils/lancamentosUtils';
import { Badge } from '@/components/ui/badge';

export default function StatusTransitionDialog({ open, onOpenChange, currentStatus, newStatus, onConfirm, loading }) {
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(notes);
    setNotes('');
  };

  const getTitle = () => {
    switch (newStatus) {
      case 'Pendente': return 'Submeter para Revisão';
      case 'Conferido': return 'Aprovar Lançamento';
      case 'Exportado': return 'Exportar Lançamento';
      case 'Rascunho': return 'Reverter para Rascunho';
      default: return `Alterar Status para ${newStatus}`;
    }
  };

  const getDescription = () => {
    switch (newStatus) {
      case 'Pendente': return 'O lançamento passará para o status Pendente e ficará disponível para conferência.';
      case 'Conferido': return 'Você está atestando que o lançamento está correto e pronto para exportação.';
      case 'Exportado': return 'Marcar este lançamento como já integrado/exportado para o sistema contábil principal.';
      case 'Rascunho': return 'O lançamento voltará a ser editável. Por favor, insira o motivo da reversão.';
      default: return 'Confirma a alteração de status?';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">De:</span>
              <Badge className={getStatusColor(currentStatus)}>{currentStatus}</Badge>
            </div>
            <div className="text-slate-400">→</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Para:</span>
              <Badge className={getStatusColor(newStatus)}>{newStatus}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Observações (Opcional)</label>
            <Textarea 
              placeholder="Adicione um comentário ou justificativa..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Confirmar Alteração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2 } from 'lucide-react';

export function CancelNfeDialog({ isOpen, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!motivo || motivo.length < 15) return;
    setLoading(true);
    await onConfirm(motivo);
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar NF-e</DialogTitle>
          <DialogDescription>
            Informe o motivo do cancelamento (mínimo 15 caracteres). Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea 
            placeholder="Motivo do cancelamento..." 
            value={motivo} 
            onChange={(e) => setMotivo(e.target.value)}
            className="text-slate-900"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Voltar</Button>
          <Button onClick={handleConfirm} disabled={loading || motivo.length < 15} className="bg-red-600 hover:bg-red-700 text-white">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar Cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmActionDialog({ isOpen, onClose, onConfirm, title, description, loading }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
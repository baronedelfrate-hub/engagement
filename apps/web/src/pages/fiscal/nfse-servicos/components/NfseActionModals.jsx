import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function ConfirmActionDialog({ isOpen, onClose, onConfirm, title, description, loading }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-slate-600">{description}</DialogDescription>
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
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PendenciasStatusActions({ 
  open, 
  onOpenChange, 
  actionType, 
  onConfirm, 
  loading,
  users = []
}) {
  const [notes, setNotes] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  const handleConfirm = () => {
    let extraData = {};
    if (actionType === 'iniciar' && responsavelId) {
      extraData.responsavel_id = responsavelId;
    }
    if (actionType === 'cancelar') {
      extraData.motivo_cancelamento = motivoCancelamento;
    }

    let newStatus = '';
    switch(actionType) {
      case 'iniciar': newStatus = 'Em tratamento'; break;
      case 'aguardando': newStatus = 'Aguardando cliente'; break;
      case 'resolver': newStatus = 'Resolvida'; break;
      case 'cancelar': newStatus = 'Cancelada'; break;
      default: break;
    }

    onConfirm(newStatus, notes, extraData);
    setNotes('');
    setMotivoCancelamento('');
  };

  const getDialogContent = () => {
    switch(actionType) {
      case 'iniciar':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Iniciar Tratamento</DialogTitle>
              <DialogDescription>A pendência passará para o status "Em tratamento".</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Responsável (Opcional)</Label>
                <Select value={responsavelId} onValueChange={setResponsavelId}>
                  <SelectTrigger><SelectValue placeholder="Atribuir a..." /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.nome || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observações Iniciais</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações sobre o início do tratamento..." />
              </div>
            </div>
          </>
        );
      case 'aguardando':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Aguardando Cliente</DialogTitle>
              <DialogDescription>O que estamos aguardando do cliente?</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Detalhes da Solicitação *</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Aguardando envio da nota fiscal correta..." className="min-h-[100px]" />
              </div>
            </div>
          </>
        );
      case 'resolver':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Resolver Pendência</DialogTitle>
              <DialogDescription>Confirma a resolução desta pendência?</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Anotações da Resolução *</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Como foi resolvido?" className="min-h-[100px]" />
              </div>
            </div>
          </>
        );
      case 'cancelar':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Cancelar Pendência</DialogTitle>
              <DialogDescription>A pendência será marcada como cancelada.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Motivo do Cancelamento *</Label>
                <Input value={motivoCancelamento} onChange={(e) => setMotivoCancelamento(e.target.value)} placeholder="Ex: Duplicidade, Erro de preenchimento..." />
              </div>
              <div className="space-y-2">
                <Label>Observações Adicionais</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes opcionais..." />
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const isConfirmDisabled = loading || 
    (actionType === 'aguardando' && !notes.trim()) || 
    (actionType === 'resolver' && !notes.trim()) || 
    (actionType === 'cancelar' && !motivoCancelamento.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {getDialogContent()}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isConfirmDisabled} className={
            actionType === 'resolver' ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
            actionType === 'cancelar' ? "bg-red-600 hover:bg-red-700 text-white" :
            "bg-blue-600 hover:bg-blue-700 text-white"
          }>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
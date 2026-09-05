import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, RotateCcw, X } from 'lucide-react';

const EstornarBaixaModal = ({ isOpen, onClose, onConfirm, titulo, loading = false }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  if (!titulo) return null;

  const tipoLabel = titulo.tipo_geral === 'PAGAR' ? 'Pagamento' : 'Recebimento';
  const entidadeLabel = titulo.tipo_geral === 'PAGAR' ? 'Fornecedor' : 'Cliente';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-500">
            <RotateCcw className="h-5 w-5" />
            Estornar Baixa
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Confirme a operação para reverter esta baixa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="bg-orange-500/10 border-orange-500/30 text-orange-400">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <strong>Atenção:</strong> Tem certeza que deseja estornar esta baixa?
            </AlertDescription>
          </Alert>

          <div className="bg-slate-800 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Tipo:</span>
              <span className="font-medium">{tipoLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Título:</span>
              <span className="font-mono font-medium">{titulo.numeroDisplay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{entidadeLabel}:</span>
              <span className="font-medium">{titulo.entidadeNome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Valor:</span>
              <span className={`font-bold ${titulo.tipo_geral === 'PAGAR' ? 'text-red-400' : 'text-emerald-400'}`}>
                R$ {titulo.valor.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status Atual:</span>
              <span className="font-medium text-emerald-400">{titulo.status}</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-sm text-slate-300">
              Após estornar, o título voltará para status <strong className="text-yellow-400">"Aberto"</strong> e 
              todos os registros de baixa serão removidos.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing || loading}
            className="border-slate-600 hover:bg-slate-800"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || loading}
            className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-900/20"
          >
            {(isProcessing || loading) ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Estornando...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Confirmar Estorno
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EstornarBaixaModal;
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText, ShoppingBag, Briefcase } from 'lucide-react';
import { useGerarNF } from '@/hooks/useGerarNF';
import { formatDateOnly } from '@/lib/dateUtils';

export default function GerarNFModal({ isOpen, onClose, pedido }) {
  const { isLoading, hasProducts, hasServices, generateNFe, generateNFSe } = useGerarNF(pedido?.id);

  if (!pedido) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gerar Nota Fiscal</DialogTitle>
          <DialogDescription>
            Selecione o tipo de nota fiscal que deseja gerar para este pedido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-3 rounded-md border text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground">Pedido:</div>
              <div className="font-medium text-right">{pedido.numero}</div>
              
              <div className="text-muted-foreground">Cliente:</div>
              <div className="font-medium text-right truncate" title={pedido.clientes?.nome}>
                {pedido.clientes?.nome}
              </div>
              
              <div className="text-muted-foreground">Data Emissão:</div>
              <div className="font-medium text-right">
                {formatDateOnly(pedido.data_emissao)}
              </div>
              
              <div className="text-muted-foreground">Valor Total:</div>
              <div className="font-medium text-right text-primary">
                R$ {(pedido.valor_total || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Opções de Faturamento</h4>
            
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-3">
                {hasProducts && (
                  <Button 
                    onClick={generateNFe} 
                    className="w-full justify-start h-12 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <ShoppingBag className="w-5 h-5 mr-3" />
                    <div className="flex flex-col items-start">
                      <span>Gerar NF-e (Produtos)</span>
                      <span className="text-xs font-normal opacity-80">Modelo 55 - Mercadorias</span>
                    </div>
                  </Button>
                )}

                {hasServices && (
                  <Button 
                    onClick={generateNFSe} 
                    className="w-full justify-start h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Briefcase className="w-5 h-5 mr-3" />
                    <div className="flex flex-col items-start">
                      <span>Gerar NFS-e (Serviços)</span>
                      <span className="text-xs font-normal opacity-80">Nota Fiscal de Serviço Eletrônica</span>
                    </div>
                  </Button>
                )}

                {!hasProducts && !hasServices && (
                  <div className="text-center p-4 text-sm text-muted-foreground bg-muted rounded-md border border-dashed">
                    Nenhum item válido para faturamento encontrado neste pedido.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
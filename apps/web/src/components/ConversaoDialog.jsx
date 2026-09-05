import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

const ConversaoDialog = ({
  isOpen,
  onClose,
  onConfirm,
  titulo = "Confirmar Conversão",
  mensagem = "Deseja realmente realizar esta conversão? Todos os itens, incluindo suas classificações (Categoria, Centro de Custos, Projetos) e tributos serão copiados automaticamente.",
  botaoConfirmar = "Confirmar",
  isLoading = false
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {titulo}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {mensagem}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {botaoConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConversaoDialog;
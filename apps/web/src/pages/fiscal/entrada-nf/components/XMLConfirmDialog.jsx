import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '../../utils/entradaNFUtils';

export default function XMLConfirmDialog({ isOpen, onClose, onConfirm, xmlData, isLoadingFornecedor }) {
  if (!xmlData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Dados do XML</DialogTitle>
          <DialogDescription>
            Os seguintes dados foram extraídos do arquivo XML. Deseja preencher o formulário com eles?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Número</Label>
              <Input value={xmlData.numero || ''} readOnly className="bg-muted h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Série</Label>
              <Input value={xmlData.serie || ''} readOnly className="bg-muted h-8" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Chave de Acesso</Label>
            <Input value={xmlData.chave_acesso || ''} readOnly className="bg-muted h-8 text-xs" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Data de Emissão</Label>
            <Input value={formatDate(xmlData.data_emissao)} readOnly className="bg-muted h-8" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fornecedor (CNPJ)</Label>
            <div className="flex items-center gap-2">
              <Input value={xmlData.cnpj_fornecedor || ''} readOnly className="bg-muted h-8 flex-1" />
              {isLoadingFornecedor && <span className="text-xs text-blue-500">Buscando...</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{xmlData.nome_fornecedor}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Valor Total</Label>
              <Input value={formatCurrency(xmlData.valor_total)} readOnly className="bg-muted h-8 font-medium text-foreground" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Impostos</Label>
              <Input value={formatCurrency(xmlData.valor_impostos)} readOnly className="bg-muted h-8 text-red-600" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">Preencher Formulário</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const AVAILABLE_COLUMNS = [
  { id: 'data', label: 'Data' },
  { id: 'tipo', label: 'Tipo (Entrada/Saída)' },
  { id: 'status', label: 'Status (Previsto/Realizado)' },
  { id: 'categoria', label: 'Categoria' },
  { id: 'centroCusto', label: 'Centro de Custo' },
  { id: 'descricao', label: 'Descrição' },
  { id: 'valor', label: 'Valor' },
];

const SelecionarColunasFluxo = ({ isOpen, onClose, selectedColumns, onSave }) => {
  const [localSelection, setLocalSelection] = React.useState(selectedColumns);

  React.useEffect(() => {
    setLocalSelection(selectedColumns);
  }, [selectedColumns, isOpen]);

  const toggleColumn = (id) => {
    setLocalSelection(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Selecionar Colunas do Relatório</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {AVAILABLE_COLUMNS.map((col) => (
            <div key={col.id} className="flex items-center space-x-2">
              <Checkbox
                id={`col-${col.id}`}
                checked={localSelection.includes(col.id)}
                onCheckedChange={() => toggleColumn(col.id)}
              />
              <Label htmlFor={`col-${col.id}`}>{col.label}</Label>
            </div>
          ))}
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => { onSave(localSelection); onClose(); }}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelecionarColunasFluxo;

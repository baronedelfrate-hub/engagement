import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';

const SelecionarColunasCompras = ({ isOpen, onClose, allColumns, selectedColumnIds, onSave }) => {
  const [columnsList, setColumnsList] = useState([]);
  const [localSelected, setLocalSelected] = useState(new Set());

  useEffect(() => {
    if (isOpen && allColumns) {
        const selected = selectedColumnIds.map(id => allColumns.find(c => c.id === id)).filter(Boolean);
        const unselected = allColumns.filter(c => !selectedColumnIds.includes(c.id));
        setColumnsList([...selected, ...unselected]);
        setLocalSelected(new Set(selectedColumnIds));
    }
  }, [isOpen, allColumns, selectedColumnIds]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(columnsList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setColumnsList(items);
  };

  const handleSave = () => {
    onSave(columnsList.filter(c => localSelected.has(c.id)).map(c => c.id));
    onClose();
  };
  
  const toggleSelection = (id) => {
      const newSet = new Set(localSelected);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setLocalSelected(newSet);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Personalizar Colunas</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4 pr-2 custom-scrollbar">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="columns">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {columnsList.map((col, index) => (
                    <Draggable key={col.id} draggableId={col.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="flex items-center gap-3 p-2 bg-slate-50 border rounded-md hover:bg-slate-100 transition-colors"
                        >
                          <div {...provided.dragHandleProps} className="cursor-move text-slate-400 hover:text-slate-600">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <Checkbox 
                            checked={localSelected.has(col.id)}
                            onCheckedChange={() => toggleSelection(col.id)}
                            id={`col-${col.id}`}
                          />
                          <Label htmlFor={`col-${col.id}`} className="flex-1 cursor-pointer text-sm">
                            {col.label}
                          </Label>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Aplicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelecionarColunasCompras;
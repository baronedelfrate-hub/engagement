import React from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import CardNotaFiscal from './CardNotaFiscal';

const COLUMNS = [
  { id: 'Pendente', title: 'Pendente', color: 'bg-muted' },
  { id: 'Em_Conferencia', title: 'Em Conferência', color: 'bg-blue-50 dark:bg-blue-950/30' },
  { id: 'Em_Entrada', title: 'Em Entrada', color: 'bg-orange-50 dark:bg-orange-950/30' },
  { id: 'Concluida', title: 'Concluída', color: 'bg-green-50 dark:bg-green-950/30' },
  { id: 'Rejeitada', title: 'Rejeitada', color: 'bg-red-50 dark:bg-red-950/30' },
];

const KanbanNotasFiscais = ({ notas, onDragEnd, onCardClick }) => {
  // Group notas by status
  const columnsData = COLUMNS.reduce((acc, col) => {
    acc[col.id] = notas.filter(n => n.status === col.id);
    return acc;
  }, {});

  return (
    <div className="overflow-x-auto overflow-y-hidden h-full pb-4 scrollbar-horizontal w-full">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-nowrap h-full gap-4 w-max px-2">
          {COLUMNS.map(column => (
            <div key={column.id} className={`flex-shrink-0 w-[320px] flex flex-col rounded-xl ${column.color} border border-transparent h-full max-h-full`}>
              <div className="p-4 font-bold text-foreground flex justify-between items-center sticky top-0 bg-inherit rounded-t-xl z-10">
                  {column.title}
                  <span className="bg-background/50 px-2 py-0.5 rounded-full text-xs text-muted-foreground">
                      {columnsData[column.id]?.length || 0}
                  </span>
              </div>
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 p-3 overflow-y-auto overflow-x-hidden min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-muted' : ''}`}
                  >
                    {columnsData[column.id]?.map((nota, index) => (
                      <CardNotaFiscal 
                          key={nota.id} 
                          nota={nota} 
                          index={index} 
                          onClick={onCardClick}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanNotasFiscais;
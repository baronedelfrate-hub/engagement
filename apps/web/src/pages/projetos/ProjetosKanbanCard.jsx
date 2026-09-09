import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Calendar, DollarSign, User } from 'lucide-react';
import { Draggable } from '@hello-pangea/dnd';

const ProjetosKanbanCard = ({ projeto, index }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <Draggable draggableId={projeto.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-3"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className={`shadow-sm border-l-4 ${snapshot.isDragging ? 'shadow-md ring-2 ring-primary/20' : ''} 
              ${projeto.status === 'Concluído' ? 'border-l-green-500' : 
                projeto.status === 'Cancelado' ? 'border-l-red-500' : 
                projeto.status === 'Pausado' ? 'border-l-yellow-500' : 
                'border-l-blue-500'}`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-semibold text-sm line-clamp-2 leading-tight">{projeto.nome}</h4>
                </div>
                
                {projeto.cliente?.nome && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <User className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{projeto.cliente.nome}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center" title="Prazo">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(projeto.data_fim)}
                  </div>
                  <div className="flex items-center font-medium text-foreground" title="Orçamento">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {formatCurrency(projeto.orcamento)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </Draggable>
  );
};

export default ProjetosKanbanCard;
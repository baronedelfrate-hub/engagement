import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useCRM } from '@/contexts/CRMContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layout, DollarSign, Calendar } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useToast } from '@/components/ui/use-toast';

const COLUMNS = [
  { id: 'LEAD', title: 'LEAD', color: 'border-l-slate-400 bg-slate-50' },
  { id: 'PROPOSTA', title: 'PROPOSTA', color: 'border-l-blue-400 bg-blue-50' },
  { id: 'NEGOCIACAO', title: 'NEGOCIAÇÃO', color: 'border-l-amber-400 bg-amber-50' },
  { id: 'GANHA', title: 'GANHA', color: 'border-l-emerald-400 bg-emerald-50' },
  { id: 'ENVIADO_FATURAMENTO', title: 'ENVIADO P/ FATURAMENTO', color: 'border-l-purple-400 bg-purple-50' }
];

const CRMKanban = () => {
  const { propostas, updatePropostaStatus } = useCRM();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  // Group proposals by status
  const columnsData = useMemo(() => {
    const data = {
      'LEAD': [], 'PROPOSTA': [], 'NEGOCIACAO': [], 'GANHA': [], 'ENVIADO_FATURAMENTO': []
    };
    if (propostas) {
      propostas.forEach(p => {
        // Handle mapping old statuses if necessary, or fallback
        let status = p.status || 'LEAD';
        if (status === 'ENVIADO_P_FATURAMENTO') status = 'ENVIADO_FATURAMENTO';
        
        const normalizedStatus = COLUMNS.find(c => c.id === status) ? status : 'LEAD';
        if (data[normalizedStatus]) {
          data[normalizedStatus].push(p);
        }
      });
    }
    return data;
  }, [propostas]);

  const onDragEnd = async (result) => {
    console.log('[CRMKanban] Drag event ended:', result);
    const { destination, source, draggableId } = result;

    // Drop outside a valid target
    if (!destination) return;
    
    // Drop in the exact same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    setIsUpdating(true);
    
    // Call Context function to update status
    const updateResult = await updatePropostaStatus(draggableId, newStatus);
    
    setIsUpdating(false);

    if (updateResult.success) {
      const col = COLUMNS.find(c => c.id === newStatus);
      toast({
        title: "Status atualizado com sucesso",
        description: `Proposta movida para: ${col?.title}`,
        className: "bg-emerald-600 text-white border-none",
      });
    } else {
      toast({
        title: "Erro ao atualizar status",
        description: updateResult.error,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <Helmet><title>Funil de Vendas | CRM</title></Helmet>
      <PageHeader 
        title="Funil de Vendas" 
        description="Arraste as propostas para atualizar a etapa." 
        icon={Layout}
      />
      
      {/* Outer scroll container for both horizontal and vertical scrolling. Avoids nested scroll issues with react-beautiful-dnd */}
      <div className="flex-1 w-full mt-4 pb-4 overflow-x-auto overflow-y-auto scrollbar-horizontal">
        <DragDropContext onDragEnd={onDragEnd}>
          {/* Flex container for columns */}
          <div className="flex flex-nowrap min-h-max p-2 items-start gap-4 w-max min-w-full">
            {COLUMNS.map((column) => {
              const items = columnsData[column.id] || [];
              const totalValue = items.reduce((sum, item) => sum + (Number(item.valor_total) || 0), 0);
              
              return (
                <div 
                  key={column.id} 
                  data-testid={`column-${column.id}`}
                  className="flex flex-col min-w-[320px] w-[320px] flex-shrink-0 bg-slate-100/50 rounded-xl border border-slate-200"
                >
                  {/* Column Header */}
                  <div className={`p-3 rounded-t-xl border-b border-slate-200 flex justify-between items-center bg-white border-l-4 sticky top-0 z-10 ${column.color}`}>
                    <div>
                      <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">{column.title}</h3>
                      <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalValue)}
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">{items.length}</Badge>
                  </div>

                  {/* Droppable Area - No nested overflow-y-auto to fix dnd conflicts */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`p-3 min-h-[150px] transition-colors duration-200 ${snapshot.isDraggingOver ? 'bg-slate-200/50 rounded-b-xl' : ''}`}
                      >
                        {items.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                data-testid={`card-${item.id}`}
                                className={`mb-3 ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}
                                style={{
                                  ...provided.draggableProps.style,
                                  willChange: 'transform'
                                }}
                              >
                                <Card className={`bg-white shadow-sm border-slate-200 hover:border-blue-300 transition-all ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500/50 rotate-2 z-50' : ''}`}>
                                  <CardContent className="p-3">
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[120px]">
                                        {item.numero || 'S/N'}
                                      </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-800 text-sm mb-2 line-clamp-2" title={item.cliente?.nome}>
                                      {item.cliente?.nome || 'Cliente Desconhecido'}
                                    </h4>
                                    <div className="flex flex-col gap-1 mt-3 pt-2 border-t border-slate-50">
                                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                        <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                                        {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(item.valor_total || 0)}
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(item.data_emissao).toLocaleDateString('pt-BR')}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};

export default CRMKanban;
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { supabase } from '@/lib/customSupabaseClient';
import { resolveCompanyId } from '@/lib/companyUtils';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import PageHeader from '@/components/PageHeader';
import ProjetosKanbanCard from './ProjetosKanbanCard';

const COLUMNS = [
  { id: 'Planejamento', title: 'Planejamento', color: 'bg-slate-100 dark:bg-slate-800/50' },
  { id: 'Em Andamento', title: 'Em Andamento', color: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'Pausado', title: 'Pausado', color: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { id: 'Concluído', title: 'Concluído', color: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { id: 'Cancelado', title: 'Cancelado', color: 'bg-red-50 dark:bg-red-900/20' }
];

export default function ProjetosKanbanList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [columnsData, setColumnsData] = useState({});
  const [companyId, setCompanyId] = useState(null);

  const fetchProjetos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cid = await resolveCompanyId(null);
      setCompanyId(cid);

      if (!cid) {
        throw new Error("Empresa não identificada. Não é possível carregar os projetos.");
      }

      const { data, error: fetchError } = await supabase
        .from('projetos')
        .select(`*, cliente:clientes(nome)`)
        .eq('company_id', cid)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setProjetos(data || []);
      
      const initialCols = COLUMNS.reduce((acc, col) => {
        acc[col.id] = (data || []).filter(p => (p.status || 'Planejamento') === col.id);
        return acc;
      }, {});
      
      const unknownStatus = (data || []).filter(p => !COLUMNS.find(c => c.id === p.status));
      if (unknownStatus.length > 0 && initialCols['Planejamento']) {
         initialCols['Planejamento'] = [...initialCols['Planejamento'], ...unknownStatus];
      }

      setColumnsData(initialCols);

    } catch (err) {
      console.error("Erro ao buscar projetos para kanban:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjetos();
  }, [fetchProjetos]);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    const sourceClone = Array.from(columnsData[sourceColId]);
    const destClone = sourceColId === destColId ? sourceClone : Array.from(columnsData[destColId]);
    
    const [movedItem] = sourceClone.splice(source.index, 1);
    movedItem.status = destColId; 
    
    destClone.splice(destination.index, 0, movedItem);

    setColumnsData(prev => ({
      ...prev,
      [sourceColId]: sourceClone,
      [destColId]: destClone
    }));

    if (sourceColId !== destColId) {
      try {
        const { error: updateError } = await supabase
          .from('projetos')
          .update({ status: destColId })
          .eq('id', draggableId);

        if (updateError) throw updateError;
        
        toast({
          title: "Status atualizado",
          description: `Projeto movido para ${destColId}.`,
        });
      } catch (err) {
        console.error("Erro ao atualizar status:", err);
        toast({
          variant: "destructive",
          title: "Erro ao atualizar",
          description: "Não foi possível salvar o novo status do projeto.",
        });
        fetchProjetos();
      }
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shrink-0">
        <PageHeader title="Kanban de Projetos" description="Gerencie os status dos projetos arrastando os cartões" />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchProjetos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => navigate('/projetos/novo')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6 shrink-0">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="outline" size="sm" onClick={fetchProjetos}>Tentar Novamente</Button>
          </AlertDescription>
        </Alert>
      )}

      {loading && Object.keys(columnsData).length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 h-full items-start min-w-max">
              {COLUMNS.map(column => (
                <div key={column.id} className={`w-80 flex flex-col h-full max-h-full rounded-xl border ${column.color}`}>
                  <div className="p-4 font-semibold flex items-center justify-between shrink-0 border-b border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {column.title}
                    </span>
                    <span className="bg-white/50 dark:bg-black/20 text-slate-600 dark:text-slate-400 py-0.5 px-2 rounded-full text-xs">
                      {columnsData[column.id]?.length || 0}
                    </span>
                  </div>
                  
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-3 flex-1 overflow-y-auto min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-black/5 dark:bg-white/5' : ''}`}
                      >
                        {columnsData[column.id]?.map((projeto, index) => (
                          <ProjetosKanbanCard 
                            key={projeto.id} 
                            projeto={projeto} 
                            index={index} 
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
      )}
    </div>
  );
}
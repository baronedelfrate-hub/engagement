import React, { useState, useEffect, useRef } from 'react';
import { useCobranca } from '@/hooks/useCobranca';
import { getPhaseSequence, PHASES, formatCurrency, calculatePhaseByDueDate } from '@/lib/cobrancaService';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, List as ListIcon, Loader2, RefreshCw, BadgeInfo } from 'lucide-react';
import CobrancaFilters from './components/CobrancaFilters';
import CobrancaCardModal from './components/CobrancaCardModal';
import CobrancaAddCardModal from './components/CobrancaAddCardModal';
import CobrancaListView from './components/CobrancaListView';
import { Helmet } from 'react-helmet';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const CobrancaKanban = () => {
  const { fetchAllCobranca, updateAllPhases, loading: apiLoading } = useCobranca();
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [items, setItems] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Modals
  const [selectedCard, setSelectedCard] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Filters state
  const [currentFilters, setCurrentFilters] = useState({ status: 'ativo' });

  // Auto-update interval ref
  const intervalRef = useRef(null);

  const loadData = async (filters = currentFilters) => {
    setLoadingData(true);
    const data = await fetchAllCobranca(filters);
    // Process items to have calculated phase info attached
    const processed = (data || []).map(item => ({
      ...item,
      ...calculatePhaseByDueDate(item.data_vencimento) 
    }));
    setItems(processed);
    setLoadingData(false);
  };

  const handleSyncPhases = async () => {
    setIsSyncing(true);
    await updateAllPhases();
    await loadData();
    setIsSyncing(false);
  };

  useEffect(() => {
    // Initial load and sync
    handleSyncPhases();

    // Set interval for auto-sync every 60 minutes
    intervalRef.current = setInterval(() => {
      handleSyncPhases();
    }, 60 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); 

  useEffect(() => {
    loadData(currentFilters);
  }, [currentFilters]);

  const handleFilterChange = (newFilters) => {
    setCurrentFilters(newFilters);
  };

  const handleCardClick = (card) => {
    setSelectedCard(card);
    setIsEditOpen(true);
  };

  const columns = getPhaseSequence().map(phaseId => ({
    id: phaseId,
    title: PHASES[phaseId].label,
    color: PHASES[phaseId].color,
    items: items.filter(i => i.fase === phaseId && i.status === (currentFilters.status === 'ALL' ? i.status : currentFilters.status))
                 .sort((a,b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
  }));

  const getDueDateBadge = (days) => {
    if (days > 0) return <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 text-[10px] h-5">No Prazo</Badge>;
    if (days === 0) return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 bg-yellow-500/10 text-[10px] h-5">Vence Hoje</Badge>;
    return <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10 text-[10px] h-5">{Math.abs(days)}d Atraso</Badge>;
  };

  return (
    <>
      <Helmet><title>Gestão de Cobrança | Financeiro</title></Helmet>
      
      <PageHeader 
        title="Gestão de Cobrança" 
        description="Controle de inadimplência com fases automáticas baseadas no vencimento."
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSyncPhases} disabled={isSyncing} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Atualizar Fases'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')} className="text-muted-foreground hover:text-foreground border-border">
              {viewMode === 'kanban' ? <><ListIcon className="w-4 h-4 mr-2" /> Lista</> : <><LayoutGrid className="w-4 h-4 mr-2" /> Kanban</>}
            </Button>
            <Button onClick={() => setIsAddOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Nova Cobrança
            </Button>
          </div>
        }
      />

      <CobrancaFilters onFilterChange={handleFilterChange} loading={loadingData} />

      {(loadingData && items.length === 0) ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : viewMode === 'list' ? (
        <CobrancaListView items={items.filter(item => item.status === (currentFilters.status === 'ALL' ? item.status : currentFilters.status))} onEdit={handleCardClick} />
      ) : (
        <div className="overflow-x-auto h-[calc(100vh-280px)] pb-4">
          <div className="flex gap-4 min-w-[1500px] h-full">
            {columns.map(col => (
              <div key={col.id} className="flex flex-col w-[300px] min-w-[300px] bg-background/50 rounded-lg border border-border/50 h-full">
                <div className={`p-3 border-b-2 ${PHASES[col.id].border} bg-background rounded-t-lg flex justify-between items-center`}>
                  <div className="flex flex-col">
                    <h3 className="font-semibold text-foreground text-sm truncate max-w-[200px]" title={col.title}>{col.title}</h3>
                    <span className="text-[10px] text-muted-foreground font-normal">{PHASES[col.id].description}</span>
                  </div>
                  <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">{col.items.length}</span>
                </div>
                
                <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
                  {col.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleCardClick(item)}
                      className={`mb-3 p-3 rounded-md border bg-background shadow-sm cursor-pointer hover:border-blue-500/50 group transition-all border-border
                        ${item.status === 'resolvido' ? 'opacity-60 grayscale' : ''}
                      `}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-foreground text-sm truncate pr-2" title={item.cliente?.nome}>{item.cliente?.nome}</h4>
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <BadgeInfo className="w-3 h-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Fase Automática</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {item.status !== 'ativo' && (
                            <span className={`text-[10px] px-1.5 rounded ${item.status === 'resolvido' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                              {item.status}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">Venc: {new Date(item.data_vencimento).toLocaleDateString()}</p>
                          {getDueDateBadge(item.dias_ate_vencimento)}
                        </div>
                        
                        <div className="flex justify-between items-end">
                          <p className="text-sm font-bold text-emerald-400">{formatCurrency(item.valor)}</p>
                          {item.ultima_acao && (
                              <div className="w-2 h-2 rounded-full bg-blue-500" title={`Última ação: ${new Date(item.ultima_acao).toLocaleString()}`}></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAddOpen && (
        <CobrancaAddCardModal 
          isOpen={isAddOpen} 
          onClose={() => setIsAddOpen(false)} 
          onSuccess={() => handleSyncPhases()}
        />
      )}

      {isEditOpen && selectedCard && (
        <CobrancaCardModal 
          isOpen={isEditOpen} 
          card={selectedCard}
          onClose={() => { setIsEditOpen(false); setSelectedCard(null); }} 
          onSuccess={() => handleSyncPhases()}
        />
      )}
    </>
  );
};

export default CobrancaKanban;
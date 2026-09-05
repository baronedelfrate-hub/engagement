import React, { useState, useEffect } from 'react';
import { useCobrancaIntegrated } from '@/hooks/useCobrancaIntegrated';
import { getPhaseSequence, PHASES, formatCurrency } from '@/lib/cobrancaService';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart2 } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { Badge } from '@/components/ui/badge';
import CobrancaFiltersIntegrated from './CobrancaFiltersIntegrated';
import CobrancaCardModalIntegrated from './CobrancaCardModalIntegrated';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';

const CobrancaKanbanIntegrated = () => {
  const navigate = useNavigate();
  const { fetchContasReceberForCobranca } = useCobrancaIntegrated();
  
  const [items, setItems] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [filters, setFilters] = useState({ status: 'ativo' });

  const loadData = async () => {
    setLoadingData(true);
    const data = await fetchContasReceberForCobranca(filters);
    setItems(data);
    setLoadingData(false);
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('kanban-integrated-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contas_receber' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters]);

  const columns = getPhaseSequence().map(phaseId => ({
    id: phaseId,
    title: PHASES[phaseId].label,
    color: PHASES[phaseId].border,
    bgColor: PHASES[phaseId].color,
    items: items.filter(i => {
      if (i.status_cobranca === 'recuperado') return phaseId === 'recuperado';
      return i.fase === phaseId && i.status_cobranca !== 'recuperado';
    })
  }));

  return (
    <>
      <Helmet><title>Kanban de Cobrança | Financeiro</title></Helmet>
      
      <PageHeader 
        title="Gestão de Cobrança Integrada" 
        description="Acompanhamento automático de títulos por fase de vencimento."
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={loadData} className="text-slate-400 hover:text-white">
              <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/financeiro/cobranca/dashboard')} className="text-slate-300 border-slate-700">
                <BarChart2 className="w-4 h-4 mr-2" /> Dashboard
            </Button>
          </div>
        }
      />

      <CobrancaFiltersIntegrated onFilterChange={setFilters} />

      <div className="overflow-x-auto overflow-y-hidden h-[calc(100vh-280px)] pb-4 scrollbar-horizontal w-full">
        <div className="flex flex-nowrap gap-4 w-max h-full px-2">
            {columns.map(col => {
                const totalValue = col.items.reduce((acc, curr) => acc + parseFloat(curr.valor_original || 0), 0);

                return (
                    <div key={col.id} className="flex flex-col w-[300px] flex-shrink-0 bg-muted/40 rounded-lg border border-border h-full">
                        <div className={`p-3 border-b-2 ${col.color} bg-card rounded-t-lg`}>
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="font-semibold text-foreground text-sm truncate">{col.title}</h3>
                                <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px]">{col.items.length}</Badge>
                            </div>
                            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                {formatCurrency(totalValue)}
                            </div>
                        </div>

                        <div className="flex-1 p-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
                            {col.items.map(item => (
                                <div 
                                    key={item.id}
                                    onClick={() => setSelectedCard(item)}
                                    className={`
                                        mb-2 p-3 rounded border bg-card shadow-sm cursor-pointer hover:border-blue-500/50 transition-all border-border group
                                        ${item.status_cobranca === 'recuperado' ? 'opacity-70 grayscale-[0.5]' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-medium text-foreground text-sm truncate pr-2 w-full" title={item.cliente?.nome}>
                                            {item.cliente?.nome}
                                        </h4>
                                        <Badge variant="outline" className="text-[10px] h-5 border-border text-muted-foreground">
                                          {item.banco?.nome ? item.banco.nome : 'Auto'}
                                        </Badge>
                                    </div>
                                    
                                    {/* Rich Metadata */}
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {item.categoria && <Badge variant="secondary" className="text-[9px] h-4 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">{item.categoria.nome}</Badge>}
                                        {item.centro_custo && <Badge variant="secondary" className="text-[9px] h-4 bg-muted text-muted-foreground">{item.centro_custo.nome}</Badge>}
                                        {item.tipo_pagamento && <Badge variant="secondary" className="text-[9px] h-4 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{item.tipo_pagamento.nome}</Badge>}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Venc: {new Date(item.data_vencimento).toLocaleDateString()}</span>
                                            <span className={`${item.dias_ate_vencimento < 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {item.dias_ate_vencimento < 0 ? `${Math.abs(item.dias_ate_vencimento)}d atraso` : `${item.dias_ate_vencimento}d prazo`}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                             <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(item.valor_original)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {selectedCard && (
        <CobrancaCardModalIntegrated 
            isOpen={!!selectedCard}
            card={selectedCard}
            onClose={() => setSelectedCard(null)}
            onSuccess={() => {
                loadData(); 
                setSelectedCard(null);
            }}
        />
      )}
    </>
  );
};

export default CobrancaKanbanIntegrated;
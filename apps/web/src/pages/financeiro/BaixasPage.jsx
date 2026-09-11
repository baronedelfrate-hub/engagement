import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/DataTable';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle2, ArrowRightCircle, Loader2, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateOnly } from '@/lib/dateUtils';

import BaixasFilters from './components/BaixasFilters';
import RegistrarBaixaModal from './components/RegistrarBaixaModal';
import EstornarBaixaModal from './components/EstornarBaixaModal';
import BaixasTypeIcon from './components/BaixasTypeIcon';
import { fetchBaixasData, estornarBaixa } from './utils/BaixasDataFetcher';

const initialFilters = {
    tipoConta: 'AMBOS', // AMBOS, PAGAR, RECEBER
    status: 'PENDENTE', // TODOS, PENDENTE, PAGO
    dataInicio: '',
    dataFim: '',
    categoriaId: 'TODOS',
    subcategoriaId: 'TODOS',
    centroCustoId: 'TODOS',
    entidadeId: 'TODOS',
    tipoPagamentoId: 'TODOS',
    condicaoPagamentoId: 'TODOS',
    bancoId: 'TODOS'
};

const BaixasPage = () => {
  const { toast } = useToast();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEstornarOpen, setIsEstornarOpen] = useState(false);
  const [selectedItemForBaixa, setSelectedItemForBaixa] = useState(null);
  const [selectedItemForEstorno, setSelectedItemForEstorno] = useState(null);
  const [estornoLoading, setEstornoLoading] = useState(false);
  
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('baixasFiltros');
    if (saved) {
        try { return JSON.parse(saved); } catch(e) {}
    }
    return initialFilters;
  });

  useEffect(() => {
    localStorage.setItem('baixasFiltros', JSON.stringify(filters));
  }, [filters]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
        const combinedData = await fetchBaixasData(filters);
        setData(combinedData);
    } catch (error) {
        toast({ title: "Erro", description: "Falha ao carregar lista de baixas.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBaixarClick = (item) => {
      setSelectedItemForBaixa(item);
      setIsRegisterOpen(true);
  };

  const handleEstornarClick = (item) => {
      setSelectedItemForEstorno(item);
      setIsEstornarOpen(true);
  };

  const handleEstornarBaixa = async () => {
    if (!selectedItemForEstorno) return;

    setEstornoLoading(true);
    
    try {
      console.log('🔄 [BaixasPage] Iniciando estorno da baixa...', selectedItemForEstorno);

      const result = await estornarBaixa(selectedItemForEstorno.id, selectedItemForEstorno.tipo_geral);

      if (result.success) {
        toast({
          title: 'Sucesso!',
          description: `Baixa estornada com sucesso! O título voltou para status "Aberto".`,
          className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        });

        // Remove the item from the table without full reload
        setData(prevData => prevData.filter(item => item.id !== selectedItemForEstorno.id));
        
        setIsEstornarOpen(false);
        setSelectedItemForEstorno(null);

        // Optionally reload data to ensure consistency
        setTimeout(() => loadData(), 500);
      } else {
        throw new Error(result.error || 'Erro desconhecido ao estornar baixa');
      }

    } catch (error) {
      console.error('❌ [BaixasPage] Erro ao estornar baixa:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Estornar',
        description: error.message || 'Não foi possível estornar a baixa. Tente novamente.'
      });
    } finally {
      setEstornoLoading(false);
    }
  };

  const columns = [
      { 
        header: 'Tipo', 
        id: 'tipoIcon',
        cell: ({ row }) => <BaixasTypeIcon type={row.tipo_geral} />
      },
      { 
          header: 'Título', 
          id: 'titulo',
          cell: ({ row }) => <span className="font-mono text-foreground font-medium">{row.numeroDisplay}</span>
      },
      { 
          header: 'Entidade', 
          accessorKey: 'entidadeNome', 
          cell: ({ row }) => <span className="text-muted-foreground font-medium">{row.entidadeNome}</span>
      },
      { 
          header: 'Categoria', 
          id: 'categoria', 
          cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.categoria?.nome || '-'}</span> 
      },
      { 
          header: 'Vencimento', 
          accessorKey: 'data_vencimento', 
          cell: ({ row }) => <span className="text-muted-foreground">{formatDateOnly(row.data_vencimento)}</span>
      },
      { 
          header: 'Valor', 
          id: 'valor',
          cell: ({ row }) => (
            <span className={`font-bold ${row.tipo_geral === 'PAGAR' ? 'text-red-400' : 'text-emerald-400'}`}>
                R$ {row.valor.toFixed(2)}
            </span>
          )
      },
      { 
          header: 'Status', 
          accessorKey: 'status',
          cell: ({ row }) => {
              const status = (row.status || 'Pendente').toLowerCase();
              const isSettled = status === 'pago' || status === 'recebido';
              return (
                <Badge variant="outline" className={`${
                    isSettled
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                    : 'bg-muted text-yellow-500 border-border'
                }`}>
                  {isSettled && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {row.status || 'Pendente'}
                </Badge>
              );
          }
      },
      {
          header: 'Ações',
          id: 'actions',
          cell: ({ row }) => {
              const status = (row.status || '').toLowerCase();
              const isSettled = status === 'pago' || status === 'recebido';
              
              return (
                <div className="flex items-center justify-end gap-2">
                  {isSettled ? (
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEstornarClick(row);
                      }}
                      className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-900/20 transition-all hover:scale-105"
                    >
                      <RotateCcw className="h-4 w-4 mr-1.5" /> Estornar
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBaixarClick(row);
                      }}
                      className={`h-8 text-xs text-white shadow-md transition-all hover:scale-105 ${row.tipo_geral === 'PAGAR' ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'}`}
                    >
                      <ArrowRightCircle className="h-4 w-4 mr-1.5" /> Baixar
                    </Button>
                  )}
                </div>
              );
          }
      }
  ];

  return (
    <div className="bg-background min-h-screen text-foreground font-sans pb-16">
      <Helmet><title>Central de Baixas - ERP</title></Helmet>
      
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
        <PageHeader 
            title="Central de Baixas" 
            description="Gerencie pagamentos e recebimentos de forma unificada."
        />

        <BaixasFilters 
            filters={filters} 
            setFilters={setFilters} 
            onClear={() => setFilters(initialFilters)} 
        />

        <Card className="bg-background border-border shadow-xl overflow-hidden">
            <CardContent className="p-0">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-24 text-muted-foreground space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                        <p>Carregando títulos...</p>
                    </div>
                ) : (
                    <div className="p-4">
                        <DataTable 
                            data={data}
                            columns={columns}
                            emptyMessage="Nenhum título encontrado com os filtros atuais."
                            rowClassName="hover:bg-muted/50 transition-colors"
                        />
                    </div>
                )}
            </CardContent>
        </Card>

        {isRegisterOpen && (
            <RegistrarBaixaModal 
                isOpen={isRegisterOpen} 
                onClose={() => { setIsRegisterOpen(false); setSelectedItemForBaixa(null); }}
                onSuccess={loadData}
                titulo={selectedItemForBaixa} 
            />
        )}

        {isEstornarOpen && (
            <EstornarBaixaModal 
                isOpen={isEstornarOpen}
                onClose={() => { setIsEstornarOpen(false); setSelectedItemForEstorno(null); }}
                onConfirm={handleEstornarBaixa}
                titulo={selectedItemForEstorno}
                loading={estornoLoading}
            />
        )}
      </div>
    </div>
  );
};

export default BaixasPage;